import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { z } from 'zod';
import { findingSchema, paginatedResponseSchema, paginationQuerySchema, type Finding, type Repository } from '@repodoctor/contracts';
import { callService } from '../services/upstream';

const findingsGatewayRoute: FastifyPluginAsyncZod = async (fastify) => {
  // List findings the caller can see (paginated in the gateway after org-scoped fetches).
  fastify.get(
    '/api/v1/findings',
    {
      schema: {
        tags: ['findings'],
        querystring: paginationQuerySchema.extend({
          workspaceId: z.string().uuid().optional(),
          repositoryId: z.string().uuid().optional(),
        }),
        response: { 200: paginatedResponseSchema(findingSchema) },
      },
    },
    async (request) => {
      const principal = await fastify.authenticate(request);
      if (request.query.workspaceId) {
        await fastify.workspaceService.get(principal.userId, request.query.workspaceId, 'VIEWER');
      }
      if (request.query.repositoryId) {
        const result = await callService<Repository>({
          baseUrl: fastify.config.repositoryServiceUrl,
          path: `/api/v1/repositories/${request.query.repositoryId}`,
          config: fastify.config,
          correlationId: request.correlationId,
        });
        await fastify.workspaceService.assertRepoAccess(
          principal.userId,
          result.json.workspaceId,
          result.json.id,
          'VIEW',
        );
      }
      const workspaceIds = request.query.workspaceId
        ? [request.query.workspaceId]
        : (await fastify.workspaceService.listForUser(principal.userId)).map((org) => org.id);
      if (workspaceIds.length === 0 || !fastify.config.findingsServiceUrl.trim()) {
        return { items: [], page: request.query.page, pageSize: request.query.pageSize, total: 0 };
      }
      const batches = await Promise.all(
        workspaceIds.map(async (workspaceId) => {
          const params = new URLSearchParams({
            workspaceId,
            page: '1',
            pageSize: '100',
          });
          if (request.query.repositoryId) params.set('repositoryId', request.query.repositoryId);
          try {
            const result = await callService<{ items: Finding[] }>({
              baseUrl: fastify.config.findingsServiceUrl,
              path: `/api/v1/findings?${params.toString()}`,
              config: fastify.config,
              correlationId: request.correlationId,
            });
            return result.json.items ?? [];
          } catch {
            return [] as Finding[];
          }
        }),
      );
      const items = batches
        .flat()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const start = (request.query.page - 1) * request.query.pageSize;
      return {
        items: items.slice(start, start + request.query.pageSize),
        page: request.query.page,
        pageSize: request.query.pageSize,
        total: items.length,
      };
    },
  );
};

export default findingsGatewayRoute;
