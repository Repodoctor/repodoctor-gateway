import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import { loadConfig } from '../config/env';
import { buildApp } from '../app';
import { createHmac } from 'node:crypto';

function sign(raw: Buffer, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`;
}

describe('gateway github webhook proxy', () => {
  let server: Server;
  let received: { headers: IncomingMessage['headers']; body: string } | undefined;
  const secret = 'unused-at-gateway';

  beforeAll(async () => {
    server = createServer((request, response) => {
      const chunks: Buffer[] = [];
      request.on('data', (chunk) => chunks.push(chunk as Buffer));
      request.on('end', () => {
        received = { headers: request.headers, body: Buffer.concat(chunks).toString('utf8') };
        response.writeHead(202, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ duplicate: false, processed: true }));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  });

  it('forwards the raw signed payload to SCM', async () => {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('no port');
    const app = buildApp(
      loadConfig({
        nodeEnv: 'test',
        authProvider: 'local',
        scmServiceUrl: `http://127.0.0.1:${address.port}`,
        repositoryServiceUrl: 'http://127.0.0.1:9',
        findingsServiceUrl: 'http://127.0.0.1:9',
      }),
    );
    await app.ready();
    const payload = Buffer.from(JSON.stringify({ zen: 'ok' }));
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/github',
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'ping',
        'x-github-delivery': 'del-ping',
        'x-hub-signature-256': sign(payload, secret),
      },
      payload,
    });
    expect(response.statusCode).toBe(202);
    expect(received?.headers['x-service-token']?.split('.')).toHaveLength(3);
    expect(String(received?.headers.authorization ?? '')).toMatch(/^Bearer /);
    expect(received?.headers['x-github-event']).toBe('ping');
    expect(received?.body).toBe(payload.toString('utf8'));
    await app.close();
  });
});
