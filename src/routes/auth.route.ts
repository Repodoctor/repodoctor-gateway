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
      reply.code(201);
      return session;
    },
  );

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
    async (request) => fastify.authService.login(request.body),
  );

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
