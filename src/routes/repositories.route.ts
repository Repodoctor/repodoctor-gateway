import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { z } from 'zod';
import {
  analysisRunSchema,
  paginatedResponseSchema,
  paginationQuerySchema,
  repositorySchema,
  scmInstallationSchema,
  type AnalysisRun,
  type Repository,
  type ScmInstallation,
} from '@repodoctor/contracts';
import { badRequest } from '@repodoctor/contracts';
import { callService } from '../services/upstream';

const repositoriesRoute: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get(
    '/api/v1/organizations/:organizationId/scm',
    {
      schema: {
        tags: ['scm'],
        params: z.object({ organizationId: z.string().uuid() }),
        response: { 200: z.object({ items: z.array(scmInstallationSchema) }) },
      },
    },
    async (request) => {
      const principal = await fastify.authenticate(request);
      await fastify.organizationService.get(principal.userId, request.params.organizationId, 'VIEWER');
      const result = await callService<{ items: ScmInstallation[] }>({
        baseUrl: fastify.config.scmServiceUrl,
        path: `/internal/installations?organizationId=${request.params.organizationId}`,
        config: fastify.config,
        correlationId: request.correlationId,
      });
      return { items: result.json.items ?? [] };
    },
  );

  fastify.get(
    '/api/v1/organizations/:organizationId/scm/github/install',
    {
      schema: {
        tags: ['scm'],
        params: z.object({ organizationId: z.string().uuid() }),
        response: { 200: z.object({ url: z.string().url(), slug: z.string() }) },
      },
    },
    async (request) => {
      const principal = await fastify.authenticate(request);
      await fastify.organizationService.get(principal.userId, request.params.organizationId, 'MEMBER');
      const result = await callService<{ slug: string; configured: boolean }>({
        baseUrl: fastify.config.scmServiceUrl,
        path: '/internal/github/app',
        config: fastify.config,
        correlationId: request.correlationId,
      });
      const slug = result.json.slug?.trim();
      if (!slug) {
        throw badRequest('GitHub App slug is not configured on the SCM service');
      }
      const url = new URL(`https://github.com/apps/${encodeURIComponent(slug)}/installations/new`);
      url.searchParams.set('state', request.params.organizationId);
      return { url: url.toString(), slug };
    },
  );

  fastify.post(
    '/api/v1/organizations/:organizationId/scm/github',
    {
      schema: {
        tags: ['scm'],
        params: z.object({ organizationId: z.string().uuid() }),
        body: z.object({
          externalInstallationId: z.string().min(1),
          accountLogin: z.string().min(1).optional(),
        }),
      },
    },
    async (request, reply) => {
      const principal = await fastify.authenticate(request);
      await fastify.organizationService.get(principal.userId, request.params.organizationId, 'MEMBER');
      const result = await callService({
        baseUrl: fastify.config.scmServiceUrl,
        path: '/internal/installations/github',
        method: 'POST',
        config: fastify.config,
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
        baseUrl: fastify.config.repositoryServiceUrl,
        path: `/api/v1/repositories?organizationId=${request.query.organizationId}&page=${request.query.page}&pageSize=${request.query.pageSize}`,
        config: fastify.config,
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
        baseUrl: fastify.config.repositoryServiceUrl,
        path: `/api/v1/repositories/${request.params.repositoryId}?organizationId=${request.query.organizationId}`,
        config: fastify.config,
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
        baseUrl: fastify.config.repositoryServiceUrl,
        path: `/api/v1/repositories/${request.params.repositoryId}/analysis?organizationId=${request.query.organizationId}`,
        method: 'POST',
        config: fastify.config,
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
        baseUrl: fastify.config.repositoryServiceUrl,
        path: `/api/v1/analysis?organizationId=${request.query.organizationId}&repositoryId=${request.query.repositoryId}`,
        config: fastify.config,
        correlationId: request.correlationId,
      });
      return result.json;
    },
  );
};

export default repositoriesRoute;
