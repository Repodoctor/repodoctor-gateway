import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../config/env';
import { buildApp } from '../app';

function listenUrl(app: FastifyInstance): string {
  const address = app.server.address();
  if (!address || typeof address === 'string') {
    throw new Error('server address unavailable');
  }
  return `http://127.0.0.1:${address.port}`;
}

describe('authentication and authorization', () => {
  const serviceToken = 'auth-test-service-token';
  let repository: FastifyInstance;
  let app: FastifyInstance;

  beforeAll(async () => {
    const workspaceRoot = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
    const { loadConfig: loadRepositoryConfig } = await import(
      pathToFileURL(path.join(workspaceRoot, 'repodoctor-repository/src/config/env.ts')).href
    );
    const { buildApp: buildRepository } = await import(
      pathToFileURL(path.join(workspaceRoot, 'repodoctor-repository/src/app.ts')).href
    );
    repository = buildRepository(
      loadRepositoryConfig({ nodeEnv: 'test', internalServiceToken: serviceToken }),
    );
    await repository.listen({ host: '127.0.0.1', port: 0 });
    app = buildApp(
      loadConfig({
        nodeEnv: 'test',
        authProvider: 'local',
        internalServiceToken: serviceToken,
        repositoryServiceUrl: listenUrl(repository),
      }),
    );
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await repository.close();
  });

  async function signup(email: string, displayName = 'Ada') {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email, password: 'correct-horse', displayName },
    });
    expect(response.statusCode).toBe(201);
    return response.json();
  }

  it('rejects unauthenticated profile access', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/users/me' });
    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe('UNAUTHENTICATED');
  });

  it('signs up and returns the current user', async () => {
    const session = await signup('ada@example.com');
    const me = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().email).toBe('ada@example.com');
  });

  it('rejects duplicate signup', async () => {
    await signup('dup@example.com');
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email: 'dup@example.com', password: 'correct-horse', displayName: 'Dup' },
    });
    expect(response.statusCode).toBe(409);
  });

  it('rejects login for an unknown email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'missing@example.com', password: 'correct-horse' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('creates an organization and isolates tenants', async () => {
    const owner = await signup('owner@example.com', 'Owner');
    const outsider = await signup('outsider@example.com', 'Outsider');

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: { authorization: `Bearer ${owner.accessToken}` },
      payload: { name: 'Acme Engineering', slug: 'acme-eng' },
    });
    expect(created.statusCode).toBe(201);
    const org = created.json();

    const visible = await app.inject({
      method: 'GET',
      url: '/api/v1/organizations',
      headers: { authorization: `Bearer ${owner.accessToken}` },
    });
    expect(visible.json().items).toHaveLength(1);

    const hidden = await app.inject({
      method: 'GET',
      url: `/api/v1/organizations/${org.id}`,
      headers: { authorization: `Bearer ${outsider.accessToken}` },
    });
    expect(hidden.statusCode).toBe(403);

    const outsiderList = await app.inject({
      method: 'GET',
      url: '/api/v1/organizations',
      headers: { authorization: `Bearer ${outsider.accessToken}` },
    });
    expect(outsiderList.json().items).toHaveLength(0);

    const removed = await app.inject({
      method: 'DELETE',
      url: `/api/v1/organizations/${org.id}`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
    });
    expect(removed.statusCode).toBe(204);
  });

  it('enforces admin-only member management', async () => {
    const owner = await signup('boss@example.com', 'Boss');
    const member = await signup('member@example.com', 'Member');
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: { authorization: `Bearer ${owner.accessToken}` },
      payload: { name: 'Byteforge', slug: 'byteforge' },
    });
    const orgId = created.json().id;

    const invited = await app.inject({
      method: 'POST',
      url: `/api/v1/organizations/${orgId}/members`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
      payload: { email: 'member@example.com', role: 'MEMBER' },
    });
    expect(invited.statusCode).toBe(201);

    const forbidden = await app.inject({
      method: 'POST',
      url: `/api/v1/organizations/${orgId}/members`,
      headers: { authorization: `Bearer ${member.accessToken}` },
      payload: { email: 'boss@example.com', role: 'ADMIN' },
    });
    expect(forbidden.statusCode).toBe(403);

    const catalog = await app.inject({
      method: 'GET',
      url: '/api/v1/findings',
      headers: { authorization: `Bearer ${member.accessToken}` },
    });
    expect(catalog.statusCode).toBe(200);
    expect(catalog.json().items).toEqual([]);
  });
});

describe('supabase auth configuration', () => {
  it('constructs with url and jwks and no anon key', async () => {
    const { OrganizationService } = await import('../services/organization.service');
    const { SupabaseAuthService } = await import('../services/auth.service');
    const config = loadConfig({
      nodeEnv: 'test',
      authProvider: 'supabase',
      supabaseUrl: 'https://example.supabase.co',
      supabaseJwksUrl: 'https://example.supabase.co/auth/v1/.well-known/jwks.json',
      supabaseAnonKey: '',
    });
    const service = new SupabaseAuthService(new OrganizationService(config), config);
    expect(service).toBeTruthy();
  });

  it('requires url and jwks for supabase', () => {
    expect(() =>
      loadConfig({
        nodeEnv: 'test',
        authProvider: 'supabase',
        supabaseUrl: '',
        supabaseJwksUrl: '',
      }),
    ).toThrow(/SUPABASE_URL and SUPABASE_JWKS_URL/);
  });
});
