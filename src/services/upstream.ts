import { BrokenCircuitError, RetryableHttpError, resilientFetch } from '@repodoctor/contracts';
import { AppError, INTERNAL_SERVICE_AUDIENCE, mintServiceJwt } from '@repodoctor/contracts';
import type { AppConfig } from '../config/env';

function normalizeBaseUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '');
  if (!trimmed) return trimmed;
  if (!/^https?:\/\//i.test(trimmed)) return `http://${trimmed}`;
  return trimmed;
}

function parseUpstreamJson(text: string, path: string): unknown {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError({
      statusCode: 502,
      error: 'Bad Gateway',
      code: 'BAD_GATEWAY',
      message: `Upstream ${path} returned a non-JSON response`,
    });
  }
}

function policyName(baseUrl: string): string {
  try {
    return `gateway→${new URL(baseUrl).host}`;
  } catch {
    return 'gateway→upstream';
  }
}

export async function callService<T>(input: {
  baseUrl: string;
  path: string;
  method?: string;
  config: AppConfig;
  correlationId?: string;
  body?: unknown;
  rawBody?: Buffer;
  headers?: Record<string, string>;
}): Promise<{ status: number; json: T }> {
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  if (!baseUrl) {
    throw new AppError({
      statusCode: 502,
      error: 'Bad Gateway',
      code: 'BAD_GATEWAY',
      message: 'Upstream service is not configured',
    });
  }
  const token = await mintServiceJwt({
    secret: input.config.internalServiceToken,
    issuer: input.config.serviceName,
    audience: INTERNAL_SERVICE_AUDIENCE,
    ttlSeconds: input.config.serviceJwtTtlSeconds,
  });
  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
    'x-service-token': token,
    ...(input.headers ?? {}),
  };
  if (input.correlationId) {
    headers['x-correlation-id'] = input.correlationId;
  }
  let body: string | Buffer | undefined;
  if (input.rawBody) {
    headers['content-type'] = headers['content-type'] ?? 'application/json';
    body = input.rawBody;
  } else if (input.body !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(input.body);
  }

  let response: Response;
  try {
    response = await resilientFetch(
      policyName(baseUrl),
      `${baseUrl}${input.path}`,
      {
        method: input.method ?? 'GET',
        headers,
        body,
        signal: AbortSignal.timeout(input.config.upstreamTimeoutMs),
      },
    );
  } catch (error) {
    if (error instanceof BrokenCircuitError) {
      throw new AppError({
        statusCode: 503,
        error: 'Service Unavailable',
        code: 'BAD_GATEWAY',
        message: `Upstream ${input.path} is temporarily unavailable`,
      });
    }
    if (error instanceof RetryableHttpError) {
      throw new AppError({
        statusCode: 502,
        error: 'Bad Gateway',
        code: 'BAD_GATEWAY',
        message: `Upstream ${input.path} failed (${error.status})`,
      });
    }
    throw new AppError({
      statusCode: 502,
      error: 'Bad Gateway',
      code: 'BAD_GATEWAY',
      message: `Upstream ${input.path} is unreachable`,
    });
  }

  const text = await response.text();
  const json = parseUpstreamJson(text, input.path) as T;
  if (response.status >= 400) {
    throw new AppError({
      statusCode: response.status >= 500 ? 502 : response.status,
      error: response.status >= 500 ? 'Bad Gateway' : 'Error',
      code:
        response.status === 401
          ? 'UNAUTHENTICATED'
          : response.status === 403
            ? 'FORBIDDEN'
            : response.status === 404
              ? 'NOT_FOUND'
              : response.status === 409
                ? 'CONFLICT'
                : 'BAD_GATEWAY',
      message:
        typeof (json as { message?: string }).message === 'string'
          ? (json as { message: string }).message
          : `Upstream ${input.path} failed`,
    });
  }
  return { status: response.status, json };
}
