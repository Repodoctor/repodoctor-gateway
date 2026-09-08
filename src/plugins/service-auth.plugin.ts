import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { UnauthenticatedError } from '@repodoctor/contracts';

const serviceAuthPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('verifyServiceToken', async (request: { headers: Record<string, unknown> }) => {
    const header = request.headers['x-service-token'];
    const token = Array.isArray(header) ? header[0] : header;
    if (token !== fastify.config.serviceAuthToken) {
      throw new UnauthenticatedError('Invalid service token');
    }
  });
};

export default fp(serviceAuthPlugin, { name: 'service-auth', dependencies: ['config'] });
