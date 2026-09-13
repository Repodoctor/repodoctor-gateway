import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import healthRoute from './health.route';
import authRoute from './auth.route';
import usersRoute from './users.route';
import organizationsRoute from './organizations.route';
import webhookRoute from './webhooks.route';
import repositoriesRoute from './repositories.route';
import findingsGatewayRoute from './findings.route';

const v1Routes: FastifyPluginAsyncZod = async (fastify) => {
  await fastify.register(healthRoute);

  await fastify.register(authRoute);
  await fastify.register(usersRoute);
  await fastify.register(organizationsRoute);
  await fastify.register(webhookRoute);
  await fastify.register(repositoriesRoute);
  await fastify.register(findingsGatewayRoute);
};

export default v1Routes;
