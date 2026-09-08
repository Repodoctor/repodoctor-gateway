"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repositoryAccessSchema = exports.repositorySchema = exports.scmProviderSchema = void 0;
const zod_1 = require("zod");
const auth_1 = require("./auth");
exports.scmProviderSchema = zod_1.z.enum(['github', 'gitlab', 'bitbucket', 'azure_devops']);
exports.repositorySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    organizationId: zod_1.z.string().uuid(),
    scmProvider: exports.scmProviderSchema,
    scmRepositoryId: zod_1.z.string().min(1),
    installationId: zod_1.z.string().min(1),
    owner: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    fullName: zod_1.z.string().min(1),
    defaultBranch: zod_1.z.string().min(1),
    private: zod_1.z.boolean(),
    url: zod_1.z.string().url(),
    lastAnalyzedAt: zod_1.z.string().datetime().nullable(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
exports.repositoryAccessSchema = zod_1.z.object({
    repositoryId: zod_1.z.string().uuid(),
    permission: auth_1.repoPermissionSchema,
});
//# sourceMappingURL=repositories.js.map