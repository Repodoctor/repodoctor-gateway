import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { z } from 'zod';
import {
  analysisRunSchema,
  connectGithubInstallationBodySchema,
  paginatedResponseSchema,
  paginationQuerySchema,
  repositorySchema,
  type AnalysisRun,
  type Repository,
} from '@repodoctor/contracts';
import { callService } from '../services/upstream';

const repositoriesRoute: FastifyPluginAsyncZod = async (fastify) => {
  fastify.post(
    '/api/v1/organizations/:organizationId/scm/github',
    {
      schema: {
        tags: ['scm'],
        params: z.object({ organizationId: z.string().uuid() }),
        body: connectGithubInstallationBodySchema,
      },
    },
    async (request, reply) => {
      const principal = await fastify.authenticate(request);
      await fastify.organizationService.get(principal.userId, request.params.organizationId, 'MEMBER');
      const result = await callService({
        baseUrl: fastify.config.scmBaseUrl,
        path: '/internal/installations/github',
        method: 'POST',
        token: fastify.config.serviceAuthToken,
        correlationId: request.correlationId,
        body: {
          organizationId: request.params.organizationId,
          externalInstallationId: request.body.externalInstallationId,
          accountLogin: request.body.accountLogin,
        },
      });
      reply.code(201);
      return result.json;
    },
  );

  fastify.get(
    '/api/v1/repositories',
    {
      schema: {
        tags: ['repositories'],
        querystring: paginationQuerySchema.extend({ organizationId: z.string().uuid().optional() }),
        response: { 200: paginatedResponseSchema(repositorySchema) },
      },
    },
    async (request) => {
      const principal = await fastify.authenticate(request);
      if (!request.query.organizationId) {
        return { items: [], page: request.query.page, pageSize: request.query.pageSize, total: 0 };
      }
      await fastify.organizationService.get(principal.userId, request.query.organizationId, 'VIEWER');
      const result = await callService<{ items: Repository[]; page: number; pageSize: number; total: number }>({
        baseUrl: fastify.config.repositoryBaseUrl,
        path: `/api/v1/repositories?organizationId=${request.query.organizationId}&page=${request.query.page}&pageSize=${request.query.pageSize}`,
        token: fastify.config.serviceAuthToken,
        correlationId: request.correlationId,
      });
      return result.json;
    },
  );

  fastify.get(
    '/api/v1/repositories/:repositoryId',
    {
      schema: {
        tags: ['repositories'],
        params: z.object({ repositoryId: z.string().uuid() }),
        querystring: z.object({ organizationId: z.string().uuid() }),
        response: { 200: repositorySchema },
      },
    },
    async (request) => {
      const principal = await fastify.authenticate(request);
      await fastify.organizationService.get(principal.userId, request.query.organizationId, 'VIEWER');
      const result = await callService<Repository>({
        baseUrl: fastify.config.repositoryBaseUrl,
        path: `/api/v1/repositories/${request.params.repositoryId}?organizationId=${request.query.organizationId}`,
        token: fastify.config.serviceAuthToken,
        correlationId: request.correlationId,
      });
      return result.json;
    },
  );

  fastify.post(
    '/api/v1/repositories/:repositoryId/analysis',
    {
      schema: {
        tags: ['analysis'],
        params: z.object({ repositoryId: z.string().uuid() }),
        querystring: z.object({ organizationId: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const principal = await fastify.authenticate(request);
      await fastify.organizationService.get(principal.userId, request.query.organizationId, 'MEMBER');
      const result = await callService({
        baseUrl: fastify.config.repositoryBaseUrl,
        path: `/api/v1/repositories/${request.params.repositoryId}/analysis?organizationId=${request.query.organizationId}`,
        method: 'POST',
        token: fastify.config.serviceAuthToken,
        correlationId: request.correlationId,
        body: request.body,
      });
      reply.code(202);
      return result.json;
    },
  );

  fastify.get(
    '/api/v1/analysis',
    {
      schema: {
        tags: ['analysis'],
        querystring: z.object({
          organizationId: z.string().uuid().optional(),
          repositoryId: z.string().uuid().optional(),
        }),
        response: { 200: z.object({ items: z.array(analysisRunSchema) }) },
      },
    },
    async (request) => {
      const principal = await fastify.authenticate(request);
      if (!request.query.organizationId || !request.query.repositoryId) {
        return { items: [] };
      }
      await fastify.organizationService.get(principal.userId, request.query.organizationId, 'VIEWER');
      const result = await callService<{ items: AnalysisRun[] }>({
        baseUrl: fastify.config.repositoryBaseUrl,
        path: `/api/v1/analysis?organizationId=${request.query.organizationId}&repositoryId=${request.query.repositoryId}`,
        token: fastify.config.serviceAuthToken,
        correlationId: request.correlationId,
      });
      return result.json;
    },
  );
};

export default repositoriesRoute;
