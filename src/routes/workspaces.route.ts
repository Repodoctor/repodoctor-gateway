import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { z } from 'zod';
import {
  addMemberBodySchema,
  addMemberResponseSchema,
  createWorkspaceBodySchema,
  workspaceInvitePreviewSchema,
  workspaceInviteSchema,
  workspaceMemberSchema,
  workspaceSchema,
  workspaceRoleSchema,
  updateMemberBodySchema,
  updateWorkspaceBodySchema,
  badRequest,
} from '@repodoctor/contracts';

const organizationWithRole = workspaceSchema.extend({ role: workspaceRoleSchema });

const orgsRoute: FastifyPluginAsyncZod = async (fastify) => {
  // Create an organization; the caller becomes OWNER.
  fastify.post(
    '/api/v1/workspaces',
    {
      schema: {
        tags: ['workspaces'],
        operationId: 'createWorkspace',
        body: createWorkspaceBodySchema,
        response: { 201: organizationWithRole },
      },
    },
    async (request, reply) => {
      const principal = await fastify.authenticate(request);
      const org = await fastify.workspaceService.create(principal.userId, request.body);
      reply.code(201);
      return { ...org, role: 'OWNER' as const };
    },
  );

  // List workspaces the authenticated user belongs to.
  fastify.get(
    '/api/v1/workspaces',
    {
      schema: {
        tags: ['workspaces'],
        operationId: 'listWorkspaces',
        response: { 200: z.object({ items: z.array(organizationWithRole) }) },
      },
    },
    async (request) => {
      const principal = await fastify.authenticate(request);
      const items = await fastify.workspaceService.listForUser(principal.userId);
      return { items };
    },
  );

  // Get one organization (membership required).
  fastify.get(
    '/api/v1/workspaces/:workspaceId',
    {
      schema: {
        tags: ['workspaces'],
        operationId: 'getWorkspace',
        params: z.object({ workspaceId: z.string().uuid() }),
        response: { 200: organizationWithRole },
      },
    },
    async (request) => {
      const principal = await fastify.authenticate(request);
      return fastify.workspaceService.get(principal.userId, request.params.workspaceId);
    },
  );

  // Rename an organization (OWNER/ADMIN).
  fastify.patch(
    '/api/v1/workspaces/:workspaceId',
    {
      schema: {
        tags: ['workspaces'],
        operationId: 'updateWorkspace',
        params: z.object({ workspaceId: z.string().uuid() }),
        body: updateWorkspaceBodySchema,
        response: { 200: workspaceSchema },
      },
    },
    async (request) => {
      const principal = await fastify.authenticate(request);
      if (!request.body.name) throw badRequest('name is required');
      return fastify.workspaceService.update(
        principal.userId,
        request.params.workspaceId,
        request.body.name,
      );
    },
  );

  // List members of an organization.
  fastify.get(
    '/api/v1/workspaces/:workspaceId/members',
    {
      schema: {
        tags: ['workspaces'],
        operationId: 'listMembers',
        params: z.object({ workspaceId: z.string().uuid() }),
        response: { 200: z.object({ items: z.array(workspaceMemberSchema) }) },
      },
    },
    async (request) => {
      const principal = await fastify.authenticate(request);
      const items = await fastify.workspaceService.listMembers(
        principal.userId,
        request.params.workspaceId,
      );
      return { items };
    },
  );

  // Invite or add a member by email; sends a Supabase invite when the user is new.
  fastify.post(
    '/api/v1/workspaces/:workspaceId/members',
    {
      schema: {
        tags: ['workspaces'],
        operationId: 'addMember',
        params: z.object({ workspaceId: z.string().uuid() }),
        body: addMemberBodySchema,
        response: { 201: addMemberResponseSchema },
      },
    },
    async (request, reply) => {
      const principal = await fastify.authenticate(request);
      const result = await fastify.workspaceService.addMember(
        principal.userId,
        request.params.workspaceId,
        { email: request.body.email, role: request.body.role },
      );
      reply.code(201);
      return result;
    },
  );

  // List pending organization invites.
  fastify.get(
    '/api/v1/workspaces/:workspaceId/invites',
    {
      schema: {
        tags: ['workspaces'],
        operationId: 'listInvites',
        params: z.object({ workspaceId: z.string().uuid() }),
        response: { 200: z.object({ items: z.array(workspaceInviteSchema) }) },
      },
    },
    async (request) => {
      const principal = await fastify.authenticate(request);
      const items = await fastify.workspaceService.listInvites(
        principal.userId,
        request.params.workspaceId,
      );
      return { items };
    },
  );

  // Revoke a pending invite.
  fastify.delete(
    '/api/v1/workspaces/:workspaceId/invites/:inviteId',
    {
      schema: {
        tags: ['workspaces'],
        operationId: 'revokeInvite',
        params: z.object({ workspaceId: z.string().uuid(), inviteId: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      await fastify.workspaceService.revokeInvite(
        (await fastify.authenticate(request)).userId,
        request.params.workspaceId,
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
        tags: ['workspaces'],
        operationId: 'previewInvite',
        params: z.object({ token: z.string().min(8) }),
        response: { 200: workspaceInvitePreviewSchema },
      },
    },
    async (request) => fastify.workspaceService.getInvitePreview(request.params.token),
  );

  // Accept an invite for the authenticated user.
  fastify.post(
    '/api/v1/invites/:token/accept',
    {
      schema: {
        tags: ['workspaces'],
        operationId: 'acceptInvite',
        params: z.object({ token: z.string().min(8) }),
        response: { 200: workspaceMemberSchema },
      },
    },
    async (request) => {
      const principal = await fastify.authenticate(request);
      return fastify.workspaceService.acceptInvite(principal.userId, request.params.token);
    },
  );

  // Change a member's organization role (not OWNER).
  fastify.patch(
    '/api/v1/workspaces/:workspaceId/members/:userId',
    {
      schema: {
        tags: ['workspaces'],
        operationId: 'updateMember',
        params: z.object({ workspaceId: z.string().uuid(), userId: z.string().uuid() }),
        body: updateMemberBodySchema,
        response: { 200: workspaceMemberSchema },
      },
    },
    async (request) =>
      fastify.workspaceService.updateMember(
        (await fastify.authenticate(request)).userId,
        request.params.workspaceId,
        request.params.userId,
        request.body.role,
      ),
  );

  // Remove a member from the organization.
  fastify.delete(
    '/api/v1/workspaces/:workspaceId/members/:userId',
    {
      schema: {
        tags: ['workspaces'],
        operationId: 'removeMember',
        params: z.object({ workspaceId: z.string().uuid(), userId: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      await fastify.workspaceService.removeMember(
        (await fastify.authenticate(request)).userId,
        request.params.workspaceId,
        request.params.userId,
      );
      return reply.code(204).send();
    },
  );

  // Delete the organization, catalog, findings, and GitHub App installation.
  fastify.delete(
    '/api/v1/workspaces/:workspaceId',
    {
      schema: {
        tags: ['workspaces'],
        operationId: 'deleteWorkspace',
        params: z.object({ workspaceId: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const principal = await fastify.authenticate(request);
      await fastify.workspaceService.delete(principal.userId, request.params.workspaceId);
      return reply.code(204).send();
    },
  );
};

export default orgsRoute;
