import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { z } from 'zod';
import { findingSchema, paginatedResponseSchema, paginationQuerySchema, type Finding } from '@repodoctor/contracts';
import { callService } from '../services/upstream';

const findingsGatewayRoute: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get(
    '/api/v1/findings',
    {
      schema: {
        tags: ['findings'],
        querystring: paginationQuerySchema.extend({
          organizationId: z.string().uuid().optional(),
          repositoryId: z.string().uuid().optional(),
        }),
        response: { 200: paginatedResponseSchema(findingSchema) },
      },
    },
    async (request) => {
      await fastify.authenticate(request);
      if (!request.query.organizationId) {
        return { items: [], page: request.query.page, pageSize: request.query.pageSize, total: 0 };
      }
      const principal = request.auth!;
      await fastify.organizationService.get(principal.userId, request.query.organizationId, 'VIEWER');
      const params = new URLSearchParams({
        organizationId: request.query.organizationId,
        page: String(request.query.page),
        pageSize: String(request.query.pageSize),
      });
      if (request.query.repositoryId) params.set('repositoryId', request.query.repositoryId);
      const result = await callService<{ items: Finding[]; page: number; pageSize: number; total: number }>({
        baseUrl: fastify.config.findingsBaseUrl,
        path: `/api/v1/findings?${params.toString()}`,
        token: fastify.config.serviceAuthToken,
        correlationId: request.correlationId,
      });
      return result.json;
    },
  );
};

export default findingsGatewayRoute;
