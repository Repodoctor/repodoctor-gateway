"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertScannerRunBodySchema = exports.scannerRunSchema = exports.scannerRunStatusSchema = exports.scannerIdSchema = void 0;
const zod_1 = require("zod");
exports.scannerIdSchema = zod_1.z.enum(['semgrep', 'gitleaks', 'trivy']);
exports.scannerRunStatusSchema = zod_1.z.enum(['SUCCESS', 'FAILED', 'TIMEOUT', 'NOT_APPLICABLE']);
exports.scannerRunSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    analysisRunId: zod_1.z.string().uuid(),
    workspaceId: zod_1.z.string().uuid(),
    repositoryId: zod_1.z.string().uuid(),
    scanner: exports.scannerIdSchema,
    scannerVersion: zod_1.z.string().min(1),
    status: exports.scannerRunStatusSchema,
    exitCode: zod_1.z.number().int().nullable(),
    durationMs: zod_1.z.number().int().nonnegative().nullable(),
    findingCount: zod_1.z.number().int().nonnegative(),
    error: zod_1.z.string().nullable(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
exports.upsertScannerRunBodySchema = zod_1.z.object({
    scanner: exports.scannerIdSchema,
    scannerVersion: zod_1.z.string().min(1),
    status: exports.scannerRunStatusSchema,
    exitCode: zod_1.z.number().int().nullable().optional(),
    durationMs: zod_1.z.number().int().nonnegative().nullable().optional(),
    findingCount: zod_1.z.number().int().nonnegative().default(0),
    error: zod_1.z.string().nullable().optional(),
});
//# sourceMappingURL=scanners.js.map