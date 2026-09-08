import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { UnauthenticatedError, type AuthPrincipal } from '@repodoctor/contracts';
import { MemoryDirectory } from '../services/memory-store';
import { createAuthService, type AuthService } from '../services/auth.service';
import { OrganizationService } from '../services/organization.service';

declare module 'fastify' {
  interface FastifyInstance {
    directory: MemoryDirectory;
    authService: AuthService;
    organizationService: OrganizationService;
    authenticate: (request: FastifyRequest) => Promise<AuthPrincipal>;
  }
}

const userAuthPlugin: FastifyPluginAsync = async (fastify) => {
  const directory = new MemoryDirectory();
  const authService = createAuthService(fastify.config, directory);
  const organizationService = new OrganizationService(directory);

  fastify.decorate('directory', directory);
  fastify.decorate('authService', authService);
  fastify.decorate('organizationService', organizationService);
  fastify.decorate('authenticate', async (request: FastifyRequest) => {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthenticatedError('Missing bearer token');
    }
    const token = header.slice('Bearer '.length);
    const user = await authService.userFromAccessToken(token);
    const principal: AuthPrincipal = {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
    };
    request.auth = principal;
    request.log = request.log.child({ userId: principal.userId });
    return principal;
  });
};

export default fp(userAuthPlugin, { name: 'user-auth', dependencies: ['config'] });
