"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileBodySchema = exports.sessionSchema = exports.refreshBodySchema = exports.forgotPasswordBodySchema = exports.loginBodySchema = exports.signupBodySchema = exports.userSchema = void 0;
const zod_1 = require("zod");
exports.userSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    email: zod_1.z.string().email(),
    displayName: zod_1.z.string().min(1).max(80),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
exports.signupBodySchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).max(128),
    displayName: zod_1.z.string().min(1).max(80),
});
exports.loginBodySchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
exports.forgotPasswordBodySchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
exports.refreshBodySchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1),
});
exports.sessionSchema = zod_1.z.object({
    accessToken: zod_1.z.string(),
    refreshToken: zod_1.z.string(),
    expiresAt: zod_1.z.string().datetime(),
    user: exports.userSchema,
});
exports.updateProfileBodySchema = zod_1.z.object({
    displayName: zod_1.z.string().min(1).max(80),
});
//# sourceMappingURL=users.js.map