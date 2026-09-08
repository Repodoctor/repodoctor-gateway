import { SignJWT, jwtVerify } from 'jose';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
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
  updateProfile(userId: string, displayName: string): Promise<User>;
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

  async updateProfile(userId: string, displayName: string): Promise<User> {
    const user = this.directory.users.get(userId);
    if (!user) throw notFound('User not found');
    user.displayName = displayName;
    user.updatedAt = new Date().toISOString();
    return toUser(user);
  }
}

export class SupabaseAuthService implements AuthService {
  private readonly client: SupabaseClient;
  private readonly admin: SupabaseClient;

  constructor(
    private readonly directory: MemoryDirectory,
    config: AppConfig,
  ) {
    if (!config.supabaseUrl || !config.supabaseAnonKey || !config.supabaseServiceRoleKey) {
      throw new Error('Supabase auth requires SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY');
    }
    this.client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    this.admin = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
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

  private toSession(
    user: User,
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
  ): Session {
    return {
      accessToken,
      refreshToken,
      expiresAt: expiryIso(expiresIn * 1000),
      user,
    };
  }

  async signup(input: { email: string; password: string; displayName: string }): Promise<Session> {
    const { data, error } = await this.client.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { display_name: input.displayName } },
    });
    if (error) throw badRequest(error.message);
    if (!data.user || !data.session) {
      throw badRequest('Signup requires email confirmation in this Supabase project');
    }
    const now = new Date().toISOString();
    const user: User = {
      id: data.user.id,
      email: input.email.toLowerCase(),
      displayName: input.displayName,
      createdAt: data.user.created_at ?? now,
      updatedAt: now,
    };
    await this.upsertLocal(user);
    return this.toSession(user, data.session.access_token, data.session.refresh_token, data.session.expires_in);
  }

  async login(input: { email: string; password: string }): Promise<Session> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (error || !data.user || !data.session) {
      throw new UnauthenticatedError('Invalid email or password');
    }
    const now = new Date().toISOString();
    const user: User = {
      id: data.user.id,
      email: data.user.email ?? input.email,
      displayName: (data.user.user_metadata?.display_name as string | undefined) ?? input.email,
      createdAt: data.user.created_at ?? now,
      updatedAt: now,
    };
    await this.upsertLocal(user);
    return this.toSession(user, data.session.access_token, data.session.refresh_token, data.session.expires_in);
  }

  async refresh(refreshToken: string): Promise<Session> {
    const { data, error } = await this.client.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.user || !data.session) {
      throw new UnauthenticatedError('Invalid refresh token');
    }
    const user = await this.userFromAccessToken(data.session.access_token);
    return this.toSession(user, data.session.access_token, data.session.refresh_token, data.session.expires_in);
  }

  async logout(refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.client.auth.signOut();
    }
  }

  async forgotPassword(email: string): Promise<void> {
    await this.client.auth.resetPasswordForEmail(email);
  }

  async userFromAccessToken(token: string): Promise<User> {
    const { data, error } = await this.admin.auth.getUser(token);
    if (error || !data.user) throw new UnauthenticatedError('Invalid access token');
    const now = new Date().toISOString();
    const user: User = {
      id: data.user.id,
      email: data.user.email ?? '',
      displayName: (data.user.user_metadata?.display_name as string | undefined) ?? data.user.email ?? 'user',
      createdAt: data.user.created_at ?? now,
      updatedAt: now,
    };
    await this.upsertLocal(user);
    return user;
  }

  async getUser(userId: string): Promise<User | undefined> {
    return this.directory.users.get(userId)
      ? {
          id: this.directory.users.get(userId)!.id,
          email: this.directory.users.get(userId)!.email,
          displayName: this.directory.users.get(userId)!.displayName,
          createdAt: this.directory.users.get(userId)!.createdAt,
          updatedAt: this.directory.users.get(userId)!.updatedAt,
        }
      : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = this.directory.getUserByEmail(email);
    return user
      ? {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }
      : undefined;
  }

  async updateProfile(userId: string, displayName: string): Promise<User> {
    const { data, error } = await this.admin.auth.admin.updateUserById(userId, {
      user_metadata: { display_name: displayName },
    });
    if (error || !data.user) throw notFound('User not found');
    const now = new Date().toISOString();
    const user: User = {
      id: data.user.id,
      email: data.user.email ?? '',
      displayName,
      createdAt: data.user.created_at ?? now,
      updatedAt: now,
    };
    await this.upsertLocal(user);
    return user;
  }
}

export function createAuthService(config: AppConfig, directory: MemoryDirectory): AuthService {
  if (config.authProvider === 'supabase') {
    return new SupabaseAuthService(directory, config);
  }
  return new LocalAuthService(directory, config.jwtSecret);
}
