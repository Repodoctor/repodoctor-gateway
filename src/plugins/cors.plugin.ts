import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import type { FastifyPluginAsync } from 'fastify';

const corsPlugin: FastifyPluginAsync = async (fastify) => {
  const allowed = new Set(fastify.config.corsOrigins);
  await fastify.register(cors, {
    origin: (origin, callback) => {
      if (!origin || allowed.has(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-correlation-id', 'x-service-token'],
  });
};

export default fp(corsPlugin, { name: 'cors', dependencies: ['config'] });
