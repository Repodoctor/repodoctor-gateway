import {
  AuthorizationError,
  assertOrgRole,
  conflict,
  notFound,
  type OrgRole,
  type Organization,
  type OrganizationMember,
} from '@repodoctor/contracts';
import { MemoryDirectory, newId } from './memory-store';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export class OrganizationService {
  constructor(private readonly directory: MemoryDirectory) {}

  async create(userId: string, input: { name: string; slug?: string }): Promise<Organization> {
    const slug = input.slug ?? slugify(input.name);
    if (this.directory.organizationsBySlug.has(slug)) {
      throw conflict('Organization slug already exists');
    }
    const now = new Date().toISOString();
    const org: Organization = {
      id: newId(),
      name: input.name,
      slug,
      createdAt: now,
      updatedAt: now,
    };
    this.directory.putOrganization(org);
    this.directory.putMembership({
      organizationId: org.id,
      userId,
      role: 'OWNER',
      createdAt: now,
    });
    return org;
  }

  async listForUser(userId: string): Promise<Array<Organization & { role: OrgRole }>> {
    return this.directory
      .membershipsForUser(userId)
      .map((membership) => {
        const org = this.directory.organizations.get(membership.organizationId);
        if (!org) return undefined;
        return { ...org, role: membership.role };
      })
      .filter((item): item is Organization & { role: OrgRole } => Boolean(item));
  }

  async get(userId: string, organizationId: string, required: OrgRole = 'VIEWER'): Promise<Organization> {
    const org = this.directory.organizations.get(organizationId);
    if (!org) throw notFound('Organization not found');
    const membership = this.directory.memberships.get(
      this.directory.membershipKey(organizationId, userId),
    );
    assertOrgRole(
      membership
        ? {
            organizationId: membership.organizationId,
            userId: membership.userId,
            role: membership.role,
            createdAt: membership.createdAt,
          }
        : undefined,
      required,
      organizationId,
    );
    return org;
  }

  async update(userId: string, organizationId: string, name: string): Promise<Organization> {
    const org = await this.get(userId, organizationId, 'ADMIN');
    org.name = name;
    org.updatedAt = new Date().toISOString();
    return org;
  }

  async listMembers(userId: string, organizationId: string): Promise<OrganizationMember[]> {
    await this.get(userId, organizationId, 'VIEWER');
    return this.directory.membersOf(organizationId);
  }

  async addMember(
    actorUserId: string,
    organizationId: string,
    target: { userId: string; role: OrgRole },
  ): Promise<OrganizationMember> {
    await this.get(actorUserId, organizationId, 'ADMIN');
    if (target.role === 'OWNER') {
      throw new AuthorizationError('Ownership transfer is not supported via member invite');
    }
    const now = new Date().toISOString();
    this.directory.putMembership({
      organizationId,
      userId: target.userId,
      role: target.role,
      createdAt: now,
    });
    const members = this.directory.membersOf(organizationId);
    const added = members.find((member) => member.userId === target.userId);
    if (!added) throw notFound('Member not found after insert');
    return added;
  }

  async updateMember(
    actorUserId: string,
    organizationId: string,
    targetUserId: string,
    role: OrgRole,
  ): Promise<OrganizationMember> {
    await this.get(actorUserId, organizationId, 'ADMIN');
    if (role === 'OWNER') {
      throw new AuthorizationError('Cannot assign OWNER via role update');
    }
    const key = this.directory.membershipKey(organizationId, targetUserId);
    const existing = this.directory.memberships.get(key);
    if (!existing) throw notFound('Member not found');
    if (existing.role === 'OWNER') {
      throw new AuthorizationError('Cannot change the organization owner role');
    }
    existing.role = role;
    return this.directory.membersOf(organizationId).find((member) => member.userId === targetUserId)!;
  }

  async removeMember(actorUserId: string, organizationId: string, targetUserId: string): Promise<void> {
    await this.get(actorUserId, organizationId, 'ADMIN');
    const key = this.directory.membershipKey(organizationId, targetUserId);
    const existing = this.directory.memberships.get(key);
    if (!existing) throw notFound('Member not found');
    if (existing.role === 'OWNER') {
      throw new AuthorizationError('Cannot remove the organization owner');
    }
    this.directory.memberships.delete(key);
  }
}
