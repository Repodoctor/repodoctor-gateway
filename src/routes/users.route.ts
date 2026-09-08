import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { updateProfileBodySchema, userSchema } from '@repodoctor/contracts';

const usersRoute: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get(
    '/api/v1/users/me',
    {
      schema: {
        tags: ['users'],
        operationId: 'getMe',
        response: { 200: userSchema },
      },
    },
    async (request) => {
      const principal = await fastify.authenticate(request);
      return fastify.organizationService.ensureUser({
        id: principal.userId,
        email: principal.email,
        displayName: principal.displayName,
      });
    },
  );

  fastify.patch(
    '/api/v1/users/me',
    {
      schema: {
        tags: ['users'],
        operationId: 'updateMe',
        body: updateProfileBodySchema,
        response: { 200: userSchema },
      },
    },
    async (request) => {
      const principal = await fastify.authenticate(request);
      const accessToken = request.headers.authorization?.slice('Bearer '.length);
      return fastify.authService.updateProfile(principal.userId, request.body.displayName, accessToken);
    },
  );
};

export default usersRoute;
