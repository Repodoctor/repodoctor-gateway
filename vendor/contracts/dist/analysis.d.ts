import { z } from 'zod';
export declare const analysisTypeSchema: z.ZodEnum<{
    FULL: "FULL";
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
}>;
export type AnalysisTrigger = z.infer<typeof analysisTriggerSchema>;
export declare const analysisRunSchema: z.ZodObject<{
    id: z.ZodString;
    repositoryId: z.ZodString;
    workspaceId: z.ZodString;
    type: z.ZodEnum<{
        FULL: "FULL";
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
    }>;
    error: z.ZodNullable<z.ZodString>;
    metadata: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type AnalysisRun = z.infer<typeof analysisRunSchema>;
export declare const updateAnalysisRunBodySchema: z.ZodObject<{
    status: z.ZodEnum<{
        RUNNING: "RUNNING";
        COMPLETED: "COMPLETED";
        FAILED: "FAILED";
    }>;
    error: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type UpdateAnalysisRunBody = z.infer<typeof updateAnalysisRunBodySchema>;
