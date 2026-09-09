import type {
  AddMemberResponse,
  OrgRole,
  Organization,
  OrganizationInvite,
  OrganizationInvitePreview,
  OrganizationMember,
  User,
} from '@repodoctor/contracts';
import { badRequest } from '@repodoctor/contracts';
import type { AppConfig } from '../config/env';
import { callService } from './upstream';

export class OrganizationService {
  private readonly ensuredUsers = new Map<string, { user: User; at: number }>();

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
    const key = `${input.id}:${input.email.toLowerCase()}`;
    const cached = this.ensuredUsers.get(key);
    if (cached && Date.now() - cached.at < 5 * 60_000) {
      return cached.user;
    }
    const { json } = await this.repo<User>('/internal/v1/users/ensure', {
      method: 'POST',
      body: input,
    });
    this.ensuredUsers.set(key, { user: json, at: Date.now() });
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
    const { json } = await this.repo<{ items?: Array<Organization & { role: OrgRole }> }>(
      `/internal/v1/organizations?userId=${encodeURIComponent(userId)}`,
    );
    return json.items ?? [];
  }

  async get(
    userId: string,
    organizationId: string,
    required: OrgRole = 'VIEWER',
  ): Promise<Organization & { role: OrgRole }> {
    const query = new URLSearchParams({ userId, required });
    const { json } = await this.repo<Organization & { role: OrgRole }>(
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
    await this.get(userId, organizationId, 'ADMIN');
    await this.purgeUpstream(this.config.scmServiceUrl, `/internal/organizations/${organizationId}`);
    await this.purgeUpstream(this.config.findingsServiceUrl, `/internal/organizations/${organizationId}`);
    await this.repo(`/internal/v1/organizations/${organizationId}?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
  }

  private async purgeUpstream(baseUrl: string, path: string): Promise<void> {
    if (!baseUrl.trim()) return;
    try {
      await callService({
        baseUrl,
        path,
        method: 'DELETE',
        config: this.config,
      });
    } catch {
      // Tenant rows may already be gone via Postgres CASCADE.
    }
  }

  async listMembers(userId: string, organizationId: string): Promise<OrganizationMember[]> {
    const { json } = await this.repo<{ items: OrganizationMember[] }>(
      `/internal/v1/organizations/${organizationId}/members?userId=${encodeURIComponent(userId)}`,
    );
    return json.items ?? [];
  }

  async addMember(
    actorUserId: string,
    organizationId: string,
    target: { email: string; role: OrgRole },
  ): Promise<AddMemberResponse> {
    const { json } = await this.repo<AddMemberResponse>(
      `/internal/v1/organizations/${organizationId}/members`,
      {
        method: 'POST',
        body: { userId: actorUserId, email: target.email, role: target.role },
      },
    );
    if (json.status === 'invited') {
      return {
        status: 'invited',
        invite: this.withSignupUrl(json.invite),
      };
    }
    return json;
  }

  async listInvites(userId: string, organizationId: string): Promise<OrganizationInvite[]> {
    const { json } = await this.repo<{ items: OrganizationInvite[] }>(
      `/internal/v1/organizations/${organizationId}/invites?userId=${encodeURIComponent(userId)}`,
    );
    return (json.items ?? []).map((invite) => this.withSignupUrl(invite));
  }

  async revokeInvite(userId: string, organizationId: string, inviteId: string): Promise<void> {
    await this.repo(
      `/internal/v1/organizations/${organizationId}/invites/${inviteId}?userId=${encodeURIComponent(userId)}`,
      { method: 'DELETE' },
    );
  }

  async getInvitePreview(token: string): Promise<OrganizationInvitePreview> {
    const { json } = await this.repo<OrganizationInvitePreview>(
      `/internal/v1/invites/${encodeURIComponent(token)}`,
    );
    return json;
  }

  async acceptInvite(userId: string, token: string): Promise<OrganizationMember> {
    const { json } = await this.repo<OrganizationMember>(`/internal/v1/invites/${encodeURIComponent(token)}/accept`, {
      method: 'POST',
      body: { userId },
    });
    return json;
  }

  private withSignupUrl(invite: OrganizationInvite): OrganizationInvite {
    const origin = dashboardOrigin(this.config);
    return {
      id: invite.id,
      organizationId: invite.organizationId,
      email: invite.email,
      role: invite.role,
      signupUrl: `${origin}/signup?invite=${encodeURIComponent(invite.token ?? '')}`,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    };
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

function dashboardOrigin(config: AppConfig): string {
  const configured = config.dashboardPublicUrl.trim().replace(/\/+$/, '');
  if (configured) return configured;
  const httpsOrigin = config.corsOrigins.find((origin) => origin.startsWith('https://'));
  return httpsOrigin ?? 'https://repodoctor.dev';
}
