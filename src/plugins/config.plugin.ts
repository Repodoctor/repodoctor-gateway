import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import type { AppConfig } from '../config/env';

/** Decorates the Fastify instance with the validated app configuration. */
export function configPlugin(config: AppConfig): FastifyPluginAsync {
  const plugin: FastifyPluginAsync = async (fastify) => {
    fastify.decorate('config', config);
  };
  return fp(plugin, { name: 'config' });
}
