import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { z } from 'zod';
import { badRequest } from '@repodoctor/contracts';
import { callService } from '../services/upstream';

const webhookRoute: FastifyPluginAsyncZod = async (fastify) => {
  // Public GitHub webhook ingress; forwards the raw body to SCM for HMAC verification.
  fastify.post(
    '/api/v1/webhooks/github',
    {
      schema: {
        tags: ['webhooks'],
        response: { 202: z.object({ duplicate: z.boolean(), processed: z.boolean() }) },
      },
    },
    async (request, reply) => {
      if (!request.rawBody) {
        throw badRequest('Missing raw webhook body');
      }
      const signature = request.headers['x-hub-signature-256'];
      const eventName = request.headers['x-github-event'];
      const deliveryId = request.headers['x-github-delivery'];
      const forwarded = await callService<{ duplicate: boolean; processed: boolean }>({
        baseUrl: fastify.config.scmServiceUrl,
        path: '/internal/webhooks/github',
        method: 'POST',
        config: fastify.config,
        correlationId: request.correlationId,
        rawBody: request.rawBody,
        headers: {
          'x-hub-signature-256': Array.isArray(signature) ? signature[0]! : (signature ?? ''),
          'x-github-event': Array.isArray(eventName) ? eventName[0]! : (eventName ?? ''),
          'x-github-delivery': Array.isArray(deliveryId) ? deliveryId[0]! : (deliveryId ?? ''),
        },
      });
      reply.code(202);
      return forwarded.json;
    },
  );
};

export default webhookRoute;
