import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { AppError, apiError } from '@repodoctor/contracts';
import { AuthorizationError, UnauthenticatedError } from '@repodoctor/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';

function applyCors(request: FastifyRequest, reply: FastifyReply, origins: string[]): void {
  const origin = request.headers.origin;
  if (origin && origins.includes(origin)) {
    reply.header('Access-Control-Allow-Origin', origin);
    reply.header('Vary', 'Origin');
  }
}

export default fp(async (fastify) => {
  fastify.setErrorHandler((error, request, reply) => {
    applyCors(request, reply, fastify.config.corsOrigins);
    const requestId = request.requestId;

    if (error instanceof UnauthenticatedError) {
      reply.status(401).send(
        apiError({
          statusCode: 401,
          error: 'Unauthorized',
          code: 'UNAUTHENTICATED',
          message: error.message,
          requestId,
        }),
      );
      return;
    }

    if (error instanceof AuthorizationError) {
      reply.status(403).send(
        apiError({
          statusCode: 403,
          error: 'Forbidden',
          code: 'FORBIDDEN',
          message: error.message,
          requestId,
        }),
      );
      return;
    }

    if (error instanceof AppError) {
      reply.status(error.statusCode).send(error.toEnvelope(requestId));
      return;
    }

    if (error instanceof ZodError) {
      reply.status(400).send(
        apiError({
          statusCode: 400,
          error: 'Bad Request',
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          requestId,
          details: error.issues,
        }),
      );
      return;
    }

    const rawCode = (error as { code?: string }).code;
    const serialization = typeof rawCode === 'string' && rawCode.includes('SERIALIZATION');
    const statusCode = serialization ? 502 : ((error as { statusCode?: number }).statusCode ?? 500);

    if (statusCode === 429) {
      reply.status(429).send(
        apiError({
          statusCode: 429,
          error: 'Too Many Requests',
          code: 'RATE_LIMITED',
          message: 'Rate limit exceeded',
          requestId,
        }),
      );
      return;
    }

    request.log.error({ err: error }, 'unhandled error');
    const message = error instanceof Error ? error.message : 'Something went wrong';
    reply.status(statusCode).send(
      apiError({
        statusCode,
        error: statusCode >= 500 ? 'Internal Server Error' : 'Error',
        code: serialization ? 'BAD_GATEWAY' : statusCode >= 500 ? 'INTERNAL' : 'BAD_REQUEST',
        message:
          fastify.config.nodeEnv === 'production' && statusCode >= 500 && !serialization
            ? 'Something went wrong'
            : message,
        requestId,
      }),
    );
  });
});
