import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { z } from 'zod';
import {
  addMemberBodySchema,
  addMemberResponseSchema,
  createOrganizationBodySchema,
  organizationInvitePreviewSchema,
  organizationInviteSchema,
  organizationMemberSchema,
  organizationSchema,
  orgRoleSchema,
  updateMemberBodySchema,
  updateOrganizationBodySchema,
  badRequest,
} from '@repodoctor/contracts';

const organizationWithRole = organizationSchema.extend({ role: orgRoleSchema });

const orgsRoute: FastifyPluginAsyncZod = async (fastify) => {
  // Create an organization; the caller becomes OWNER.
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

  // List organizations the authenticated user belongs to.
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

  // Get one organization (membership required).
  fastify.get(
    '/api/v1/organizations/:organizationId',
    {
      schema: {
        tags: ['organizations'],
        operationId: 'getOrganization',
        params: z.object({ organizationId: z.string().uuid() }),
        response: { 200: organizationWithRole },
      },
    },
    async (request) => {
      const principal = await fastify.authenticate(request);
      return fastify.organizationService.get(principal.userId, request.params.organizationId);
    },
  );

  // Rename an organization (OWNER/ADMIN).
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

  // List members of an organization.
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

  // Invite or add a member by email; sends a Supabase invite when the user is new.
  fastify.post(
    '/api/v1/organizations/:organizationId/members',
    {
      schema: {
        tags: ['organizations'],
        operationId: 'addMember',
        params: z.object({ organizationId: z.string().uuid() }),
        body: addMemberBodySchema,
        response: { 201: addMemberResponseSchema },
      },
    },
    async (request, reply) => {
      const principal = await fastify.authenticate(request);
      const result = await fastify.organizationService.addMember(
        principal.userId,
        request.params.organizationId,
        { email: request.body.email, role: request.body.role },
      );
      reply.code(201);
      return result;
    },
  );

  // List pending organization invites.
  fastify.get(
    '/api/v1/organizations/:organizationId/invites',
    {
      schema: {
        tags: ['organizations'],
        operationId: 'listInvites',
        params: z.object({ organizationId: z.string().uuid() }),
        response: { 200: z.object({ items: z.array(organizationInviteSchema) }) },
      },
    },
    async (request) => {
      const principal = await fastify.authenticate(request);
      const items = await fastify.organizationService.listInvites(
        principal.userId,
        request.params.organizationId,
      );
      return { items };
    },
  );

  // Revoke a pending invite.
  fastify.delete(
    '/api/v1/organizations/:organizationId/invites/:inviteId',
    {
      schema: {
        tags: ['organizations'],
        operationId: 'revokeInvite',
        params: z.object({ organizationId: z.string().uuid(), inviteId: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      await fastify.organizationService.revokeInvite(
        (await fastify.authenticate(request)).userId,
        request.params.organizationId,
        request.params.inviteId,
      );
      return reply.code(204).send();
    },
  );

  // Public preview of an invite (email, org name, role) before accept.
  fastify.get(
    '/api/v1/invites/:token',
    {
      schema: {
        tags: ['organizations'],
        operationId: 'previewInvite',
        params: z.object({ token: z.string().min(8) }),
        response: { 200: organizationInvitePreviewSchema },
      },
    },
    async (request) => fastify.organizationService.getInvitePreview(request.params.token),
  );

  // Accept an invite for the authenticated user.
  fastify.post(
    '/api/v1/invites/:token/accept',
    {
      schema: {
        tags: ['organizations'],
        operationId: 'acceptInvite',
        params: z.object({ token: z.string().min(8) }),
        response: { 200: organizationMemberSchema },
      },
    },
    async (request) => {
      const principal = await fastify.authenticate(request);
      return fastify.organizationService.acceptInvite(principal.userId, request.params.token);
    },
  );

  // Change a member's organization role (not OWNER).
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

  // Remove a member from the organization.
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

  // Delete the organization, catalog, findings, and GitHub App installation.
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
