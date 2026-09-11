import { afterAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../config/env';
import { buildApp } from '../app';

describe('health', () => {
  const app = buildApp(loadConfig({ nodeEnv: 'test', authProvider: 'local' }));

  afterAll(async () => {
    await app.close();
  });

  it('returns ok', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok' });
    expect(response.headers['x-request-id']).toBeTruthy();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(String(response.headers['content-security-policy'] ?? '')).toContain("default-src 'none'");
    expect(String(response.headers['content-security-policy'] ?? '')).toContain("frame-ancestors 'none'");
  });

  it('returns ready', async () => {
    const response = await app.inject({ method: 'GET', url: '/ready' });
    expect(response.statusCode).toBe(200);
  });
});
