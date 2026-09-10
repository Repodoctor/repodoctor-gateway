import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { z } from 'zod';
import { badRequest, scmProviderSchema } from '@repodoctor/contracts';
import { callService } from '../services/upstream';

function webhookForwardHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string> {
  const forwarded: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (
      lower.startsWith('x-github-') ||
      lower.startsWith('x-hub-') ||
      lower.startsWith('x-gitlab-') ||
      lower.startsWith('x-vss-') ||
      lower.startsWith('x-event') ||
      lower === 'x-hook-uuid' ||
      lower === 'x-event-key'
    ) {
      const resolved = Array.isArray(value) ? value[0] : value;
      if (resolved) forwarded[lower] = resolved;
    }
  }
  return forwarded;
}

const webhookRoute: FastifyPluginAsyncZod = async (fastify) => {
  // Public SCM webhook ingress; forwards the raw body and provider headers to SCM.
  fastify.post(
    '/api/v1/webhooks/:provider',
    {
      schema: {
        tags: ['webhooks'],
        params: z.object({ provider: scmProviderSchema }),
        response: { 202: z.object({ duplicate: z.boolean(), processed: z.boolean() }) },
      },
    },
    async (request, reply) => {
      if (!request.rawBody) {
        throw badRequest('Missing raw webhook body');
      }
      const forwarded = await callService<{ duplicate: boolean; processed: boolean }>({
        baseUrl: fastify.config.scmServiceUrl,
        path: `/internal/webhooks/${request.params.provider}`,
        method: 'POST',
        config: fastify.config,
        correlationId: request.correlationId,
        rawBody: request.rawBody,
        headers: webhookForwardHeaders(request.headers),
      });
      reply.code(202);
      return forwarded.json;
    },
  );
};

export default webhookRoute;
