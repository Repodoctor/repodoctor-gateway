"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestAnalysisBodySchema = exports.connectGithubInstallationBodySchema = exports.scmInstallationSchema = exports.repositoryWithPermissionSchema = exports.updateRepositoryAccessBodySchema = exports.repositoryAccessGrantSchema = exports.repositoryAccessSchema = exports.repositorySchema = exports.scmProviderSchema = void 0;
const zod_1 = require("zod");
const auth_1 = require("./auth");
const analysis_1 = require("./analysis");
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
    organizationId: zod_1.z.string().uuid(),
    repositoryId: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    permission: auth_1.repoPermissionSchema,
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
exports.repositoryAccessGrantSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    email: zod_1.z.string().email(),
    displayName: zod_1.z.string(),
    role: zod_1.z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']),
    permission: auth_1.repoPermissionSchema,
    source: zod_1.z.enum(['role', 'override']),
});
exports.updateRepositoryAccessBodySchema = zod_1.z.object({
    permission: auth_1.repoPermissionSchema,
});
exports.repositoryWithPermissionSchema = exports.repositorySchema.extend({
    permission: auth_1.repoPermissionSchema,
});
exports.scmInstallationSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    organizationId: zod_1.z.string().uuid(),
    provider: exports.scmProviderSchema,
    externalInstallationId: zod_1.z.string().min(1),
    accountLogin: zod_1.z.string().min(1),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
exports.connectGithubInstallationBodySchema = zod_1.z.object({
    externalInstallationId: zod_1.z.string().min(1),
    accountLogin: zod_1.z.string().min(1),
});
exports.requestAnalysisBodySchema = zod_1.z.object({
    type: analysis_1.analysisTypeSchema.default('FULL'),
    trigger: analysis_1.analysisTriggerSchema.default('MANUAL'),
    commitSha: zod_1.z.string().min(7),
    branch: zod_1.z.string().min(1),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
//# sourceMappingURL=repositories.js.map