import { z } from 'zod';
export declare const analysisTypeSchema: z.ZodEnum<{
    FULL: "FULL";
    REPOGRAPH: "REPOGRAPH";
    REPO_DOCTOR: "REPO_DOCTOR";
    CODE_REVIEW: "CODE_REVIEW";
    SECURITY: "SECURITY";
    DEPENDENCY: "DEPENDENCY";
    DOCUMENTATION: "DOCUMENTATION";
    CI_DOCTOR: "CI_DOCTOR";
    AI: "AI";
}>;
export type AnalysisType = z.infer<typeof analysisTypeSchema>;
export declare const analysisStatusSchema: z.ZodEnum<{
    QUEUED: "QUEUED";
    RUNNING: "RUNNING";
    COMPLETED: "COMPLETED";
    FAILED: "FAILED";
    CANCELLED: "CANCELLED";
}>;
export type AnalysisStatus = z.infer<typeof analysisStatusSchema>;
export declare const analysisTriggerSchema: z.ZodEnum<{
    MANUAL: "MANUAL";
    WEBHOOK: "WEBHOOK";
    SCHEDULE: "SCHEDULE";
    PULL_REQUEST: "PULL_REQUEST";
    CI_FAILURE: "CI_FAILURE";
    REMEDIATION: "REMEDIATION";
}>;
export type AnalysisTrigger = z.infer<typeof analysisTriggerSchema>;
export declare const analysisRunSchema: z.ZodObject<{
    id: z.ZodString;
    repositoryId: z.ZodString;
    organizationId: z.ZodString;
    type: z.ZodEnum<{
        FULL: "FULL";
        REPOGRAPH: "REPOGRAPH";
        REPO_DOCTOR: "REPO_DOCTOR";
        CODE_REVIEW: "CODE_REVIEW";
        SECURITY: "SECURITY";
        DEPENDENCY: "DEPENDENCY";
        DOCUMENTATION: "DOCUMENTATION";
        CI_DOCTOR: "CI_DOCTOR";
        AI: "AI";
    }>;
    status: z.ZodEnum<{
        QUEUED: "QUEUED";
        RUNNING: "RUNNING";
        COMPLETED: "COMPLETED";
        FAILED: "FAILED";
        CANCELLED: "CANCELLED";
    }>;
    commitSha: z.ZodString;
    branch: z.ZodString;
    startedAt: z.ZodNullable<z.ZodString>;
    completedAt: z.ZodNullable<z.ZodString>;
    durationMs: z.ZodNullable<z.ZodNumber>;
    trigger: z.ZodEnum<{
        MANUAL: "MANUAL";
        WEBHOOK: "WEBHOOK";
        SCHEDULE: "SCHEDULE";
        PULL_REQUEST: "PULL_REQUEST";
        CI_FAILURE: "CI_FAILURE";
        REMEDIATION: "REMEDIATION";
    }>;
    error: z.ZodNullable<z.ZodString>;
    metadata: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type AnalysisRun = z.infer<typeof analysisRunSchema>;
