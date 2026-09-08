"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findingSchema = exports.findingClassificationSchema = exports.findingSourceSchema = exports.findingStatusSchema = exports.findingSeveritySchema = void 0;
const zod_1 = require("zod");
exports.findingSeveritySchema = zod_1.z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
exports.findingStatusSchema = zod_1.z.enum(['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'IGNORED']);
exports.findingSourceSchema = zod_1.z.enum([
    'REPOGRAPH',
    'REPO_DOCTOR',
    'SECURITY',
    'DEPENDENCY',
    'DOCUMENTATION',
    'CI_DOCTOR',
    'CODE_REVIEW',
    'AI',
]);
exports.findingClassificationSchema = zod_1.z.enum(['DETERMINISTIC', 'AI']);
exports.findingSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    organizationId: zod_1.z.string().uuid(),
    repositoryId: zod_1.z.string().uuid(),
    analysisRunId: zod_1.z.string().uuid(),
    source: exports.findingSourceSchema,
    ruleId: zod_1.z.string().min(1),
    severity: exports.findingSeveritySchema,
    title: zod_1.z.string().min(1),
    description: zod_1.z.string(),
    filePath: zod_1.z.string().nullable(),
    lineNumber: zod_1.z.number().int().positive().nullable(),
    fingerprint: zod_1.z.string().min(16),
    status: exports.findingStatusSchema,
    confidence: zod_1.z.number().min(0).max(1).nullable(),
    evidence: zod_1.z.array(zod_1.z.string()),
    explanation: zod_1.z.string().nullable(),
    impact: zod_1.z.string().nullable(),
    suggestedFix: zod_1.z.string().nullable(),
    classification: exports.findingClassificationSchema,
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
//# sourceMappingURL=findings.js.map