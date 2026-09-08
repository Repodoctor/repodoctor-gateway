import type {
  OrgRole,
  Organization,
  OrganizationMember,
  User,
} from '@repodoctor/contracts';
import { badRequest } from '@repodoctor/contracts';
import type { AppConfig } from '../config/env';
import { callService } from './upstream';

export class OrganizationService {
  constructor(private readonly config: AppConfig) {}

  private repo<T>(path: string, init: { method?: string; body?: unknown } = {}) {
    return callService<T>({
      baseUrl: this.config.repositoryServiceUrl,
      path,
      method: init.method,
      body: init.body,
      config: this.config,
    });
  }

  async ensureUser(input: { id: string; email: string; displayName: string }): Promise<User> {
    const { json } = await this.repo<User>('/internal/v1/users/ensure', {
      method: 'POST',
      body: input,
    });
    return json;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { json } = await this.repo<{ user?: User }>(
      `/internal/v1/users?email=${encodeURIComponent(email)}`,
    );
    return json.user;
  }

  async getUser(userId: string): Promise<User | undefined> {
    const { json } = await this.repo<{ user?: User }>(`/internal/v1/users/${userId}`);
    return json.user;
  }

  async create(userId: string, input: { name: string; slug?: string }): Promise<Organization> {
    const { json } = await this.repo<Organization & { role: OrgRole }>('/internal/v1/organizations', {
      method: 'POST',
      body: { userId, name: input.name, slug: input.slug },
    });
    return json;
  }

  async listForUser(userId: string): Promise<Array<Organization & { role: OrgRole }>> {
    const { json } = await this.repo<{ items: Array<Organization & { role: OrgRole }> }>(
      `/internal/v1/organizations?userId=${encodeURIComponent(userId)}`,
    );
    return json.items;
  }

  async get(userId: string, organizationId: string, required: OrgRole = 'VIEWER'): Promise<Organization> {
    const query = new URLSearchParams({ userId, required });
    const { json } = await this.repo<Organization>(
      `/internal/v1/organizations/${organizationId}?${query.toString()}`,
    );
    return json;
  }

  async update(userId: string, organizationId: string, name: string): Promise<Organization> {
    if (!name) throw badRequest('name is required');
    const { json } = await this.repo<Organization>(`/internal/v1/organizations/${organizationId}`, {
      method: 'PATCH',
      body: { userId, name },
    });
    return json;
  }

  async delete(userId: string, organizationId: string): Promise<void> {
    await this.repo(`/internal/v1/organizations/${organizationId}?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
  }

  async listMembers(userId: string, organizationId: string): Promise<OrganizationMember[]> {
    const { json } = await this.repo<{ items: OrganizationMember[] }>(
      `/internal/v1/organizations/${organizationId}/members?userId=${encodeURIComponent(userId)}`,
    );
    return json.items;
  }

  async addMember(
    actorUserId: string,
    organizationId: string,
    target: { email: string; role: OrgRole },
  ): Promise<OrganizationMember> {
    const { json } = await this.repo<OrganizationMember>(
      `/internal/v1/organizations/${organizationId}/members`,
      {
        method: 'POST',
        body: { userId: actorUserId, email: target.email, role: target.role },
      },
    );
    return json;
  }

  async updateMember(
    actorUserId: string,
    organizationId: string,
    targetUserId: string,
    role: OrgRole,
  ): Promise<OrganizationMember> {
    const { json } = await this.repo<OrganizationMember>(
      `/internal/v1/organizations/${organizationId}/members/${targetUserId}`,
      {
        method: 'PATCH',
        body: { userId: actorUserId, role },
      },
    );
    return json;
  }

  async removeMember(actorUserId: string, organizationId: string, targetUserId: string): Promise<void> {
    await this.repo(
      `/internal/v1/organizations/${organizationId}/members/${targetUserId}?userId=${encodeURIComponent(actorUserId)}`,
      { method: 'DELETE' },
    );
  }
}
