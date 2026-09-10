/**
 * Application configuration, loaded and validated from environment
 * variables. This is the single source of truth for all runtime config -
 * no other module should read from process.env directly.
 */
import { config as loadDotenv } from 'dotenv';

loadDotenv();

const DEFAULT_CORS =
  'http://127.0.0.1:43120,http://localhost:43120,https://repodoctor.dev,https://repo.slurrpsservers.com';
const LOCAL_INTERNAL_TOKEN = 'local-dev-internal-service-token';

export interface AppConfig {
  serviceName: string;
  nodeEnv: 'development' | 'production' | 'test';
  host: string;
  port: number;
  logLevel: string;
  otelEndpoint: string;
  corsOrigins: string[];
  internalServiceToken: string;
  serviceJwtTtlSeconds: number;
  rateLimit: {
    max: number;
    timeWindowMs: number;
  };
  authProvider: 'local' | 'supabase';
  jwtSecret: string;
  supabaseUrl: string;
  supabaseJwksUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  scmServiceUrl: string;
  repositoryServiceUrl: string;
  findingsServiceUrl: string;
  graphServiceUrl: string;
  doctorServiceUrl: string;
  ciDoctorServiceUrl: string;
  securityServiceUrl: string;
  dependencyServiceUrl: string;
  codeReviewServiceUrl: string;
  documentationServiceUrl: string;
  aiServiceUrl: string;
  remediationServiceUrl: string;
  analyticsServiceUrl: string;
  dashboardPublicUrl: string;
  upstreamTimeoutMs: number;
}

function optionalEnv(name: string, fallback = ''): string {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : fallback;
}

function firstEnv(names: string[], fallback: string): string {
  for (const name of names) {
    const value = optionalEnv(name);
    if (value) return value;
  }
  return fallback;
}

function csvEnv(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim().replace(/^https:(?!\/\/)/, 'https://'))
    .filter((item) => item.length > 0);
}

export function loadConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const nodeEnv = optionalEnv('NODE_ENV', 'development') as AppConfig['nodeEnv'];
  const internalServiceToken = firstEnv(
    ['INTERNAL_SERVICE_TOKEN', 'SERVICE_AUTH_TOKEN'],
    nodeEnv === 'production' ? '' : LOCAL_INTERNAL_TOKEN,
  );
  const config: AppConfig = {
    serviceName: optionalEnv('SERVICE_NAME', 'repodoctor-gateway'),
    nodeEnv,
    host: optionalEnv('HOST', '0.0.0.0'),
    port: Number(optionalEnv('PORT', '43111')),
    logLevel: optionalEnv('LOG_LEVEL', nodeEnv === 'production' ? 'warn' : 'debug'),
    otelEndpoint: optionalEnv('OTEL_EXPORTER_OTLP_ENDPOINT', ''),
    corsOrigins: csvEnv(firstEnv(['CORS_ORIGIN', 'FRONTEND_ORIGIN'], DEFAULT_CORS)),
    internalServiceToken,
    serviceJwtTtlSeconds: Number(optionalEnv('SERVICE_JWT_TTL_SECONDS', '60')),
    rateLimit: {
      max: Number(optionalEnv('RATE_LIMIT_MAX', '200')),
      timeWindowMs: Number(optionalEnv('RATE_LIMIT_WINDOW_MS', '60000')),
    },
    authProvider: optionalEnv('AUTH_PROVIDER', 'local') as AppConfig['authProvider'],
    jwtSecret: optionalEnv('AUTH_JWT_SECRET', 'local-dev-only-change-me'),
    supabaseUrl: optionalEnv('SUPABASE_URL', ''),
    supabaseJwksUrl: optionalEnv('SUPABASE_JWKS_URL', ''),
    supabaseAnonKey: firstEnv(['SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY'], ''),
    supabaseServiceRoleKey: optionalEnv('SUPABASE_SERVICE_ROLE_KEY'),
    scmServiceUrl: firstEnv(['SCM_SERVICE_URL', 'SCM_BASE_URL'], 'http://127.0.0.1:43112'),
    repositoryServiceUrl: firstEnv(['REPOSITORY_SERVICE_URL', 'REPOSITORY_BASE_URL'], 'http://127.0.0.1:43113'),
    findingsServiceUrl: firstEnv(['FINDINGS_SERVICE_URL', 'FINDINGS_BASE_URL'], 'http://127.0.0.1:43114'),
    graphServiceUrl: optionalEnv('GRAPH_SERVICE_URL', 'http://127.0.0.1:43115'),
    doctorServiceUrl: optionalEnv('DOCTOR_SERVICE_URL', 'http://127.0.0.1:43116'),
    ciDoctorServiceUrl: optionalEnv('CI_DOCTOR_SERVICE_URL', 'http://127.0.0.1:43117'),
    securityServiceUrl: optionalEnv('SECURITY_SERVICE_URL', 'http://127.0.0.1:43118'),
    dependencyServiceUrl: optionalEnv('DEPENDENCY_SERVICE_URL', 'http://127.0.0.1:43119'),
    codeReviewServiceUrl: optionalEnv('CODE_REVIEW_SERVICE_URL', 'http://127.0.0.1:43121'),
    documentationServiceUrl: optionalEnv('DOCUMENTATION_SERVICE_URL', 'http://127.0.0.1:43122'),
    aiServiceUrl: optionalEnv('AI_SERVICE_URL', 'http://127.0.0.1:43123'),
    remediationServiceUrl: optionalEnv('REMEDIATION_SERVICE_URL', 'http://127.0.0.1:43124'),
    analyticsServiceUrl: optionalEnv('ANALYTICS_SERVICE_URL', 'http://127.0.0.1:43125'),
    dashboardPublicUrl: optionalEnv('DASHBOARD_PUBLIC_URL', 'https://repodoctor.dev'),
    upstreamTimeoutMs: Number(optionalEnv('UPSTREAM_TIMEOUT_MS', '20000')),
    ...overrides,
  };
  if (config.nodeEnv === 'production' && !config.internalServiceToken) {
    throw new Error('INTERNAL_SERVICE_TOKEN is required in production');
  }
  if (config.authProvider === 'supabase' && (!config.supabaseUrl || !config.supabaseJwksUrl)) {
    throw new Error('Supabase auth requires SUPABASE_URL and SUPABASE_JWKS_URL');
  }
  return config;
}
