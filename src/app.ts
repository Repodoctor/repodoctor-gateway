import Fastify, { type FastifyInstance } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from '@fastify/type-provider-zod';
import sensible from '@fastify/sensible';
import type { AppConfig } from './config/env';
import { configPlugin } from './plugins/config.plugin';
import corsPlugin from './plugins/cors.plugin';
import rateLimitPlugin from './plugins/rate-limit.plugin';
import helmetPlugin from './plugins/helmet.plugin';
import swaggerPlugin from './plugins/swagger.plugin';
import requestIdPlugin from './plugins/request-id.plugin';
import tracingPlugin from './plugins/tracing.plugin';
import errorHandlerPlugin from './plugins/error-handler.plugin';
import serviceAuthPlugin from './plugins/service-auth.plugin';
import userAuthPlugin from './plugins/user-auth.plugin';
import v1Routes from './routes';

/** Builds (but does not start) a fully configured Fastify instance. */
export function buildApp(config: AppConfig): FastifyInstance {
  const fastify = Fastify({
    logger:
      config.nodeEnv === 'test'
        ? false
        : {
            level: config.nodeEnv === 'production' ? 'info' : 'debug',
          },
    genReqId: () => '',
  });

  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  const typed = fastify.withTypeProvider<ZodTypeProvider>();

  typed.register(configPlugin(config));
  typed.register(requestIdPlugin);
  typed.register(tracingPlugin);
  typed.register(helmetPlugin);
  typed.register(sensible);
  typed.register(corsPlugin);
  typed.register(rateLimitPlugin);
  typed.register(swaggerPlugin);
  typed.register(serviceAuthPlugin);
  typed.register(userAuthPlugin);
  typed.register(errorHandlerPlugin);
  typed.register(v1Routes);

  return typed;
}
