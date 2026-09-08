"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.organizationMemberSchema = exports.updateMemberBodySchema = exports.addMemberBodySchema = exports.updateOrganizationBodySchema = exports.createOrganizationBodySchema = exports.organizationSchema = void 0;
const zod_1 = require("zod");
const auth_1 = require("./auth");
exports.organizationSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(80),
    slug: zod_1.z.string().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
exports.createOrganizationBodySchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(80),
    slug: zod_1.z
        .string()
        .min(2)
        .max(80)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        .optional(),
});
exports.updateOrganizationBodySchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(80).optional(),
});
exports.addMemberBodySchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    role: auth_1.orgRoleSchema.default('MEMBER'),
});
exports.updateMemberBodySchema = zod_1.z.object({
    role: auth_1.orgRoleSchema,
});
exports.organizationMemberSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    email: zod_1.z.string().email(),
    displayName: zod_1.z.string(),
    role: auth_1.orgRoleSchema,
    createdAt: zod_1.z.string().datetime(),
});
//# sourceMappingURL=organizations.js.map