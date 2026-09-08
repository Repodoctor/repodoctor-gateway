import { z } from 'zod';
export declare const findingSeveritySchema: z.ZodEnum<{
    INFO: "INFO";
    LOW: "LOW";
    MEDIUM: "MEDIUM";
    HIGH: "HIGH";
    CRITICAL: "CRITICAL";
}>;
export type FindingSeverity = z.infer<typeof findingSeveritySchema>;
export declare const findingStatusSchema: z.ZodEnum<{
    OPEN: "OPEN";
    ACKNOWLEDGED: "ACKNOWLEDGED";
    RESOLVED: "RESOLVED";
    IGNORED: "IGNORED";
}>;
export type FindingStatus = z.infer<typeof findingStatusSchema>;
export declare const findingSourceSchema: z.ZodEnum<{
    REPOGRAPH: "REPOGRAPH";
    REPO_DOCTOR: "REPO_DOCTOR";
    CODE_REVIEW: "CODE_REVIEW";
    SECURITY: "SECURITY";
    DEPENDENCY: "DEPENDENCY";
    DOCUMENTATION: "DOCUMENTATION";
    CI_DOCTOR: "CI_DOCTOR";
    AI: "AI";
}>;
export type FindingSource = z.infer<typeof findingSourceSchema>;
export declare const findingClassificationSchema: z.ZodEnum<{
    AI: "AI";
    DETERMINISTIC: "DETERMINISTIC";
}>;
export type FindingClassification = z.infer<typeof findingClassificationSchema>;
export declare const findingSchema: z.ZodObject<{
    id: z.ZodString;
    organizationId: z.ZodString;
    repositoryId: z.ZodString;
    analysisRunId: z.ZodString;
    source: z.ZodEnum<{
        REPOGRAPH: "REPOGRAPH";
        REPO_DOCTOR: "REPO_DOCTOR";
        CODE_REVIEW: "CODE_REVIEW";
        SECURITY: "SECURITY";
        DEPENDENCY: "DEPENDENCY";
        DOCUMENTATION: "DOCUMENTATION";
        CI_DOCTOR: "CI_DOCTOR";
        AI: "AI";
    }>;
    ruleId: z.ZodString;
    severity: z.ZodEnum<{
        INFO: "INFO";
        LOW: "LOW";
        MEDIUM: "MEDIUM";
        HIGH: "HIGH";
        CRITICAL: "CRITICAL";
    }>;
    title: z.ZodString;
    description: z.ZodString;
    filePath: z.ZodNullable<z.ZodString>;
    lineNumber: z.ZodNullable<z.ZodNumber>;
    fingerprint: z.ZodString;
    status: z.ZodEnum<{
        OPEN: "OPEN";
        ACKNOWLEDGED: "ACKNOWLEDGED";
        RESOLVED: "RESOLVED";
        IGNORED: "IGNORED";
    }>;
    confidence: z.ZodNullable<z.ZodNumber>;
    evidence: z.ZodArray<z.ZodString>;
    explanation: z.ZodNullable<z.ZodString>;
    impact: z.ZodNullable<z.ZodString>;
    suggestedFix: z.ZodNullable<z.ZodString>;
    classification: z.ZodEnum<{
        AI: "AI";
        DETERMINISTIC: "DETERMINISTIC";
    }>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type Finding = z.infer<typeof findingSchema>;
export declare const upsertFindingBodySchema: z.ZodObject<{
    organizationId: z.ZodString;
    repositoryId: z.ZodString;
    analysisRunId: z.ZodString;
    source: z.ZodEnum<{
        REPOGRAPH: "REPOGRAPH";
        REPO_DOCTOR: "REPO_DOCTOR";
        CODE_REVIEW: "CODE_REVIEW";
        SECURITY: "SECURITY";
        DEPENDENCY: "DEPENDENCY";
        DOCUMENTATION: "DOCUMENTATION";
        CI_DOCTOR: "CI_DOCTOR";
        AI: "AI";
    }>;
    ruleId: z.ZodString;
    severity: z.ZodEnum<{
        INFO: "INFO";
        LOW: "LOW";
        MEDIUM: "MEDIUM";
        HIGH: "HIGH";
        CRITICAL: "CRITICAL";
    }>;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    filePath: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    lineNumber: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    evidence: z.ZodOptional<z.ZodArray<z.ZodString>>;
    explanation: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    impact: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    suggestedFix: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    classification: z.ZodOptional<z.ZodEnum<{
        AI: "AI";
        DETERMINISTIC: "DETERMINISTIC";
    }>>;
    confidence: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    commitSha: z.ZodString;
}, z.core.$strip>;
export type UpsertFindingBody = z.infer<typeof upsertFindingBodySchema>;
export declare const updateFindingStatusBodySchema: z.ZodObject<{
    status: z.ZodEnum<{
        OPEN: "OPEN";
        ACKNOWLEDGED: "ACKNOWLEDGED";
        RESOLVED: "RESOLVED";
        IGNORED: "IGNORED";
    }>;
}, z.core.$strip>;
export type UpdateFindingStatusBody = z.infer<typeof updateFindingStatusBodySchema>;
