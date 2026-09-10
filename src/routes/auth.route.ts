import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { z } from 'zod';
import {
  forgotPasswordBodySchema,
  loginBodySchema,
  refreshBodySchema,
  sessionSchema,
  signupBodySchema,
} from '@repodoctor/contracts';

const authRoute: FastifyPluginAsyncZod = async (fastify) => {
  // Create a user account and return an access/refresh session.
  fastify.post(
    '/api/v1/auth/signup',
    {
      schema: {
        tags: ['auth'],
        operationId: 'signup',
        body: signupBodySchema,
        response: { 201: sessionSchema },
      },
    },
    async (request, reply) => {
      const session = await fastify.authService.signup(request.body);
      await fastify.organizationService.ensureUser(session.user);
      reply.code(201);
      return session;
    },
  );

  // Authenticate with email/password and return a session.
  fastify.post(
    '/api/v1/auth/login',
    {
      schema: {
        tags: ['auth'],
        operationId: 'login',
        body: loginBodySchema,
        response: { 200: sessionSchema },
      },
    },
    async (request) => {
      const session = await fastify.authService.login(request.body);
      await fastify.organizationService.ensureUser(session.user);
      return session;
    },
  );

  // Exchange a refresh token for a new session.
  fastify.post(
    '/api/v1/auth/refresh',
    {
      schema: {
        tags: ['auth'],
        operationId: 'refresh',
        body: refreshBodySchema,
        response: { 200: sessionSchema },
      },
    },
    async (request) => fastify.authService.refresh(request.body.refreshToken),
  );

  // Invalidate the current refresh token / Supabase session.
  fastify.post(
    '/api/v1/auth/logout',
    {
      schema: {
        tags: ['auth'],
        operationId: 'logout',
        body: z.object({ refreshToken: z.string().optional() }),
      },
    },
    async (request, reply) => {
      await fastify.authService.logout(request.body.refreshToken);
      return reply.code(204).send();
    },
  );

  // Start a password-reset email; always returns 202 so callers cannot enumerate users.
  fastify.post(
    '/api/v1/auth/forgot-password',
    {
      schema: {
        tags: ['auth'],
        operationId: 'forgotPassword',
        body: forgotPasswordBodySchema,
        response: { 202: z.object({ accepted: z.boolean() }) },
      },
    },
    async (request, reply) => {
      await fastify.authService.forgotPassword(request.body.email);
      reply.code(202);
      return { accepted: true };
    },
  );
};

export default authRoute;
