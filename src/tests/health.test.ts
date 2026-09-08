import { afterAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../config/env';
import { buildApp } from '../app';

describe('health', () => {
  const app = buildApp(loadConfig({ nodeEnv: 'test' }));

  afterAll(async () => {
    await app.close();
  });

  it('returns ok', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok' });
    expect(response.headers['x-request-id']).toBeTruthy();
  });

  it('returns ready', async () => {
    const response = await app.inject({ method: 'GET', url: '/ready' });
    expect(response.statusCode).toBe(200);
  });
});
