import { z } from 'zod';
export declare const orgRoleSchema: z.ZodEnum<{
    OWNER: "OWNER";
    ADMIN: "ADMIN";
    MEMBER: "MEMBER";
    VIEWER: "VIEWER";
}>;
export type OrgRole = z.infer<typeof orgRoleSchema>;
export declare const repoPermissionSchema: z.ZodEnum<{
    ADMIN: "ADMIN";
    VIEW: "VIEW";
    ANALYZE: "ANALYZE";
    MANAGE: "MANAGE";
}>;
export type RepoPermission = z.infer<typeof repoPermissionSchema>;
export declare const ORG_ROLE_RANK: Record<OrgRole, number>;
export declare const REPO_PERMISSION_RANK: Record<RepoPermission, number>;
export declare function hasOrgRole(actual: OrgRole, required: OrgRole): boolean;
export declare function hasRepoPermission(actual: RepoPermission, required: RepoPermission): boolean;
/** Default repository permission granted by an organization role. */
export declare function defaultRepoPermissionForOrgRole(role: OrgRole): RepoPermission;
/** OWNER/ADMIN always have repo ADMIN. Everyone else uses an override or the org-role default. */
export declare function effectiveRepoPermission(role: OrgRole, override?: RepoPermission | null): RepoPermission;
export declare const authPrincipalSchema: z.ZodObject<{
    userId: z.ZodString;
    email: z.ZodString;
    displayName: z.ZodString;
    sessionId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type AuthPrincipal = z.infer<typeof authPrincipalSchema>;
export declare const membershipSchema: z.ZodObject<{
    organizationId: z.ZodString;
    userId: z.ZodString;
    role: z.ZodEnum<{
        OWNER: "OWNER";
        ADMIN: "ADMIN";
        MEMBER: "MEMBER";
        VIEWER: "VIEWER";
    }>;
    createdAt: z.ZodString;
}, z.core.$strip>;
export type Membership = z.infer<typeof membershipSchema>;
export declare class AuthorizationError extends Error {
    readonly statusCode = 403;
    readonly code = "FORBIDDEN";
    constructor(message?: string);
}
export declare class UnauthenticatedError extends Error {
    readonly statusCode = 401;
    readonly code = "UNAUTHENTICATED";
    constructor(message?: string);
}
export declare function assertOrgRole(membership: Membership | undefined, required: OrgRole, organizationId: string): Membership;
export declare function assertRepoPermission(permission: RepoPermission | undefined, required: RepoPermission): RepoPermission;
