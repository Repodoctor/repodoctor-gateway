"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnauthenticatedError = exports.AuthorizationError = exports.membershipSchema = exports.authPrincipalSchema = exports.REPO_PERMISSION_RANK = exports.ORG_ROLE_RANK = exports.repoPermissionSchema = exports.orgRoleSchema = void 0;
exports.hasOrgRole = hasOrgRole;
exports.hasRepoPermission = hasRepoPermission;
exports.defaultRepoPermissionForOrgRole = defaultRepoPermissionForOrgRole;
exports.effectiveRepoPermission = effectiveRepoPermission;
exports.assertOrgRole = assertOrgRole;
exports.assertRepoPermission = assertRepoPermission;
const zod_1 = require("zod");
exports.orgRoleSchema = zod_1.z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);
exports.repoPermissionSchema = zod_1.z.enum(['NONE', 'VIEW', 'ANALYZE', 'MANAGE', 'ADMIN']);
exports.ORG_ROLE_RANK = {
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
function hasOrgRole(actual, required) {
    return exports.ORG_ROLE_RANK[actual] >= exports.ORG_ROLE_RANK[required];
}
function hasRepoPermission(actual, required) {
    return exports.REPO_PERMISSION_RANK[actual] >= exports.REPO_PERMISSION_RANK[required];
}
/** Default repository permission granted by an organization role. */
function defaultRepoPermissionForOrgRole(role) {
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
/** OWNER/ADMIN always have repo ADMIN. Everyone else uses an override or the org-role default. */
function effectiveRepoPermission(role, override) {
    if (role === 'OWNER' || role === 'ADMIN')
        return 'ADMIN';
    return override ?? defaultRepoPermissionForOrgRole(role);
}
exports.authPrincipalSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    email: zod_1.z.string().email(),
    displayName: zod_1.z.string(),
    sessionId: zod_1.z.string().optional(),
});
exports.membershipSchema = zod_1.z.object({
    organizationId: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    role: exports.orgRoleSchema,
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
function assertOrgRole(membership, required, organizationId) {
    if (!membership || membership.organizationId !== organizationId) {
        throw new AuthorizationError('Not a member of this organization');
    }
    if (!hasOrgRole(membership.role, required)) {
        throw new AuthorizationError(`Requires organization role ${required}`);
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