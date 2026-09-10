import { randomUUID } from 'node:crypto';
import { SignJWT, createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';
import {
  UnauthenticatedError,
  badRequest,
  conflict,
  notFound,
  type Session,
  type User,
} from '@repodoctor/contracts';
import type { AppConfig } from '../config/env';
import type { OrganizationService } from './organization.service';

export interface AuthService {
  signup(input: { email: string; password: string; displayName: string }): Promise<Session>;
  login(input: { email: string; password: string }): Promise<Session>;
  refresh(refreshToken: string): Promise<Session>;
  logout(refreshToken?: string): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  userFromAccessToken(token: string): Promise<User>;
  getUser(userId: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateProfile(userId: string, displayName: string, accessToken?: string): Promise<User>;
  warmJwks?(): Promise<void>;
}

function expiryIso(msFromNow: number): string {
  return new Date(Date.now() + msFromNow).toISOString();
}

function userFromPayload(payload: JWTPayload): User {
  const id = payload.sub;
  const email = typeof payload.email === 'string' ? payload.email : undefined;
  const displayName =
    typeof payload.displayName === 'string'
      ? payload.displayName
      : metadataString(payload, 'display_name') ?? metadataString(payload, 'full_name') ?? email;
  if (!id || !email || !displayName) {
    throw new UnauthenticatedError('Access token is missing required claims');
  }
  const issuedAt = typeof payload.iat === 'number' ? new Date(payload.iat * 1000).toISOString() : new Date().toISOString();
  return {
    id,
    email,
    displayName,
    createdAt: issuedAt,
    updatedAt: issuedAt,
  };
}

function metadataString(payload: JWTPayload, key: string): string | undefined {
  const metadata = payload.user_metadata;
  if (typeof metadata !== 'object' || metadata === null || !(key in metadata)) {
    return undefined;
  }
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}

/** Test/dev path: JWTs are self-contained. Users persist in the repository service. */
export class LocalAuthService implements AuthService {
  constructor(
    private readonly identity: OrganizationService,
    private readonly jwtSecret: string,
  ) {}

  private secret(): Uint8Array {
    return new TextEncoder().encode(this.jwtSecret);
  }

  private async issue(user: User): Promise<Session> {
    const accessToken = await new SignJWT({
      email: user.email,
      displayName: user.displayName,
      typ: 'access',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(this.secret());
    const refreshToken = await new SignJWT({
      email: user.email,
      displayName: user.displayName,
      typ: 'refresh',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(this.secret());
    return {
      accessToken,
      refreshToken,
      expiresAt: expiryIso(60 * 60 * 1000),
      user,
    };
  }

  async signup(input: { email: string; password: string; displayName: string }): Promise<Session> {
    const existing = await this.identity.getUserByEmail(input.email);
    if (existing) {
      throw conflict('An account with that email already exists');
    }
    const user = await this.identity.ensureUser({
      id: randomUUID(),
      email: input.email.toLowerCase(),
      displayName: input.displayName,
    });
    return this.issue(user);
  }

  async login(input: { email: string; password: string }): Promise<Session> {
    const user = await this.identity.getUserByEmail(input.email);
    if (!user || !input.password) {
      throw new UnauthenticatedError('Invalid email or password');
    }
    return this.issue(user);
  }

  async refresh(refreshToken: string): Promise<Session> {
    try {
      const { payload } = await jwtVerify(refreshToken, this.secret());
      if (payload.typ !== 'refresh') {
        throw new UnauthenticatedError('Invalid refresh token');
      }
      const claims = userFromPayload(payload);
      const user = (await this.identity.getUser(claims.id)) ?? claims;
      return this.issue(user);
    } catch (error) {
      if (error instanceof UnauthenticatedError) throw error;
      throw new UnauthenticatedError('Invalid refresh token');
    }
  }

  async logout(_refreshToken?: string): Promise<void> {
    return;
  }

  async forgotPassword(_email: string): Promise<void> {
    // Always succeed to avoid account enumeration.
  }

  async userFromAccessToken(token: string): Promise<User> {
    try {
      const { payload } = await jwtVerify(token, this.secret());
      if (payload.typ === 'refresh') {
        throw new UnauthenticatedError('Invalid access token');
      }
      return userFromPayload(payload);
    } catch (error) {
      if (error instanceof UnauthenticatedError) throw error;
      throw new UnauthenticatedError('Invalid access token');
    }
  }

  async getUser(userId: string): Promise<User | undefined> {
    return this.identity.getUser(userId);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.identity.getUserByEmail(email);
  }

  async updateProfile(userId: string, displayName: string, _accessToken?: string): Promise<User> {
    const existing = await this.identity.getUser(userId);
    if (!existing) throw notFound('User not found');
    return this.identity.ensureUser({
      id: userId,
      email: existing.email,
      displayName,
      syncDisplayName: true,
    });
  }
}

/** Production path: verify Supabase user JWTs with JWKS. Sign-in lives on the dashboard. */
export class SupabaseAuthService implements AuthService {
  private readonly jwks: JWTVerifyGetKey & { reload?: () => Promise<void> };
  private readonly issuer: string;

  constructor(
    private readonly identity: OrganizationService,
    config: AppConfig,
  ) {
    if (!config.supabaseUrl || !config.supabaseJwksUrl) {
      throw new Error('Supabase auth requires SUPABASE_URL and SUPABASE_JWKS_URL');
    }
    this.issuer = `${config.supabaseUrl.replace(/\/+$/, '')}/auth/v1`;
    this.jwks = createRemoteJWKSet(new URL(config.supabaseJwksUrl), {
      cacheMaxAge: 10 * 60 * 1000,
      cooldownDuration: 30_000,
    });
  }

  async warmJwks(): Promise<void> {
    if (typeof this.jwks.reload === 'function') {
      await this.jwks.reload();
    }
  }

  private clientAuthUnsupported(): never {
    throw badRequest('Sign-in is performed by the dashboard with Supabase Auth');
  }

  async signup(_input: { email: string; password: string; displayName: string }): Promise<Session> {
    this.clientAuthUnsupported();
  }

  async login(_input: { email: string; password: string }): Promise<Session> {
    this.clientAuthUnsupported();
  }

  async refresh(_refreshToken: string): Promise<Session> {
    this.clientAuthUnsupported();
  }

  async logout(_refreshToken?: string): Promise<void> {
    return;
  }

  async forgotPassword(_email: string): Promise<void> {
    this.clientAuthUnsupported();
  }

  async userFromAccessToken(token: string): Promise<User> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: 'authenticated',
      });
      const userId = typeof payload.sub === 'string' ? payload.sub : undefined;
      const email = typeof payload.email === 'string' ? payload.email : metadataString(payload, 'email');
      if (!userId || !email) {
        throw new UnauthenticatedError('Access token is missing required claims');
      }
      const displayName =
        metadataString(payload, 'display_name') ?? metadataString(payload, 'full_name') ?? email;
      const now = new Date().toISOString();
      return {
        id: userId,
        email,
        displayName,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      if (error instanceof UnauthenticatedError) throw error;
      throw new UnauthenticatedError('Invalid access token');
    }
  }

  async getUser(userId: string): Promise<User | undefined> {
    return this.identity.getUser(userId);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.identity.getUserByEmail(email);
  }

  async updateProfile(userId: string, displayName: string, _accessToken?: string): Promise<User> {
    const existing = await this.identity.getUser(userId);
    if (!existing) throw notFound('User not found');
    return this.identity.ensureUser({
      id: userId,
      email: existing.email,
      displayName,
      syncDisplayName: true,
    });
  }
}

export function createAuthService(config: AppConfig, identity: OrganizationService): AuthService {
  if (config.authProvider === 'supabase') {
    return new SupabaseAuthService(identity, config);
  }
  return new LocalAuthService(identity, config.jwtSecret);
}
