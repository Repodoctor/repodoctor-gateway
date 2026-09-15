import { z } from 'zod';
export declare const workspaceRoleSchema: z.ZodEnum<{
    OWNER: "OWNER";
    ADMIN: "ADMIN";
    MEMBER: "MEMBER";
    VIEWER: "VIEWER";
}>;
export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;
export declare const repoPermissionSchema: z.ZodEnum<{
    ADMIN: "ADMIN";
    NONE: "NONE";
    VIEW: "VIEW";
    ANALYZE: "ANALYZE";
    MANAGE: "MANAGE";
}>;
export type RepoPermission = z.infer<typeof repoPermissionSchema>;
export declare const WORKSPACE_ROLE_RANK: Record<WorkspaceRole, number>;
export declare const REPO_PERMISSION_RANK: Record<RepoPermission, number>;
export declare function hasWorkspaceRole(actual: WorkspaceRole, required: WorkspaceRole): boolean;
export declare function hasRepoPermission(actual: RepoPermission, required: RepoPermission): boolean;
/** Default repository permission granted by a workspace role. */
export declare function defaultRepoPermissionForWorkspaceRole(role: WorkspaceRole): RepoPermission;
/** OWNER/ADMIN always have repo ADMIN. Everyone else uses an override or the workspace-role default. */
export declare function effectiveRepoPermission(role: WorkspaceRole, override?: RepoPermission | null): RepoPermission;
export declare const authPrincipalSchema: z.ZodObject<{
    userId: z.ZodString;
    email: z.ZodString;
    displayName: z.ZodString;
    sessionId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type AuthPrincipal = z.infer<typeof authPrincipalSchema>;
export declare const membershipSchema: z.ZodObject<{
    workspaceId: z.ZodString;
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
export declare function assertWorkspaceRole(membership: Membership | undefined, required: WorkspaceRole, workspaceId: string): Membership;
export declare function assertRepoPermission(permission: RepoPermission | undefined, required: RepoPermission): RepoPermission;
