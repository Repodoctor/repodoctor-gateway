import { randomUUID } from 'node:crypto';
import type { OrgRole, Organization, OrganizationMember, User } from '@repodoctor/contracts';

export interface StoredUser extends User {
  passwordHash: string;
}

export interface StoredMembership {
  organizationId: string;
  userId: string;
  role: OrgRole;
  createdAt: string;
}

export class MemoryDirectory {
  readonly users = new Map<string, StoredUser>();
  readonly usersByEmail = new Map<string, string>();
  readonly organizations = new Map<string, Organization>();
  readonly organizationsBySlug = new Map<string, string>();
  readonly memberships = new Map<string, StoredMembership>();
  readonly refreshTokens = new Map<string, { userId: string; expiresAt: number }>();

  membershipKey(organizationId: string, userId: string): string {
    return `${organizationId}:${userId}`;
  }

  putUser(user: StoredUser): void {
    this.users.set(user.id, user);
    this.usersByEmail.set(user.email.toLowerCase(), user.id);
  }

  getUserByEmail(email: string): StoredUser | undefined {
    const id = this.usersByEmail.get(email.toLowerCase());
    return id ? this.users.get(id) : undefined;
  }

  putOrganization(org: Organization): void {
    this.organizations.set(org.id, org);
    this.organizationsBySlug.set(org.slug, org.id);
  }

  putMembership(membership: StoredMembership): void {
    this.memberships.set(this.membershipKey(membership.organizationId, membership.userId), membership);
  }

  membershipsForUser(userId: string): StoredMembership[] {
    return [...this.memberships.values()].filter((item) => item.userId === userId);
  }

  membersOf(organizationId: string): OrganizationMember[] {
    return [...this.memberships.values()]
      .filter((item) => item.organizationId === organizationId)
      .map((item) => {
        const user = this.users.get(item.userId);
        return {
          userId: item.userId,
          email: user?.email ?? '',
          displayName: user?.displayName ?? '',
          role: item.role,
          createdAt: item.createdAt,
        };
      });
  }
}

export function newId(): string {
  return randomUUID();
}
