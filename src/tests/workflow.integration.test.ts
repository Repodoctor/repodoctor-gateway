import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { loadConfig as loadGatewayConfig } from '../config/env';
import { buildApp as buildGateway } from '../app';
import { createHmac } from 'node:crypto';

const workspaceRoot = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const scmAvailable = existsSync(path.join(workspaceRoot, 'repodoctor-scm', 'package.json'));
const repositoryAvailable = existsSync(path.join(workspaceRoot, 'repodoctor-repository', 'package.json'));

function listenUrl(app: FastifyInstance): string {
  const address = app.server.address();
  if (!address || typeof address === 'string') {
    throw new Error('server address unavailable');
  }
  return `http://127.0.0.1:${address.port}`;
}

function signGithubPayload(rawBody: Buffer, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
}

describe.skipIf(!scmAvailable || !repositoryAvailable)('github webhook to analysis workflow', () => {
  const serviceToken = 'workflow-service-token';
  const webhookSecret = 'workflow-webhook-secret';
  let gateway: FastifyInstance;
  let scm: FastifyInstance;
  let repository: FastifyInstance;

  beforeAll(async () => {
    const { loadConfig: loadRepositoryConfig } = await import(
      pathToFileURL(path.join(workspaceRoot, 'repodoctor-repository/src/config/env.ts')).href
    );
    const { buildApp: buildRepository } = await import(
      pathToFileURL(path.join(workspaceRoot, 'repodoctor-repository/src/app.ts')).href
    );
    const { loadConfig: loadScmConfig } = await import(
      pathToFileURL(path.join(workspaceRoot, 'repodoctor-scm/src/config/env.ts')).href
    );
    const { buildApp: buildScm } = await import(
      pathToFileURL(path.join(workspaceRoot, 'repodoctor-scm/src/app.ts')).href
    );
    const { defaultFakeProvider } = await import(
      pathToFileURL(path.join(workspaceRoot, 'repodoctor-scm/src/tests/helpers/fake-provider.ts')).href
    );

    repository = buildRepository(loadRepositoryConfig({ nodeEnv: 'test', internalServiceToken: serviceToken }));
    await repository.listen({ host: '127.0.0.1', port: 0 });
    const repositoryUrl = listenUrl(repository);

    scm = buildScm(
      loadScmConfig({
        nodeEnv: 'test',
        internalServiceToken: serviceToken,
        githubWebhookSecret: webhookSecret,
        eventHttpTargets: [`${repositoryUrl}/internal/events`],
      }),
      { createProvider: async () => defaultFakeProvider() },
    );
    await scm.listen({ host: '127.0.0.1', port: 0 });
    const scmUrl = listenUrl(scm);

    gateway = buildGateway(
      loadGatewayConfig({
        nodeEnv: 'test',
        authProvider: 'local',
        internalServiceToken: serviceToken,
        scmServiceUrl: scmUrl,
        repositoryServiceUrl: repositoryUrl,
        findingsServiceUrl: '',
      }),
    );
    await gateway.ready();
  });

  afterAll(async () => {
    await gateway?.close();
    await scm?.close();
    await repository?.close();
  });

  it('connects GitHub, ingests the repository, and requests analysis from a push webhook', async () => {
    const signup = await gateway.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email: 'owner@example.com', password: 'correct-horse', displayName: 'Owner' },
    });
    expect(signup.statusCode).toBe(201);
    const token = signup.json().accessToken as string;
    const auth = { authorization: `Bearer ${token}` };

    const org = await gateway.inject({
      method: 'POST',
      url: '/api/v1/workspaces',
      headers: auth,
      payload: { name: 'Acme', slug: 'acme-workflow' },
    });
    expect(org.statusCode).toBe(201);
    const workspaceId = org.json().id as string;

    const install = await gateway.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${workspaceId}/scm/github/install`,
      headers: auth,
    });
    expect(install.statusCode).toBe(200);
    expect(install.json().slug).toBe('repodoctor-app');
    expect(String(install.json().url)).toContain(`/apps/repodoctor-app/installations/select_target`);

    const connected = await gateway.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${workspaceId}/scm/github`,
      headers: auth,
      payload: { externalInstallationId: '4242', accountLogin: 'acme' },
    });
    expect(connected.statusCode).toBe(201);

    const repos = await gateway.inject({
      method: 'GET',
      url: `/api/v1/repositories?workspaceId=${workspaceId}`,
      headers: auth,
    });
    expect(repos.statusCode).toBe(200);
    expect(repos.json().items).toHaveLength(1);
    const repositoryId = repos.json().items[0].id as string;

    const byId = await gateway.inject({
      method: 'GET',
      url: `/api/v1/repositories/${repositoryId}`,
      headers: auth,
    });
    expect(byId.statusCode).toBe(200);
    expect(byId.json().fullName).toBe('acme/api');

    const analysesAfterConnect = await gateway.inject({
      method: 'GET',
      url: `/api/v1/analysis?workspaceId=${workspaceId}&repositoryId=${repositoryId}`,
      headers: auth,
    });
    expect(analysesAfterConnect.json().items.length).toBeGreaterThanOrEqual(1);

    const payload = {
      installation: { id: 4242 },
      repository: {
        id: 1001,
        name: 'api',
        full_name: 'acme/api',
        private: true,
        default_branch: 'main',
        html_url: 'https://github.com/acme/api',
      },
      ref: 'refs/heads/main',
      after: 'def5678deadbeefdef5678deadbeefdef5678d',
    };
    const raw = Buffer.from(JSON.stringify(payload));
    const webhook = await gateway.inject({
      method: 'POST',
      url: '/api/v1/webhooks/github',
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'push',
        'x-github-delivery': 'delivery-push-workflow',
        'x-hub-signature-256': signGithubPayload(raw, webhookSecret),
      },
      payload: raw,
    });
    expect(webhook.statusCode).toBe(202);
    expect(webhook.json().duplicate).toBe(false);

    const analysesAfterPush = await gateway.inject({
      method: 'GET',
      url: `/api/v1/analysis?workspaceId=${workspaceId}&repositoryId=${repositoryId}`,
      headers: auth,
    });
    expect(analysesAfterPush.json().items.length).toBeGreaterThan(analysesAfterConnect.json().items.length);
    expect(analysesAfterPush.json().items[0].status).toBe('QUEUED');
    expect(analysesAfterPush.json().items[0].trigger).toBe('WEBHOOK');
  });
});
