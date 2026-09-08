import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { z } from 'zod';

const healthRoute: FastifyPluginAsyncZod = async (fastify) => {
  const body = z.object({
    status: z.literal('ok'),
    service: z.string(),
  });

  fastify.get(
    '/health',
    {
      schema: {
        tags: ['ops'],
        operationId: 'getHealth',
        response: { 200: body },
      },
    },
    async () => ({ status: 'ok' as const, service: fastify.config.serviceName }),
  );

  fastify.get(
    '/ready',
    {
      schema: {
        tags: ['ops'],
        operationId: 'getReady',
        response: { 200: body },
      },
    },
    async () => ({ status: 'ok' as const, service: fastify.config.serviceName }),
  );
};

export default healthRoute;
