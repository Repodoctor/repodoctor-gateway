"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthScoreBreakdownSchema = exports.healthSignalsSchema = void 0;
exports.computeHealthScore = computeHealthScore;
const zod_1 = require("zod");
exports.healthSignalsSchema = zod_1.z.object({
    criticalFindings: zod_1.z.number().int().nonnegative(),
    highFindings: zod_1.z.number().int().nonnegative(),
    securityIssues: zod_1.z.number().int().nonnegative(),
    dependencyVulnerabilities: zod_1.z.number().int().nonnegative(),
    testSignal: zod_1.z.number().min(0).max(1),
    ciReliability: zod_1.z.number().min(0).max(1),
    documentationScore: zod_1.z.number().min(0).max(1),
    architectureIssues: zod_1.z.number().int().nonnegative(),
    maintainabilityIssues: zod_1.z.number().int().nonnegative(),
    hygieneIssues: zod_1.z.number().int().nonnegative(),
});
exports.healthScoreBreakdownSchema = zod_1.z.object({
    score: zod_1.z.number().int().min(0).max(100),
    deductions: zod_1.z.array(zod_1.z.object({
        reason: zod_1.z.string(),
        points: zod_1.z.number().int(),
    })),
});
/**
 * Deterministic 0–100 repository health score.
 * Analyzers supply measurable signals; this function never consults an LLM.
 */
function computeHealthScore(signals) {
    const deductions = [];
    const deduct = (reason, points) => {
        if (points <= 0)
            return;
        deductions.push({ reason, points: Math.min(100, points) });
    };
    deduct('Critical findings', Math.min(45, signals.criticalFindings * 15));
    deduct('High findings', Math.min(20, signals.highFindings * 5));
    deduct('Security issues', Math.min(20, signals.securityIssues * 4));
    deduct('Dependency vulnerabilities', Math.min(15, signals.dependencyVulnerabilities * 3));
    deduct('Weak test signals', Math.round((1 - signals.testSignal) * 10));
    deduct('Unreliable CI', Math.round((1 - signals.ciReliability) * 10));
    deduct('Thin documentation', Math.round((1 - signals.documentationScore) * 8));
    deduct('Architecture issues', Math.min(10, signals.architectureIssues * 2));
    deduct('Maintainability issues', Math.min(8, signals.maintainabilityIssues));
    deduct('Repository hygiene', Math.min(6, signals.hygieneIssues));
    const totalDeduction = deductions.reduce((sum, item) => sum + item.points, 0);
    const score = Math.max(0, 100 - totalDeduction);
    return { score, deductions };
}
//# sourceMappingURL=health-score.js.map