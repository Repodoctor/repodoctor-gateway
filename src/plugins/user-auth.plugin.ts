import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { UnauthenticatedError, enterRlsContext, type AuthPrincipal } from '@repodoctor/contracts';
import { createAuthService, type AuthService } from '../services/auth.service';
import { WorkspaceService } from '../services/workspace.service';

declare module 'fastify' {
  interface FastifyInstance {
    authService: AuthService;
    workspaceService: WorkspaceService;
    authenticate: (request: FastifyRequest) => Promise<AuthPrincipal>;
  }
}

const userAuthPlugin: FastifyPluginAsync = async (fastify) => {
  const workspaceService = new WorkspaceService(fastify.config);
  const authService = createAuthService(fastify.config, workspaceService);

  fastify.decorate('authService', authService);
  fastify.decorate('workspaceService', workspaceService);
  fastify.decorate('authenticate', async (request: FastifyRequest) => {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthenticatedError('Missing bearer token');
    }
    const token = header.slice('Bearer '.length);
    const user = await authService.userFromAccessToken(token);
    const displayName = (user.displayName || user.email).slice(0, 80);
    enterRlsContext({ mode: 'app', userId: user.id });
    await workspaceService.ensureUser({
      id: user.id,
      email: user.email,
      displayName,
    });
    const principal: AuthPrincipal = {
      userId: user.id,
      email: user.email,
      displayName,
    };
    request.auth = principal;
    request.log = request.log.child({ userId: principal.userId });
    return principal;
  });

  fastify.addHook('onReady', async () => {
    try {
      await authService.warmJwks?.();
    } catch (error) {
      fastify.log.warn({ err: error }, 'JWKS warmup failed; the first authenticated request will fetch keys');
    }
  });
};

export default fp(userAuthPlugin, { name: 'user-auth', dependencies: ['config'] });
