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
import { MemoryDirectory, newId, type StoredUser } from './memory-store';
import { hashPassword, verifyPassword } from './password';

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
}

function toUser(row: StoredUser): User {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function expiryIso(msFromNow: number): string {
  return new Date(Date.now() + msFromNow).toISOString();
}

export class LocalAuthService implements AuthService {
  constructor(
    private readonly directory: MemoryDirectory,
    private readonly jwtSecret: string,
  ) {}

  private secret(): Uint8Array {
    return new TextEncoder().encode(this.jwtSecret);
  }

  private async issue(user: User): Promise<Session> {
    const accessToken = await new SignJWT({ email: user.email, displayName: user.displayName })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(this.secret());
    const refreshToken = newId();
    this.directory.refreshTokens.set(refreshToken, {
      userId: user.id,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
    return {
      accessToken,
      refreshToken,
      expiresAt: expiryIso(60 * 60 * 1000),
      user,
    };
  }

  async signup(input: { email: string; password: string; displayName: string }): Promise<Session> {
    if (this.directory.getUserByEmail(input.email)) {
      throw conflict('An account with that email already exists');
    }
    const now = new Date().toISOString();
    const user: StoredUser = {
      id: newId(),
      email: input.email.toLowerCase(),
      displayName: input.displayName,
      passwordHash: await hashPassword(input.password),
      createdAt: now,
      updatedAt: now,
    };
    this.directory.putUser(user);
    return this.issue(toUser(user));
  }

  async login(input: { email: string; password: string }): Promise<Session> {
    const user = this.directory.getUserByEmail(input.email);
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new UnauthenticatedError('Invalid email or password');
    }
    return this.issue(toUser(user));
  }

  async refresh(refreshToken: string): Promise<Session> {
    const record = this.directory.refreshTokens.get(refreshToken);
    if (!record || record.expiresAt < Date.now()) {
      throw new UnauthenticatedError('Invalid refresh token');
    }
    this.directory.refreshTokens.delete(refreshToken);
    const user = this.directory.users.get(record.userId);
    if (!user) throw new UnauthenticatedError('Invalid refresh token');
    return this.issue(toUser(user));
  }

  async logout(refreshToken?: string): Promise<void> {
    if (refreshToken) this.directory.refreshTokens.delete(refreshToken);
  }

  async forgotPassword(_email: string): Promise<void> {
    // Always succeed to avoid account enumeration.
  }

  async userFromAccessToken(token: string): Promise<User> {
    try {
      const { payload } = await jwtVerify(token, this.secret());
      const userId = payload.sub;
      if (!userId) throw new UnauthenticatedError('Invalid access token');
      const user = this.directory.users.get(userId);
      if (!user) throw new UnauthenticatedError('Invalid access token');
      return toUser(user);
    } catch (error) {
      if (error instanceof UnauthenticatedError) throw error;
      throw new UnauthenticatedError('Invalid access token');
    }
  }

  async getUser(userId: string): Promise<User | undefined> {
    const user = this.directory.users.get(userId);
    return user ? toUser(user) : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = this.directory.getUserByEmail(email);
    return user ? toUser(user) : undefined;
  }

  async updateProfile(userId: string, displayName: string, _accessToken?: string): Promise<User> {
    const user = this.directory.users.get(userId);
    if (!user) throw notFound('User not found');
    user.displayName = displayName;
    user.updatedAt = new Date().toISOString();
    return toUser(user);
  }
}

function metadataString(payload: JWTPayload, key: string): string | undefined {
  const metadata = payload.user_metadata;
  if (typeof metadata !== 'object' || metadata === null || !(key in metadata)) {
    return undefined;
  }
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}

/** Production path: verify Supabase user JWTs with JWKS. Sign-in lives on the dashboard. */
export class SupabaseAuthService implements AuthService {
  private readonly jwks: JWTVerifyGetKey;

  constructor(
    private readonly directory: MemoryDirectory,
    config: AppConfig,
  ) {
    if (!config.supabaseUrl || !config.supabaseJwksUrl) {
      throw new Error('Supabase auth requires SUPABASE_URL and SUPABASE_JWKS_URL');
    }
    this.jwks = createRemoteJWKSet(new URL(config.supabaseJwksUrl));
  }

  private clientAuthUnsupported(): never {
    throw badRequest('Sign-in is performed by the dashboard with Supabase Auth');
  }

  private async upsertLocal(user: User): Promise<void> {
    const existing = this.directory.users.get(user.id);
    this.directory.putUser({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      passwordHash: existing?.passwordHash ?? '',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
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
      const { payload } = await jwtVerify(token, this.jwks);
      const userId = typeof payload.sub === 'string' ? payload.sub : undefined;
      const email = typeof payload.email === 'string' ? payload.email : metadataString(payload, 'email');
      if (!userId || !email) {
        throw new UnauthenticatedError('Access token is missing required claims');
      }
      const displayName =
        metadataString(payload, 'display_name') ?? metadataString(payload, 'full_name') ?? email;
      const now = new Date().toISOString();
      const user: User = {
        id: userId,
        email,
        displayName,
        createdAt: now,
        updatedAt: now,
      };
      await this.upsertLocal(user);
      return user;
    } catch (error) {
      if (error instanceof UnauthenticatedError) throw error;
      throw new UnauthenticatedError('Invalid access token');
    }
  }

  async getUser(userId: string): Promise<User | undefined> {
    const row = this.directory.users.get(userId);
    return row ? toUser(row) : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = this.directory.getUserByEmail(email);
    return user ? toUser(user) : undefined;
  }

  async updateProfile(userId: string, displayName: string, _accessToken?: string): Promise<User> {
    const existing = this.directory.users.get(userId);
    if (!existing) throw notFound('User not found');
    existing.displayName = displayName;
    existing.updatedAt = new Date().toISOString();
    return toUser(existing);
  }
}

export function createAuthService(config: AppConfig, directory: MemoryDirectory): AuthService {
  if (config.authProvider === 'supabase') {
    return new SupabaseAuthService(directory, config);
  }
  return new LocalAuthService(directory, config.jwtSecret);
}
