"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analysisRunSchema = exports.analysisTriggerSchema = exports.analysisStatusSchema = exports.analysisTypeSchema = void 0;
const zod_1 = require("zod");
exports.analysisTypeSchema = zod_1.z.enum([
    'FULL',
    'REPOGRAPH',
    'REPO_DOCTOR',
    'CODE_REVIEW',
    'SECURITY',
    'DEPENDENCY',
    'DOCUMENTATION',
    'CI_DOCTOR',
    'AI',
]);
exports.analysisStatusSchema = zod_1.z.enum([
    'QUEUED',
    'RUNNING',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
]);
exports.analysisTriggerSchema = zod_1.z.enum([
    'MANUAL',
    'WEBHOOK',
    'SCHEDULE',
    'PULL_REQUEST',
    'CI_FAILURE',
    'REMEDIATION',
]);
exports.analysisRunSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    repositoryId: zod_1.z.string().uuid(),
    organizationId: zod_1.z.string().uuid(),
    type: exports.analysisTypeSchema,
    status: exports.analysisStatusSchema,
    commitSha: zod_1.z.string().min(7),
    branch: zod_1.z.string().min(1),
    startedAt: zod_1.z.string().datetime().nullable(),
    completedAt: zod_1.z.string().datetime().nullable(),
    durationMs: zod_1.z.number().int().nonnegative().nullable(),
    trigger: exports.analysisTriggerSchema,
    error: zod_1.z.string().nullable(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
//# sourceMappingURL=analysis.js.map