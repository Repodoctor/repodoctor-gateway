import { z } from 'zod';
export declare const healthSignalsSchema: z.ZodObject<{
    criticalFindings: z.ZodNumber;
    highFindings: z.ZodNumber;
    securityIssues: z.ZodNumber;
    dependencyVulnerabilities: z.ZodNumber;
    testSignal: z.ZodNumber;
    ciReliability: z.ZodNumber;
    documentationScore: z.ZodNumber;
    architectureIssues: z.ZodNumber;
    maintainabilityIssues: z.ZodNumber;
    hygieneIssues: z.ZodNumber;
}, z.core.$strip>;
export type HealthSignals = z.infer<typeof healthSignalsSchema>;
export declare const healthScoreBreakdownSchema: z.ZodObject<{
    score: z.ZodNumber;
    deductions: z.ZodArray<z.ZodObject<{
        reason: z.ZodString;
        points: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type HealthScoreBreakdown = z.infer<typeof healthScoreBreakdownSchema>;
/**
 * Deterministic 0–100 repository health score.
 * Analyzers supply measurable signals; this function never consults an LLM.
 */
export declare function computeHealthScore(signals: HealthSignals): HealthScoreBreakdown;
