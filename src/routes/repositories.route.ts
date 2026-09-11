import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { z } from 'zod';
import {
  analysisRunSchema,
  paginatedResponseSchema,
  paginationQuerySchema,
  repositoryAccessGrantSchema,
  repositoryWithPermissionSchema,
  scmInstallationSchema,
  scmProviderSchema,
  updateRepositoryAccessBodySchema,
  type AnalysisRun,
  type Repository,
  type ScmInstallation,
} from '@repodoctor/contracts';
import { badRequest } from '@repodoctor/contracts';
import { callService } from '../services/upstream';

const repositoriesRoute: FastifyPluginAsyncZod = async (fastify) => {
  // List SCM installations for an organization.
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

  // Build the SCM install or configure URL for a popup (provider-generic).
  fastify.get(
    '/api/v1/organizations/:organizationId/scm/:provider/install',
    {
      schema: {
        tags: ['scm'],
        params: z.object({ organizationId: z.string().uuid(), provider: scmProviderSchema }),
        querystring: z.object({ externalInstallationId: z.string().min(1).optional() }),
        response: { 200: z.object({ url: z.string().url(), slug: z.string(), configured: z.boolean(), label: z.string() }) },
      },
    },
    async (request) => {
      const principal = await fastify.authenticate(request);
      await fastify.organizationService.get(principal.userId, request.params.organizationId, 'MEMBER');
      const params = new URLSearchParams({ organizationId: request.params.organizationId });
      if (request.query.externalInstallationId) {
        params.set('externalInstallationId', request.query.externalInstallationId);
      }
      const result = await callService<{ url: string; slug: string; configured: boolean; label: string }>({
        baseUrl: fastify.config.scmServiceUrl,
        path: `/internal/providers/${request.params.provider}/app?${params.toString()}`,
        config: fastify.config,
        correlationId: request.correlationId,
      });
      if (!result.json.url || !result.json.slug) {
        throw badRequest(`SCM provider ${request.params.provider} is not configured`);
      }
      return result.json;
    },
  );

  // Finalize an SCM installation and ingest selected repositories.
  fastify.post(
    '/api/v1/organizations/:organizationId/scm/:provider',
    {
      schema: {
        tags: ['scm'],
        params: z.object({ organizationId: z.string().uuid(), provider: scmProviderSchema }),
        body: z.object({
          externalInstallationId: z.string().min(1).optional(),
          accountLogin: z.string().min(1).optional(),
          callback: z.record(z.string(), z.string().nullable()).optional(),
        }),
      },
    },
    async (request, reply) => {
      const principal = await fastify.authenticate(request);
      await fastify.organizationService.get(principal.userId, request.params.organizationId, 'MEMBER');
      const callback = request.body.callback ?? {};
      const callbackInstallationId =
        typeof callback.installation_id === 'string' ? callback.installation_id : undefined;
      await fastify.organizationService.assertScmInstallationLimit(
        request.params.organizationId,
        request.body.externalInstallationId ?? callbackInstallationId,
      );
      await fastify.organizationService.assertRepositoryLimit(request.params.organizationId);
      const result = await callService({
        baseUrl: fastify.config.scmServiceUrl,
        path: `/internal/installations/${request.params.provider}`,
        method: 'POST',
        config: fastify.config,
        correlationId: request.correlationId,
        body: {
          organizationId: request.params.organizationId,
          externalInstallationId: request.body.externalInstallationId,
          accountLogin: request.body.accountLogin,
          callback: request.body.callback,
        },
      });
      reply.code(201);
      return result.json;
    },
  );

  // Disconnect one SCM installation (one GitHub org/user App install).
  fastify.delete(
    '/api/v1/organizations/:organizationId/scm/installations/:installationId',
    {
      schema: {
        tags: ['scm'],
        params: z.object({ organizationId: z.string().uuid(), installationId: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const principal = await fastify.authenticate(request);
      await fastify.organizationService.disconnectInstallation(
        principal.userId,
        request.params.organizationId,
        request.params.installationId,
      );
      return reply.code(204).send();
    },
  );

  // List repositories the caller can view (one org or all memberships).
  fastify.get(
    '/api/v1/repositories',
    {
      schema: {
        tags: ['repositories'],
        querystring: paginationQuerySchema.extend({ organizationId: z.string().uuid().optional() }),
        response: { 200: paginatedResponseSchema(repositoryWithPermissionSchema) },
      },
    },
    async (request) => {
      const principal = await fastify.authenticate(request);
      if (!request.query.organizationId) {
        const orgs = await fastify.organizationService.listForUser(principal.userId);
        if (orgs.length === 0) {
          return { items: [], page: request.query.page, pageSize: request.query.pageSize, total: 0 };
        }
        const params = new URLSearchParams({
          organizationIds: orgs.map((org) => org.id).join(','),
          page: String(request.query.page),
          pageSize: String(request.query.pageSize),
        });
        const result = await callService<{ items: Repository[]; page: number; pageSize: number; total: number }>({
          baseUrl: fastify.config.repositoryServiceUrl,
          path: `/api/v1/repositories?${params.toString()}`,
          config: fastify.config,
          correlationId: request.correlationId,
        });
        const items = await fastify.organizationService.withRepoPermissions(principal.userId, result.json.items);
        return { ...result.json, items, total: items.length };
      }
      await fastify.organizationService.get(principal.userId, request.query.organizationId, 'VIEWER');
      const result = await callService<{ items: Repository[]; page: number; pageSize: number; total: number }>({
        baseUrl: fastify.config.repositoryServiceUrl,
        path: `/api/v1/repositories?organizationId=${request.query.organizationId}&page=${request.query.page}&pageSize=${request.query.pageSize}`,
        config: fastify.config,
        correlationId: request.correlationId,
      });
      const items = await fastify.organizationService.withRepoPermissions(principal.userId, result.json.items);
      return { ...result.json, items, total: items.length };
    },
  );

  // Get one repository plus the caller's effective permission.
  fastify.get(
    '/api/v1/repositories/:repositoryId',
    {
      schema: {
        tags: ['repositories'],
        params: z.object({ repositoryId: z.string().uuid() }),
        querystring: z.object({ organizationId: z.string().uuid().optional() }),
        response: { 200: repositoryWithPermissionSchema },
      },
    },
    async (request) => {
      const principal = await fastify.authenticate(request);
      const qs = request.query.organizationId
        ? `?organizationId=${request.query.organizationId}`
        : '';
      const result = await callService<Repository>({
        baseUrl: fastify.config.repositoryServiceUrl,
        path: `/api/v1/repositories/${request.params.repositoryId}${qs}`,
        config: fastify.config,
        correlationId: request.correlationId,
      });
      const permission = await fastify.organizationService.assertRepoAccess(
        principal.userId,
        result.json.organizationId,
        result.json.id,
        'VIEW',
      );
      if (request.query.organizationId && request.query.organizationId !== result.json.organizationId) {
        throw badRequest('Repository does not belong to the requested organization');
      }
      return { ...result.json, permission };
    },
  );

  // List per-user repository access grants (ADMIN).
  fastify.get(
    '/api/v1/repositories/:repositoryId/access',
    {
      schema: {
        tags: ['repositories'],
        params: z.object({ repositoryId: z.string().uuid() }),
        querystring: z.object({ organizationId: z.string().uuid().optional() }),
        response: { 200: z.object({ items: z.array(repositoryAccessGrantSchema) }) },
      },
    },
    async (request) => {
      const principal = await fastify.authenticate(request);
      const qs = request.query.organizationId
        ? `?organizationId=${request.query.organizationId}`
        : '';
      const result = await callService<Repository>({
        baseUrl: fastify.config.repositoryServiceUrl,
        path: `/api/v1/repositories/${request.params.repositoryId}${qs}`,
        config: fastify.config,
        correlationId: request.correlationId,
      });
      const items = await fastify.organizationService.listAccessGrants(principal.userId, result.json);
      return { items };
    },
  );

  // Set a member's repository permission override.
  fastify.put(
    '/api/v1/repositories/:repositoryId/access/:userId',
    {
      schema: {
        tags: ['repositories'],
        params: z.object({ repositoryId: z.string().uuid(), userId: z.string().uuid() }),
        querystring: z.object({ organizationId: z.string().uuid().optional() }),
        body: updateRepositoryAccessBodySchema,
        response: { 200: repositoryAccessGrantSchema },
      },
    },
    async (request) => {
      const principal = await fastify.authenticate(request);
      const qs = request.query.organizationId
        ? `?organizationId=${request.query.organizationId}`
        : '';
      const result = await callService<Repository>({
        baseUrl: fastify.config.repositoryServiceUrl,
        path: `/api/v1/repositories/${request.params.repositoryId}${qs}`,
        config: fastify.config,
        correlationId: request.correlationId,
      });
      return fastify.organizationService.setAccessGrant(
        principal.userId,
        result.json,
        request.params.userId,
        request.body.permission,
      );
    },
  );

  // Clear a member's repository permission override.
  fastify.delete(
    '/api/v1/repositories/:repositoryId/access/:userId',
    {
      schema: {
        tags: ['repositories'],
        params: z.object({ repositoryId: z.string().uuid(), userId: z.string().uuid() }),
        querystring: z.object({ organizationId: z.string().uuid().optional() }),
      },
    },
    async (request, reply) => {
      const principal = await fastify.authenticate(request);
      const qs = request.query.organizationId
        ? `?organizationId=${request.query.organizationId}`
        : '';
      const result = await callService<Repository>({
        baseUrl: fastify.config.repositoryServiceUrl,
        path: `/api/v1/repositories/${request.params.repositoryId}${qs}`,
        config: fastify.config,
        correlationId: request.correlationId,
      });
      await fastify.organizationService.clearAccessGrant(principal.userId, result.json, request.params.userId);
      return reply.code(204).send();
    },
  );

  // Queue an analysis run for a repository.
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
      await fastify.organizationService.assertRepoAccess(
        principal.userId,
        request.query.organizationId,
        request.params.repositoryId,
        'ANALYZE',
      );
      if ((request.body as { trigger?: string } | undefined)?.trigger !== 'WEBHOOK') {
        await fastify.organizationService.assertManualAnalysisLimit(
          request.query.organizationId,
          request.params.repositoryId,
        );
      }
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

  // List analysis runs for a repository.
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
      await fastify.organizationService.assertRepoAccess(
        principal.userId,
        request.query.organizationId,
        request.query.repositoryId,
        'VIEW',
      );
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
