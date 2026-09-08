import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

const emptyList = z.object({ items: z.array(z.unknown()), phase: z.string() });

const catalogRoute: FastifyPluginAsyncZod = async (fastify) => {
  const empty = async (request: FastifyRequest) => {
    await fastify.authenticate(request);
    return { items: [], phase: '1-4-foundation' };
  };

  const paths = [
    '/api/v1/repositories',
    '/api/v1/analysis',
    '/api/v1/findings',
    '/api/v1/reviews',
    '/api/v1/security',
    '/api/v1/dependencies',
    '/api/v1/graph',
    '/api/v1/ci',
    '/api/v1/docs',
    '/api/v1/ai',
    '/api/v1/remediation',
    '/api/v1/notifications',
  ];

  for (const url of paths) {
    fastify.get(url, { schema: { tags: ['catalog'], response: { 200: emptyList } } }, empty);
  }
};

export default catalogRoute;
