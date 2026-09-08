import type { AppConfig } from '../config/env';
import type { AuthPrincipal } from '@repodoctor/contracts';

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;
  }

  interface FastifyRequest {
    requestId: string;
    correlationId: string;
    auth?: AuthPrincipal;
    rawBody?: Buffer;
  }
}

export {};
