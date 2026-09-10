import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { loadConfig } from '../config/env';
import { buildApp } from '../app';

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk) => chunks.push(chunk as Buffer));
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

describe('github app install proxy', () => {
  const serviceToken = 'scm-install-test-token';
  const now = new Date().toISOString();
  const users = new Map<string, { id: string; email: string; displayName: string; createdAt: string; updatedAt: string }>();
  const orgs = new Map<string, { id: string; name: string; slug: string; createdAt: string; updatedAt: string }>();
  let upstream: Server;
  let app: ReturnType<typeof buildApp>;

  beforeAll(async () => {
    upstream = createServer((request, response) => {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      void (async () => {
        if (request.method === 'GET' && url.pathname === '/internal/providers/github/app') {
          const organizationId = url.searchParams.get('organizationId') ?? '';
          const external = url.searchParams.get('externalInstallationId');
          sendJson(response, 200, {
            slug: 'repodoctor-app',
            configured: true,
            url: external
              ? `https://github.com/apps/repodoctor-app/installations/${encodeURIComponent(external)}`
              : `https://github.com/apps/repodoctor-app/installations/new?state=${organizationId}`,
          });
          return;
        }
        if (request.method === 'GET' && url.pathname === '/internal/github/app') {
          sendJson(response, 404, { message: 'Route GET:/internal/github/app not found' });
          return;
        }
        if (request.method === 'GET' && url.pathname === '/internal/v1/users') {
          const email = url.searchParams.get('email')?.toLowerCase();
          const user = [...users.values()].find((item) => item.email === email);
          sendJson(response, 200, { user });
          return;
        }
        if (request.method === 'POST' && url.pathname === '/internal/v1/users/ensure') {
          const body = JSON.parse(await readBody(request)) as {
            id: string;
            email: string;
            displayName: string;
          };
          const user = {
            id: body.id,
            email: body.email.toLowerCase(),
            displayName: body.displayName,
            createdAt: now,
            updatedAt: now,
          };
          users.set(user.id, user);
          sendJson(response, 200, user);
          return;
        }
        if (request.method === 'POST' && url.pathname === '/internal/v1/organizations') {
          const body = JSON.parse(await readBody(request)) as { name: string; slug?: string };
          const org = {
            id: randomUUID(),
            name: body.name,
            slug: body.slug ?? 'acme-scm-install',
            createdAt: now,
            updatedAt: now,
            role: 'OWNER' as const,
          };
          orgs.set(org.id, org);
          sendJson(response, 201, org);
          return;
        }
        const orgMatch = url.pathname.match(/^\/internal\/v1\/organizations\/([^/]+)$/);
        if (request.method === 'GET' && orgMatch) {
          const org = orgs.get(orgMatch[1]!);
          if (!org) {
            sendJson(response, 404, { message: 'Organization not found' });
            return;
          }
          sendJson(response, 200, org);
          return;
        }
        if (request.method === 'DELETE' && url.pathname.startsWith('/internal/organizations/')) {
          response.writeHead(204);
          response.end();
          return;
        }
        sendJson(response, 404, { message: `missing ${request.method} ${url.pathname}` });
      })().catch(() => {
        sendJson(response, 500, { message: 'mock failed' });
      });
    });
    await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve));
    const address = upstream.address();
    if (!address || typeof address === 'string') throw new Error('no upstream port');
    const upstreamUrl = `http://127.0.0.1:${address.port}`;

    app = buildApp(
      loadConfig({
        nodeEnv: 'test',
        authProvider: 'local',
        internalServiceToken: serviceToken,
        repositoryServiceUrl: upstreamUrl,
        scmServiceUrl: upstreamUrl,
        githubAppSlug: 'repodoctor-app',
      }),
    );
    await app.ready();
  });

  afterAll(async () => {
    await app?.close();
    await new Promise<void>((resolve, reject) =>
      upstream.close((error) => (error ? reject(error) : resolve())),
    );
  });

  it('returns the GitHub App install URL from SCM', async () => {
    const signup = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email: 'scm-owner@example.com', password: 'correct-horse', displayName: 'Owner' },
    });
    expect(signup.statusCode).toBe(201);
    const token = signup.json().accessToken as string;
    const org = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Acme', slug: 'acme-scm-install' },
    });
    expect(org.statusCode).toBe(201);
    const organizationId = org.json().id as string;
    const missing = await app.inject({
      method: 'GET',
      url: `/api/v1/organizations/${organizationId}/scm`,
    });
    expect(missing.statusCode).toBe(401);
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/organizations/${organizationId}/scm/github/install`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().slug).toBe('repodoctor-app');
    expect(response.json().url).toBe(
      `https://github.com/apps/repodoctor-app/installations/new?state=${organizationId}`,
    );
  });

  it('disconnects GitHub without deleting the organization', async () => {
    const signup = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email: 'scm-disconnect@example.com', password: 'correct-horse', displayName: 'Owner' },
    });
    const token = signup.json().accessToken as string;
    const org = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Disconnect Co', slug: 'disconnect-co' },
    });
    const organizationId = org.json().id as string;
    const disconnected = await app.inject({
      method: 'DELETE',
      url: `/api/v1/organizations/${organizationId}/scm/github`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(disconnected.statusCode).toBe(204);
    const stillThere = await app.inject({
      method: 'GET',
      url: `/api/v1/organizations/${organizationId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(stillThere.statusCode).toBe(200);
    expect(stillThere.json().id).toBe(organizationId);
  });
});
