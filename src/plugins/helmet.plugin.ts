import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';

const API_CSP = {
  useDefaults: false,
  directives: {
    defaultSrc: ["'none'"],
    baseUri: ["'none'"],
    objectSrc: ["'none'"],
    frameSrc: ["'none'"],
    scriptSrc: ["'none'"],
    frameAncestors: ["'none'"],
  },
};

const DOCS_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
].join('; ');

export default fp(async (fastify) => {
  await fastify.register(helmet, {
    contentSecurityPolicy: API_CSP,
    xFrameOptions: { action: 'deny' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
    },
  });

  fastify.addHook('onSend', async (request, reply) => {
    const path = request.url.split('?')[0] ?? '';
    if (path === '/docs' || path.startsWith('/docs/')) {
      reply.header('Content-Security-Policy', DOCS_CSP);
    }
  });
});
