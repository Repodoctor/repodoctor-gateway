import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../config/env';
import { buildApp } from '../app';

describe('authentication and authorization', () => {
  const app = buildApp(loadConfig({ nodeEnv: 'test', authProvider: 'local' }));

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
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

  it('rejects invalid login', async () => {
    await signup('login@example.com');
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'login@example.com', password: 'wrong-password' },
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
