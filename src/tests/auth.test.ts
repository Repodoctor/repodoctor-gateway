import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../config/env';
import { buildApp } from '../app';

const workspaceRoot = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const repositoryAvailable = existsSync(path.join(workspaceRoot, 'repodoctor-repository', 'package.json'));

function listenUrl(app: FastifyInstance): string {
  const address = app.server.address();
  if (!address || typeof address === 'string') {
    throw new Error('server address unavailable');
  }
  return `http://127.0.0.1:${address.port}`;
}

describe.skipIf(!repositoryAvailable)('authentication and authorization', () => {
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
    expect(invited.json().status).toBe('added');

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

  it('creates a pending invite for an email without an account', async () => {
    const owner = await signup('inviter@example.com', 'Inviter');
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: { authorization: `Bearer ${owner.accessToken}` },
      payload: { name: 'Invite Co', slug: 'invite-co' },
    });
    const orgId = created.json().id;
    const invited = await app.inject({
      method: 'POST',
      url: `/api/v1/organizations/${orgId}/members`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
      payload: { email: 'future@example.com', role: 'MEMBER' },
    });
    expect(invited.statusCode).toBe(201);
    expect(invited.json().status).toBe('invited');
    expect(invited.json().invite.signupUrl).toContain('/signup?invite=');
    const preview = await app.inject({
      method: 'GET',
      url: `/api/v1/invites/${new URL(invited.json().invite.signupUrl).searchParams.get('invite')}`,
    });
    expect(preview.statusCode).toBe(200);
    expect(preview.json().email).toBe('future@example.com');
    const guest = await signup('future@example.com', 'Future');
    const orgs = await app.inject({
      method: 'GET',
      url: '/api/v1/organizations',
      headers: { authorization: `Bearer ${guest.accessToken}` },
    });
    expect(orgs.json().items).toHaveLength(1);
  });

  it('rejects organization delete from a member', async () => {
    const owner = await signup('org-owner@example.com', 'Owner');
    const member = await signup('org-member@example.com', 'Member');
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: { authorization: `Bearer ${owner.accessToken}` },
      payload: { name: 'Locked Co', slug: 'locked-co' },
    });
    const orgId = created.json().id as string;
    await app.inject({
      method: 'POST',
      url: `/api/v1/organizations/${orgId}/members`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
      payload: { email: 'org-member@example.com', role: 'MEMBER' },
    });
    const forbidden = await app.inject({
      method: 'DELETE',
      url: `/api/v1/organizations/${orgId}`,
      headers: { authorization: `Bearer ${member.accessToken}` },
    });
    expect(forbidden.statusCode).toBe(403);
    const stillThere = await app.inject({
      method: 'GET',
      url: `/api/v1/organizations/${orgId}`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
    });
    expect(stillThere.statusCode).toBe(200);
  });

  it('deletes owned organizations when the account is removed', async () => {
    const owner = await signup('gone@example.com', 'Gone');
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: { authorization: `Bearer ${owner.accessToken}` },
      payload: { name: 'Gone Co', slug: 'gone-co' },
    });
    expect(created.statusCode).toBe(201);
    const removed = await app.inject({
      method: 'DELETE',
      url: '/api/v1/users/me',
      headers: { authorization: `Bearer ${owner.accessToken}` },
    });
    expect(removed.statusCode).toBe(200);
    expect(removed.json().deletedOrganizationIds).toEqual([created.json().id]);
    const missing = await app.inject({
      method: 'GET',
      url: '/api/v1/organizations',
      headers: { authorization: `Bearer ${owner.accessToken}` },
    });
    expect(missing.json().items).toHaveLength(0);
  });

  it('does not delete an organization when a member deletes their account', async () => {
    const owner = await signup('keep-owner@example.com', 'Owner');
    const member = await signup('keep-member@example.com', 'Member');
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: { authorization: `Bearer ${owner.accessToken}` },
      payload: { name: 'Keep Co', slug: 'keep-co' },
    });
    const orgId = created.json().id as string;
    await app.inject({
      method: 'POST',
      url: `/api/v1/organizations/${orgId}/members`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
      payload: { email: 'keep-member@example.com', role: 'MEMBER' },
    });
    const removed = await app.inject({
      method: 'DELETE',
      url: '/api/v1/users/me',
      headers: { authorization: `Bearer ${member.accessToken}` },
    });
    expect(removed.statusCode).toBe(200);
    expect(removed.json().deletedOrganizationIds).toEqual([]);
    const stillThere = await app.inject({
      method: 'GET',
      url: `/api/v1/organizations/${orgId}`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
    });
    expect(stillThere.statusCode).toBe(200);
  });

  it('enforces repository permission overrides for analysis', async () => {
    const owner = await signup('repo-admin@example.com', 'Admin');
    const viewer = await signup('repo-viewer@example.com', 'Viewer');
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: { authorization: `Bearer ${owner.accessToken}` },
      payload: { name: 'Perms Co', slug: 'perms-co' },
    });
    const orgId = created.json().id as string;
    await app.inject({
      method: 'POST',
      url: `/api/v1/organizations/${orgId}/members`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
      payload: { email: 'repo-viewer@example.com', role: 'VIEWER' },
    });
    const { createDomainEvent, Topics, mintServiceJwt } = await import('@repodoctor/contracts');
    const serviceJwt = await mintServiceJwt({
      secret: serviceToken,
      issuer: 'repodoctor-scm',
      ttlSeconds: 60,
    });
    const connected = await repository.inject({
      method: 'POST',
      url: '/internal/events',
      headers: { authorization: `Bearer ${serviceJwt}`, 'x-service-token': serviceJwt },
      payload: {
        topic: Topics.REPOSITORY_CONNECTED,
        message: createDomainEvent({
          eventId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          topic: Topics.REPOSITORY_CONNECTED,
          correlationId: 'corr-perms',
          organizationId: orgId,
          payload: {
            installationId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
            scmProvider: 'github',
            scmRepositoryId: '2002',
            owner: 'acme',
            name: 'web',
            fullName: 'acme/web',
            defaultBranch: 'main',
            private: true,
            url: 'https://github.com/acme/web',
            requestAnalysis: false,
          },
        }),
      },
    });
    expect(connected.statusCode).toBe(202);
    const listed = await app.inject({
      method: 'GET',
      url: `/api/v1/repositories?organizationId=${orgId}`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
    });
    expect(listed.statusCode).toBe(200);
    const repositoryId = listed.json().items[0].id as string;
    expect(listed.json().items[0].permission).toBe('ADMIN');

    const viewerRepo = await app.inject({
      method: 'GET',
      url: `/api/v1/repositories/${repositoryId}`,
      headers: { authorization: `Bearer ${viewer.accessToken}` },
    });
    expect(viewerRepo.statusCode).toBe(200);
    expect(viewerRepo.json().permission).toBe('VIEW');

    const forbidden = await app.inject({
      method: 'POST',
      url: `/api/v1/repositories/${repositoryId}/analysis?organizationId=${orgId}`,
      headers: { authorization: `Bearer ${viewer.accessToken}` },
      payload: { type: 'FULL', trigger: 'MANUAL', commitSha: 'abc1234', branch: 'main' },
    });
    expect(forbidden.statusCode).toBe(403);

    const granted = await app.inject({
      method: 'PUT',
      url: `/api/v1/repositories/${repositoryId}/access/${viewer.user.id}`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
      payload: { permission: 'ANALYZE' },
    });
    expect(granted.statusCode).toBe(200);
    expect(granted.json().permission).toBe('ANALYZE');

    const allowed = await app.inject({
      method: 'POST',
      url: `/api/v1/repositories/${repositoryId}/analysis?organizationId=${orgId}`,
      headers: { authorization: `Bearer ${viewer.accessToken}` },
      payload: { type: 'FULL', trigger: 'MANUAL', commitSha: 'abc1234', branch: 'main' },
    });
    expect(allowed.statusCode).toBe(202);
  });
});

describe('repository upstream failures', () => {
  it('returns 502 instead of 500 when the repository is unreachable', async () => {
    const app = buildApp(
      loadConfig({
        nodeEnv: 'test',
        authProvider: 'local',
        internalServiceToken: 'auth-test-service-token',
        repositoryServiceUrl: 'http://127.0.0.1:9',
      }),
    );
    await app.ready();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email: 'ada@example.com', password: 'correct-horse', displayName: 'Ada' },
    });
    expect(response.statusCode).toBe(502);
    expect(response.json().code).toBe('BAD_GATEWAY');
    await app.close();
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
