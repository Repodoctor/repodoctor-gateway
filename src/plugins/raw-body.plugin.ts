import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: Buffer;
  }
}

const rawBodyPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addContentTypeParser('application/json', { parseAs: 'buffer' }, (request: FastifyRequest, body, done) => {
    const buffer = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
    request.rawBody = buffer;
    if (buffer.length === 0) {
      done(null, {});
      return;
    }
    try {
      done(null, JSON.parse(buffer.toString('utf8')) as unknown);
    } catch (error) {
      done(error as Error, undefined);
    }
  });
};

export default fp(rawBodyPlugin, { name: 'raw-body' });
