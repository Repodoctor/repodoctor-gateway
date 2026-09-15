"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnauthenticatedError = exports.AuthorizationError = exports.membershipSchema = exports.authPrincipalSchema = exports.REPO_PERMISSION_RANK = exports.WORKSPACE_ROLE_RANK = exports.repoPermissionSchema = exports.workspaceRoleSchema = void 0;
exports.hasWorkspaceRole = hasWorkspaceRole;
exports.hasRepoPermission = hasRepoPermission;
exports.defaultRepoPermissionForWorkspaceRole = defaultRepoPermissionForWorkspaceRole;
exports.effectiveRepoPermission = effectiveRepoPermission;
exports.assertWorkspaceRole = assertWorkspaceRole;
exports.assertRepoPermission = assertRepoPermission;
const zod_1 = require("zod");
exports.workspaceRoleSchema = zod_1.z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);
exports.repoPermissionSchema = zod_1.z.enum(['NONE', 'VIEW', 'ANALYZE', 'MANAGE', 'ADMIN']);
exports.WORKSPACE_ROLE_RANK = {
    VIEWER: 0,
    MEMBER: 1,
    ADMIN: 2,
    OWNER: 3,
};
exports.REPO_PERMISSION_RANK = {
    NONE: -1,
    VIEW: 0,
    ANALYZE: 1,
    MANAGE: 2,
    ADMIN: 3,
};
function hasWorkspaceRole(actual, required) {
    return exports.WORKSPACE_ROLE_RANK[actual] >= exports.WORKSPACE_ROLE_RANK[required];
}
function hasRepoPermission(actual, required) {
    return exports.REPO_PERMISSION_RANK[actual] >= exports.REPO_PERMISSION_RANK[required];
}
/** Default repository permission granted by a workspace role. */
function defaultRepoPermissionForWorkspaceRole(role) {
    switch (role) {
        case 'OWNER':
        case 'ADMIN':
            return 'ADMIN';
        case 'MEMBER':
            return 'ANALYZE';
        case 'VIEWER':
            return 'VIEW';
    }
}
/** OWNER/ADMIN always have repo ADMIN. Everyone else uses an override or the workspace-role default. */
function effectiveRepoPermission(role, override) {
    if (role === 'OWNER' || role === 'ADMIN')
        return 'ADMIN';
    return override ?? defaultRepoPermissionForWorkspaceRole(role);
}
exports.authPrincipalSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    email: zod_1.z.string().email(),
    displayName: zod_1.z.string(),
    sessionId: zod_1.z.string().optional(),
});
exports.membershipSchema = zod_1.z.object({
    workspaceId: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    role: exports.workspaceRoleSchema,
    createdAt: zod_1.z.string().datetime(),
});
class AuthorizationError extends Error {
    statusCode = 403;
    code = 'FORBIDDEN';
    constructor(message = 'You are not allowed to perform this action') {
        super(message);
        this.name = 'AuthorizationError';
    }
}
exports.AuthorizationError = AuthorizationError;
class UnauthenticatedError extends Error {
    statusCode = 401;
    code = 'UNAUTHENTICATED';
    constructor(message = 'Authentication required') {
        super(message);
        this.name = 'UnauthenticatedError';
    }
}
exports.UnauthenticatedError = UnauthenticatedError;
function assertWorkspaceRole(membership, required, workspaceId) {
    if (!membership || membership.workspaceId !== workspaceId) {
        throw new AuthorizationError('Not a member of this workspace');
    }
    if (!hasWorkspaceRole(membership.role, required)) {
        throw new AuthorizationError(`Requires workspace role ${required}`);
    }
    return membership;
}
function assertRepoPermission(permission, required) {
    if (!permission || !hasRepoPermission(permission, required)) {
        throw new AuthorizationError(`Requires repository permission ${required}`);
    }
    return permission;
}
//# sourceMappingURL=auth.js.map