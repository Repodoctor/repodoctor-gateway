/**
 * Application configuration, loaded and validated from environment
 * variables. This is the single source of truth for all runtime config -
 * no other module should read from process.env directly.
 */
import { config as loadDotenv } from 'dotenv';

loadDotenv();

export interface AppConfig {
  serviceName: string;
  nodeEnv: 'development' | 'production' | 'test';
  host: string;
  port: number;
  frontendOrigin: string;
  serviceAuthToken: string;
  otelEndpoint: string;
  rateLimit: {
    max: number;
    timeWindowMs: number;
  };
  authProvider: 'local' | 'supabase';
  jwtSecret: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  scmBaseUrl: string;
  repositoryBaseUrl: string;
  findingsBaseUrl: string;
}

function optionalEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : fallback;
}

export function loadConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const nodeEnv = optionalEnv('NODE_ENV', 'development') as AppConfig['nodeEnv'];
  return {
    serviceName: 'repodoctor-gateway',
    nodeEnv,
    host: optionalEnv('HOST', '0.0.0.0'),
    port: Number(optionalEnv('PORT', '43121')),
    frontendOrigin: optionalEnv('FRONTEND_ORIGIN', 'http://127.0.0.1:43120'),
    serviceAuthToken: optionalEnv('SERVICE_AUTH_TOKEN', 'local-service-token'),
    otelEndpoint: optionalEnv('OTEL_EXPORTER_OTLP_ENDPOINT', ''),
    rateLimit: {
      max: Number(optionalEnv('RATE_LIMIT_MAX', '100')),
      timeWindowMs: Number(optionalEnv('RATE_LIMIT_WINDOW_MS', '60000')),
    },
    authProvider: optionalEnv('AUTH_PROVIDER', 'local') as AppConfig['authProvider'],
    jwtSecret: optionalEnv('AUTH_JWT_SECRET', 'local-dev-only-change-me'),
    supabaseUrl: optionalEnv('SUPABASE_URL', ''),
    supabaseAnonKey: optionalEnv('SUPABASE_ANON_KEY', ''),
    supabaseServiceRoleKey: optionalEnv('SUPABASE_SERVICE_ROLE_KEY', ''),
    scmBaseUrl: optionalEnv('SCM_BASE_URL', 'http://127.0.0.1:43122'),
    repositoryBaseUrl: optionalEnv('REPOSITORY_BASE_URL', 'http://127.0.0.1:43123'),
    findingsBaseUrl: optionalEnv('FINDINGS_BASE_URL', 'http://127.0.0.1:43124'),

    ...overrides,
  };
}
