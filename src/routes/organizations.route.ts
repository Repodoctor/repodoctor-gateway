import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { z } from 'zod';
import {
  addMemberBodySchema,
  createOrganizationBodySchema,
  organizationMemberSchema,
  organizationSchema,
  orgRoleSchema,
  updateMemberBodySchema,
  updateOrganizationBodySchema,
  badRequest,
} from '@repodoctor/contracts';

const organizationWithRole = organizationSchema.extend({ role: orgRoleSchema });

const orgsRoute: FastifyPluginAsyncZod = async (fastify) => {
  fastify.post(
    '/api/v1/organizations',
    {
      schema: {
        tags: ['organizations'],
        operationId: 'createOrganization',
        body: createOrganizationBodySchema,
        response: { 201: organizationWithRole },
      },
    },
    async (request, reply) => {
      const principal = await fastify.authenticate(request);
      const org = await fastify.organizationService.create(principal.userId, request.body);
      reply.code(201);
      return { ...org, role: 'OWNER' as const };
    },
  );

  fastify.get(
    '/api/v1/organizations',
    {
      schema: {
        tags: ['organizations'],
        operationId: 'listOrganizations',
        response: { 200: z.object({ items: z.array(organizationWithRole) }) },
      },
    },
    async (request) => {
      const principal = await fastify.authenticate(request);
      const items = await fastify.organizationService.listForUser(principal.userId);
      return { items };
    },
  );

  fastify.get(
    '/api/v1/organizations/:organizationId',
    {
      schema: {
        tags: ['organizations'],
        operationId: 'getOrganization',
        params: z.object({ organizationId: z.string().uuid() }),
        response: { 200: organizationSchema },
      },
    },
    async (request) => {
      const principal = await fastify.authenticate(request);
      return fastify.organizationService.get(principal.userId, request.params.organizationId);
    },
  );

  fastify.patch(
    '/api/v1/organizations/:organizationId',
    {
      schema: {
        tags: ['organizations'],
        operationId: 'updateOrganization',
        params: z.object({ organizationId: z.string().uuid() }),
        body: updateOrganizationBodySchema,
        response: { 200: organizationSchema },
      },
    },
    async (request) => {
      const principal = await fastify.authenticate(request);
      if (!request.body.name) throw badRequest('name is required');
      return fastify.organizationService.update(
        principal.userId,
        request.params.organizationId,
        request.body.name,
      );
    },
  );

  fastify.get(
    '/api/v1/organizations/:organizationId/members',
    {
      schema: {
        tags: ['organizations'],
        operationId: 'listMembers',
        params: z.object({ organizationId: z.string().uuid() }),
        response: { 200: z.object({ items: z.array(organizationMemberSchema) }) },
      },
    },
    async (request) => {
      const principal = await fastify.authenticate(request);
      const items = await fastify.organizationService.listMembers(
        principal.userId,
        request.params.organizationId,
      );
      return { items };
    },
  );

  fastify.post(
    '/api/v1/organizations/:organizationId/members',
    {
      schema: {
        tags: ['organizations'],
        operationId: 'addMember',
        params: z.object({ organizationId: z.string().uuid() }),
        body: addMemberBodySchema,
        response: { 201: organizationMemberSchema },
      },
    },
    async (request, reply) => {
      const principal = await fastify.authenticate(request);
      const target = await fastify.organizationService.getUserByEmail(request.body.email);
      if (!target) throw badRequest('User must sign up before being added to an organization');
      const member = await fastify.organizationService.addMember(
        principal.userId,
        request.params.organizationId,
        { email: request.body.email, role: request.body.role },
      );
      reply.code(201);
      return member;
    },
  );

  fastify.patch(
    '/api/v1/organizations/:organizationId/members/:userId',
    {
      schema: {
        tags: ['organizations'],
        operationId: 'updateMember',
        params: z.object({ organizationId: z.string().uuid(), userId: z.string().uuid() }),
        body: updateMemberBodySchema,
        response: { 200: organizationMemberSchema },
      },
    },
    async (request) =>
      fastify.organizationService.updateMember(
        (await fastify.authenticate(request)).userId,
        request.params.organizationId,
        request.params.userId,
        request.body.role,
      ),
  );

  fastify.delete(
    '/api/v1/organizations/:organizationId/members/:userId',
    {
      schema: {
        tags: ['organizations'],
        operationId: 'removeMember',
        params: z.object({ organizationId: z.string().uuid(), userId: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      await fastify.organizationService.removeMember(
        (await fastify.authenticate(request)).userId,
        request.params.organizationId,
        request.params.userId,
      );
      return reply.code(204).send();
    },
  );

  fastify.delete(
    '/api/v1/organizations/:organizationId',
    {
      schema: {
        tags: ['organizations'],
        operationId: 'deleteOrganization',
        params: z.object({ organizationId: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const principal = await fastify.authenticate(request);
      await fastify.organizationService.delete(principal.userId, request.params.organizationId);
      return reply.code(204).send();
    },
  );
};

export default orgsRoute;
