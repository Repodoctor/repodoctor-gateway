import { randomUUID } from 'node:crypto';
import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';

const requestIdPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (request, reply) => {
    const requestId =
      (request.headers['x-request-id'] as string | undefined) ?? randomUUID();
    const correlationId =
      (request.headers['x-correlation-id'] as string | undefined) ?? requestId;
    request.requestId = requestId;
    request.correlationId = correlationId;
    reply.header('x-request-id', requestId);
    reply.header('x-correlation-id', correlationId);
    request.log = request.log.child({
      requestId,
      correlationId,
      service: fastify.config.serviceName,
    });
  });
};

export default fp(requestIdPlugin, { name: 'request-id' });
