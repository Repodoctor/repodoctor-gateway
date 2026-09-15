"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addMemberResponseSchema = exports.workspaceInvitePreviewSchema = exports.workspaceInviteSchema = exports.workspaceMemberSchema = exports.updateMemberBodySchema = exports.addMemberBodySchema = exports.updateWorkspaceBodySchema = exports.createWorkspaceBodySchema = exports.workspaceSchema = void 0;
const zod_1 = require("zod");
const auth_1 = require("./auth");
exports.workspaceSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(80),
    slug: zod_1.z.string().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
exports.createWorkspaceBodySchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(80),
    slug: zod_1.z
        .string()
        .min(2)
        .max(80)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        .optional(),
});
exports.updateWorkspaceBodySchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(80).optional(),
});
exports.addMemberBodySchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    role: auth_1.workspaceRoleSchema.default('MEMBER'),
});
exports.updateMemberBodySchema = zod_1.z.object({
    role: auth_1.workspaceRoleSchema,
});
exports.workspaceMemberSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    email: zod_1.z.string().email(),
    displayName: zod_1.z.string(),
    role: auth_1.workspaceRoleSchema,
    createdAt: zod_1.z.string().datetime(),
});
exports.workspaceInviteSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    workspaceId: zod_1.z.string().uuid(),
    email: zod_1.z.string().email(),
    role: auth_1.workspaceRoleSchema,
    token: zod_1.z.string().min(1).optional(),
    signupUrl: zod_1.z.string().url().optional(),
    expiresAt: zod_1.z.string().datetime(),
    createdAt: zod_1.z.string().datetime(),
});
exports.workspaceInvitePreviewSchema = zod_1.z.object({
    workspaceName: zod_1.z.string(),
    email: zod_1.z.string().email(),
    role: auth_1.workspaceRoleSchema,
    expiresAt: zod_1.z.string().datetime(),
    expired: zod_1.z.boolean(),
});
exports.addMemberResponseSchema = zod_1.z.discriminatedUnion('status', [
    zod_1.z.object({
        status: zod_1.z.literal('added'),
        member: exports.workspaceMemberSchema,
    }),
    zod_1.z.object({
        status: zod_1.z.literal('invited'),
        invite: exports.workspaceInviteSchema,
    }),
]);
//# sourceMappingURL=workspaces.js.map