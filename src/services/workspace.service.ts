import type {
  AddMemberResponse,
  WorkspaceRole,
  Workspace,
  WorkspaceInvite,
  WorkspaceInvitePreview,
  WorkspaceMember,
  RepoPermission,
  Repository,
  RepositoryAccess,
  RepositoryAccessGrant,
  RepositoryWithPermission,
  User,
} from '@repodoctor/contracts';
import {
  assertRepoPermission,
  badRequest,
  effectiveRepoPermission,
  FREE_PLAN,
  hasRepoPermission,
  notFound,
  planLimit,
} from '@repodoctor/contracts';
import type { AppConfig } from '../config/env';
import { callService } from './upstream';
import { deleteAuthUser, inviteAuthUser } from './supabase-admin';

export class WorkspaceService {
  private readonly ensuredUsers = new Map<string, { user: User; at: number }>();
  private readonly ensuringUsers = new Map<string, Promise<User>>();

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

  async ensureUser(input: {
    id: string;
    email: string;
    displayName: string;
    syncDisplayName?: boolean;
  }): Promise<User> {
    const key = `${input.id}:${input.email.toLowerCase()}`;
    if (!input.syncDisplayName) {
      const cached = this.ensuredUsers.get(key);
      if (cached && Date.now() - cached.at < 5 * 60_000) {
        return cached.user;
      }
      const inflight = this.ensuringUsers.get(key);
      if (inflight) return inflight;
    }
    const pending = this.repo<User>('/internal/v1/users/ensure', {
      method: 'POST',
      body: input,
    }).then(({ json }) => {
      this.ensuredUsers.set(key, { user: json, at: Date.now() });
      return json;
    });
    this.ensuringUsers.set(key, pending);
    try {
      return await pending;
    } finally {
      this.ensuringUsers.delete(key);
    }
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

  async create(userId: string, input: { name: string; slug?: string }): Promise<Workspace> {
    await this.assertOwnedWorkspaceLimit(userId);
    const { json } = await this.repo<Workspace & { role: WorkspaceRole }>('/internal/v1/workspaces', {
      method: 'POST',
      body: { userId, name: input.name, slug: input.slug },
    });
    return json;
  }

  async assertOwnedWorkspaceLimit(userId: string): Promise<void> {
    const owned = (await this.listForUser(userId)).filter((org) => org.role === 'OWNER');
    if (owned.length >= FREE_PLAN.maxOwnedWorkspaces) {
      throw planLimit(
        `Free plan allows ${FREE_PLAN.maxOwnedWorkspaces} workspaces. Paid plans will be available later.`,
        { plan: FREE_PLAN.id, limit: 'workspaces', max: FREE_PLAN.maxOwnedWorkspaces },
      );
    }
  }

  async countRepositories(workspaceId: string): Promise<number> {
    const { json } = await this.repo<{ total?: number; items?: unknown[] }>(
      `/api/v1/repositories?workspaceId=${encodeURIComponent(workspaceId)}&page=1&pageSize=1`,
    );
    return json.total ?? json.items?.length ?? 0;
  }

  async assertRepositoryLimit(workspaceId: string): Promise<void> {
    const count = await this.countRepositories(workspaceId);
    if (count >= FREE_PLAN.maxRepositoriesPerWorkspace) {
      throw planLimit(
        `Free plan allows ${FREE_PLAN.maxRepositoriesPerWorkspace} repositories per workspace.`,
        {
          plan: FREE_PLAN.id,
          limit: 'repositories',
          max: FREE_PLAN.maxRepositoriesPerWorkspace,
          current: count,
        },
      );
    }
  }

  async assertMemberLimit(actorUserId: string, workspaceId: string, invitingNewUser: boolean): Promise<void> {
    const members = await this.listMembers(actorUserId, workspaceId);
    if (members.length >= FREE_PLAN.maxMembersPerWorkspace) {
      throw planLimit(
        `Free plan allows ${FREE_PLAN.maxMembersPerWorkspace} members per workspace.`,
        { plan: FREE_PLAN.id, limit: 'members', max: FREE_PLAN.maxMembersPerWorkspace },
      );
    }
    if (!invitingNewUser) return;
    const invites = await this.listInvites(actorUserId, workspaceId);
    if (invites.length >= FREE_PLAN.maxPendingInvitesPerWorkspace) {
      throw planLimit(
        `Free plan allows ${FREE_PLAN.maxPendingInvitesPerWorkspace} pending invites per workspace.`,
        { plan: FREE_PLAN.id, limit: 'invites', max: FREE_PLAN.maxPendingInvitesPerWorkspace },
      );
    }
  }

  async assertScmInstallationLimit(workspaceId: string, externalInstallationId?: string): Promise<void> {
    const { json } = await callService<{ items: Array<{ externalInstallationId: string }> }>({
      baseUrl: this.config.scmServiceUrl,
      path: `/internal/installations?workspaceId=${encodeURIComponent(workspaceId)}`,
      config: this.config,
    });
    const items = json.items ?? [];
    const reconnecting = Boolean(
      externalInstallationId && items.some((item) => item.externalInstallationId === externalInstallationId),
    );
    if (!reconnecting && items.length >= FREE_PLAN.maxScmInstallationsPerWorkspace) {
      throw planLimit(
        `Free plan allows ${FREE_PLAN.maxScmInstallationsPerWorkspace} source-control installations per workspace.`,
        { plan: FREE_PLAN.id, limit: 'scmInstallations', max: FREE_PLAN.maxScmInstallationsPerWorkspace },
      );
    }
  }

  async assertManualAnalysisLimit(workspaceId: string, repositoryId: string): Promise<void> {
    const { json } = await this.repo<{ items?: Array<{ trigger: string; createdAt: string }> }>(
      `/api/v1/analysis?workspaceId=${encodeURIComponent(workspaceId)}&repositoryId=${encodeURIComponent(repositoryId)}`,
    );
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const used = (json.items ?? []).filter(
      (item) => item.trigger === 'MANUAL' && new Date(item.createdAt).getTime() >= start.getTime(),
    ).length;
    if (used >= FREE_PLAN.maxManualAnalysisRunsPerRepositoryPerDay) {
      throw planLimit(
        `Free plan allows ${FREE_PLAN.maxManualAnalysisRunsPerRepositoryPerDay} manual analysis runs per repository per day.`,
        {
          plan: FREE_PLAN.id,
          limit: 'manualAnalysis',
          max: FREE_PLAN.maxManualAnalysisRunsPerRepositoryPerDay,
        },
      );
    }
  }

  async listForUser(userId: string): Promise<Array<Workspace & { role: WorkspaceRole }>> {
    const { json } = await this.repo<{ items?: Array<Workspace & { role: WorkspaceRole }> }>(
      `/internal/v1/workspaces?userId=${encodeURIComponent(userId)}`,
    );
    return json.items ?? [];
  }

  async get(
    userId: string,
    workspaceId: string,
    required: WorkspaceRole = 'VIEWER',
  ): Promise<Workspace & { role: WorkspaceRole }> {
    const query = new URLSearchParams({ userId, required });
    const { json } = await this.repo<Workspace & { role: WorkspaceRole }>(
      `/internal/v1/workspaces/${workspaceId}?${query.toString()}`,
    );
    return json;
  }

  async update(userId: string, workspaceId: string, name: string): Promise<Workspace> {
    if (!name) throw badRequest('name is required');
    const { json } = await this.repo<Workspace>(`/internal/v1/workspaces/${workspaceId}`, {
      method: 'PATCH',
      body: { userId, name },
    });
    return json;
  }

  async delete(userId: string, workspaceId: string): Promise<void> {
    await this.get(userId, workspaceId, 'ADMIN');
    await callService({
      baseUrl: this.config.scmServiceUrl,
      path: `/internal/workspaces/${workspaceId}`,
      method: 'DELETE',
      config: this.config,
    });
    await this.purgeUpstream(this.config.findingsServiceUrl, `/internal/workspaces/${workspaceId}`);
    await this.repo(`/internal/v1/workspaces/${workspaceId}?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
  }

  async disconnectInstallation(userId: string, workspaceId: string, installationId: string): Promise<void> {
    await this.get(userId, workspaceId, 'ADMIN');
    await callService({
      baseUrl: this.config.scmServiceUrl,
      path: `/internal/installations/${installationId}?workspaceId=${workspaceId}`,
      method: 'DELETE',
      config: this.config,
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

  async listMembers(userId: string, workspaceId: string): Promise<WorkspaceMember[]> {
    const { json } = await this.repo<{ items: WorkspaceMember[] }>(
      `/internal/v1/workspaces/${workspaceId}/members?userId=${encodeURIComponent(userId)}`,
    );
    return json.items ?? [];
  }

  async addMember(
    actorUserId: string,
    workspaceId: string,
    target: { email: string; role: WorkspaceRole },
  ): Promise<AddMemberResponse> {
    const existing = await this.getUserByEmail(target.email);
    await this.assertMemberLimit(actorUserId, workspaceId, !existing);
    const { json } = await this.repo<AddMemberResponse>(
      `/internal/v1/workspaces/${workspaceId}/members`,
      {
        method: 'POST',
        body: { userId: actorUserId, email: target.email, role: target.role },
      },
    );
    if (json.status === 'invited') {
      const invite = this.withSignupUrl(json.invite);
      await this.sendInviteEmail(invite.email, invite.signupUrl ?? '');
      return {
        status: 'invited',
        invite,
      };
    }
    return json;
  }

  async listInvites(userId: string, workspaceId: string): Promise<WorkspaceInvite[]> {
    const { json } = await this.repo<{ items: WorkspaceInvite[] }>(
      `/internal/v1/workspaces/${workspaceId}/invites?userId=${encodeURIComponent(userId)}`,
    );
    return (json.items ?? []).map((invite) => this.withSignupUrl(invite));
  }

  async revokeInvite(userId: string, workspaceId: string, inviteId: string): Promise<void> {
    await this.repo(
      `/internal/v1/workspaces/${workspaceId}/invites/${inviteId}?userId=${encodeURIComponent(userId)}`,
      { method: 'DELETE' },
    );
  }

  async getInvitePreview(token: string): Promise<WorkspaceInvitePreview> {
    const { json } = await this.repo<WorkspaceInvitePreview>(
      `/internal/v1/invites/${encodeURIComponent(token)}`,
    );
    return json;
  }

  async acceptInvite(userId: string, token: string): Promise<WorkspaceMember> {
    const { json } = await this.repo<WorkspaceMember>(`/internal/v1/invites/${encodeURIComponent(token)}/accept`, {
      method: 'POST',
      body: { userId },
    });
    return json;
  }

  private withSignupUrl(invite: WorkspaceInvite): WorkspaceInvite {
    const origin = dashboardOrigin(this.config);
    return {
      id: invite.id,
      workspaceId: invite.workspaceId,
      email: invite.email,
      role: invite.role,
      signupUrl: `${origin}/signup?invite=${encodeURIComponent(invite.token ?? '')}`,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    };
  }

  async updateMember(
    actorUserId: string,
    workspaceId: string,
    targetUserId: string,
    role: WorkspaceRole,
  ): Promise<WorkspaceMember> {
    const { json } = await this.repo<WorkspaceMember>(
      `/internal/v1/workspaces/${workspaceId}/members/${targetUserId}`,
      {
        method: 'PATCH',
        body: { userId: actorUserId, role },
      },
    );
    return json;
  }

  async removeMember(actorUserId: string, workspaceId: string, targetUserId: string): Promise<void> {
    await this.repo(
      `/internal/v1/workspaces/${workspaceId}/members/${targetUserId}?userId=${encodeURIComponent(actorUserId)}`,
      { method: 'DELETE' },
    );
    try {
      await this.repo(
        `/internal/v1/repository-access?workspaceId=${encodeURIComponent(workspaceId)}&userId=${encodeURIComponent(targetUserId)}`,
        { method: 'DELETE' },
      );
    } catch {
      // Access rows may already be gone.
    }
  }

  async deleteAccount(userId: string): Promise<{ deletedWorkspaceIds: string[] }> {
    const orgs = await this.listForUser(userId);
    const deletedWorkspaceIds: string[] = [];
    for (const org of orgs) {
      if (org.role === 'OWNER') {
        await this.delete(userId, org.id);
        deletedWorkspaceIds.push(org.id);
      }
    }
    await this.repo(`/internal/v1/users/${userId}`, { method: 'DELETE' });
    await this.deleteGoTrueUser(userId);
    return { deletedWorkspaceIds };
  }

  private async sendInviteEmail(email: string, signupUrl: string): Promise<void> {
    if (this.config.authProvider !== 'supabase' || !this.config.supabaseServiceRoleKey || !this.config.supabaseUrl) {
      return;
    }
    try {
      const result = await inviteAuthUser({
        supabaseUrl: this.config.supabaseUrl,
        serviceRoleKey: this.config.supabaseServiceRoleKey,
        email,
        redirectTo: signupUrl,
      });
      if (result.rateLimited) {
        return;
      }
    } catch {
      // Org invite is already stored; the dashboard copies the signup link.
    }
  }

  private async deleteGoTrueUser(userId: string): Promise<void> {
    if (this.config.authProvider !== 'supabase' || !this.config.supabaseServiceRoleKey || !this.config.supabaseUrl) {
      return;
    }
    await deleteAuthUser({
      supabaseUrl: this.config.supabaseUrl,
      serviceRoleKey: this.config.supabaseServiceRoleKey,
      userId,
    });
  }

  async listRepositoryAccess(repositoryId: string): Promise<RepositoryAccess[]> {
    const { json } = await this.repo<{ items: RepositoryAccess[] }>(
      `/internal/v1/repositories/${repositoryId}/access`,
    );
    return json.items ?? [];
  }

  async listRepositoryAccessForUser(userId: string, workspaceId?: string): Promise<RepositoryAccess[]> {
    const query = new URLSearchParams({ userId });
    if (workspaceId) query.set('workspaceId', workspaceId);
    const { json } = await this.repo<{ items: RepositoryAccess[] }>(
      `/internal/v1/repository-access?${query.toString()}`,
    );
    return json.items ?? [];
  }

  async upsertRepositoryAccess(
    repositoryId: string,
    userId: string,
    permission: RepoPermission,
  ): Promise<RepositoryAccess> {
    const { json } = await this.repo<RepositoryAccess>(
      `/internal/v1/repositories/${repositoryId}/access/${userId}`,
      { method: 'PUT', body: { permission } },
    );
    return json;
  }

  async deleteRepositoryAccess(repositoryId: string, userId: string): Promise<void> {
    await this.repo(`/internal/v1/repositories/${repositoryId}/access/${userId}`, { method: 'DELETE' });
  }

  async permissionFor(userId: string, workspaceId: string, repositoryId: string): Promise<RepoPermission> {
    const org = await this.get(userId, workspaceId, 'VIEWER');
    const overrides = await this.listRepositoryAccessForUser(userId, workspaceId);
    const override = overrides.find((item) => item.repositoryId === repositoryId);
    return effectiveRepoPermission(org.role, override?.permission);
  }

  async assertRepoAccess(
    userId: string,
    workspaceId: string,
    repositoryId: string,
    required: RepoPermission,
  ): Promise<RepoPermission> {
    return assertRepoPermission(await this.permissionFor(userId, workspaceId, repositoryId), required);
  }

  async withRepoPermissions(userId: string, items: Repository[]): Promise<RepositoryWithPermission[]> {
    if (items.length === 0) return [];
    const orgs = await this.listForUser(userId);
    const roleByOrg = new Map(orgs.map((org) => [org.id, org.role]));
    const overrides = await this.listRepositoryAccessForUser(userId);
    const overrideByRepo = new Map(overrides.map((item) => [item.repositoryId, item.permission]));
    return items.flatMap((item) => {
      const role = roleByOrg.get(item.workspaceId);
      if (!role) return [];
      const permission = effectiveRepoPermission(role, overrideByRepo.get(item.id));
      if (!hasRepoPermission(permission, 'VIEW')) return [];
      return [{ ...item, permission }];
    });
  }

  async listAccessGrants(actorUserId: string, repository: Repository): Promise<RepositoryAccessGrant[]> {
    await this.assertRepoAccess(actorUserId, repository.workspaceId, repository.id, 'ADMIN');
    const members = await this.listMembers(actorUserId, repository.workspaceId);
    const overrides = await this.listRepositoryAccess(repository.id);
    const overrideByUser = new Map(overrides.map((item) => [item.userId, item.permission]));
    return members.map((member) => {
      const override = overrideByUser.get(member.userId);
      const permission = effectiveRepoPermission(member.role, override);
      const source = member.role === 'OWNER' || member.role === 'ADMIN' || !override ? 'role' : 'override';
      return {
        userId: member.userId,
        email: member.email,
        displayName: member.displayName,
        role: member.role,
        permission,
        source,
      };
    });
  }

  async setAccessGrant(
    actorUserId: string,
    repository: Repository,
    targetUserId: string,
    permission: RepoPermission,
  ): Promise<RepositoryAccessGrant> {
    await this.assertRepoAccess(actorUserId, repository.workspaceId, repository.id, 'ADMIN');
    const members = await this.listMembers(actorUserId, repository.workspaceId);
    const target = members.find((member) => member.userId === targetUserId);
    if (!target) throw notFound('Member not found');
    if (target.role === 'OWNER' || target.role === 'ADMIN') {
      throw badRequest('Workspace owners and admins always have repository ADMIN');
    }
    await this.upsertRepositoryAccess(repository.id, targetUserId, permission);
    return {
      userId: target.userId,
      email: target.email,
      displayName: target.displayName,
      role: target.role,
      permission: effectiveRepoPermission(target.role, permission),
      source: 'override',
    };
  }

  async clearAccessGrant(actorUserId: string, repository: Repository, targetUserId: string): Promise<void> {
    await this.assertRepoAccess(actorUserId, repository.workspaceId, repository.id, 'ADMIN');
    await this.deleteRepositoryAccess(repository.id, targetUserId);
  }
}

function dashboardOrigin(config: AppConfig): string {
  const configured = config.dashboardPublicUrl.trim().replace(/\/+$/, '');
  if (configured) return configured;
  const httpsOrigin = config.corsOrigins.find((origin) => origin.startsWith('https://'));
  return httpsOrigin ?? 'https://repodoctor.dev';
}
