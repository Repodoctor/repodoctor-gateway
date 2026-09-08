import { AppError, INTERNAL_SERVICE_AUDIENCE, mintServiceJwt } from '@repodoctor/contracts';
import type { AppConfig } from '../config/env';

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
  if (!input.baseUrl) {
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
  const response = await fetch(`${input.baseUrl}${input.path}`, {
    method: input.method ?? 'GET',
    headers,
    body,
  });
  const text = await response.text();
  const json = (text ? JSON.parse(text) : {}) as T;
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
      message: typeof (json as { message?: string }).message === 'string' ? (json as { message: string }).message : `Upstream ${input.path} failed`,
    });
  }
  return { status: response.status, json };
}
