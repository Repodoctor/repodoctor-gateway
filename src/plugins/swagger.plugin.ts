import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { jsonSchemaTransform } from '@fastify/type-provider-zod';

export default fp(async (fastify) => {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'RepoDoctor Gateway',
        description: 'Public API gateway: authentication, authorization, tenant isolation, and API aggregation.',
        version: '0.1.0',
      },
      servers: [{ url: '/', description: 'current host' }],
    },
    transform: jsonSchemaTransform,
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });
});
