import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { readServiceToken, UnauthenticatedError, verifyServiceJwt } from '@repodoctor/contracts';

const serviceAuthPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('verifyServiceToken', async (request: { headers: Record<string, unknown> }) => {
    const token = readServiceToken(request.headers);
    if (!token) {
      throw new UnauthenticatedError('Invalid service token');
    }
    try {
      await verifyServiceJwt(token, fastify.config.internalServiceToken);
    } catch {
      throw new UnauthenticatedError('Invalid service token');
    }
  });
};

export default fp(serviceAuthPlugin, { name: 'service-auth', dependencies: ['config'] });
