import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { FastifyInstance } from 'fastify';
import { loadConfig } from '../config/env';
import { buildApp } from '../app';

function listenUrl(app: FastifyInstance): string {
  const address = app.server.address();
  if (!address || typeof address === 'string') {
    throw new Error('server address unavailable');
  }
  return `http://127.0.0.1:${address.port}`;
}

describe('github app install proxy', () => {
  const serviceToken = 'scm-install-test-token';
  let repository: FastifyInstance;
  let scm: Server;
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

    scm = createServer((request, response) => {
      if (request.url === '/internal/github/app') {
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ slug: 'repodoctor-app', configured: true }));
        return;
      }
      response.writeHead(404);
      response.end();
    });
    await new Promise<void>((resolve) => scm.listen(0, '127.0.0.1', resolve));
    const scmAddress = scm.address();
    if (!scmAddress || typeof scmAddress === 'string') throw new Error('no scm port');

    app = buildApp(
      loadConfig({
        nodeEnv: 'test',
        authProvider: 'local',
        internalServiceToken: serviceToken,
        repositoryServiceUrl: listenUrl(repository),
        scmServiceUrl: `http://127.0.0.1:${scmAddress.port}`,
      }),
    );
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await repository.close();
    await new Promise<void>((resolve, reject) => scm.close((error) => (error ? reject(error) : resolve())));
  });

  it('returns the GitHub App install URL for an organization member', async () => {
    const signup = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email: 'scm-owner@example.com', password: 'correct-horse', displayName: 'Owner' },
    });
    const token = signup.json().accessToken as string;
    const org = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Acme', slug: 'acme-scm-install' },
    });
    const organizationId = org.json().id as string;
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
});
