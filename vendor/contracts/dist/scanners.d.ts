import { z } from 'zod';
export declare const scannerIdSchema: z.ZodEnum<{
    semgrep: "semgrep";
    gitleaks: "gitleaks";
    trivy: "trivy";
}>;
export type ScannerId = z.infer<typeof scannerIdSchema>;
export declare const scannerRunStatusSchema: z.ZodEnum<{
    FAILED: "FAILED";
    SUCCESS: "SUCCESS";
    TIMEOUT: "TIMEOUT";
    NOT_APPLICABLE: "NOT_APPLICABLE";
}>;
export type ScannerRunStatus = z.infer<typeof scannerRunStatusSchema>;
export declare const scannerRunSchema: z.ZodObject<{
    id: z.ZodString;
    analysisRunId: z.ZodString;
    workspaceId: z.ZodString;
    repositoryId: z.ZodString;
    scanner: z.ZodEnum<{
        semgrep: "semgrep";
        gitleaks: "gitleaks";
        trivy: "trivy";
    }>;
    scannerVersion: z.ZodString;
    status: z.ZodEnum<{
        FAILED: "FAILED";
        SUCCESS: "SUCCESS";
        TIMEOUT: "TIMEOUT";
        NOT_APPLICABLE: "NOT_APPLICABLE";
    }>;
    exitCode: z.ZodNullable<z.ZodNumber>;
    durationMs: z.ZodNullable<z.ZodNumber>;
    findingCount: z.ZodNumber;
    error: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type ScannerRun = z.infer<typeof scannerRunSchema>;
export declare const upsertScannerRunBodySchema: z.ZodObject<{
    scanner: z.ZodEnum<{
        semgrep: "semgrep";
        gitleaks: "gitleaks";
        trivy: "trivy";
    }>;
    scannerVersion: z.ZodString;
    status: z.ZodEnum<{
        FAILED: "FAILED";
        SUCCESS: "SUCCESS";
        TIMEOUT: "TIMEOUT";
        NOT_APPLICABLE: "NOT_APPLICABLE";
    }>;
    exitCode: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    durationMs: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    findingCount: z.ZodDefault<z.ZodNumber>;
    error: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type UpsertScannerRunBody = z.infer<typeof upsertScannerRunBodySchema>;
export interface ScannerContext {
    analysisRunId: string;
    workspaceId: string;
    repositoryId: string;
    commitSha: string;
    branch: string;
    workspace: string;
}
export interface ScannerFinding {
    ruleId: string;
    severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    title: string;
    description: string;
    filePath: string | null;
    lineNumber: number | null;
    evidence: string[];
}
export interface ScannerResult {
    scanner: ScannerId;
    scannerVersion: string;
    status: ScannerRunStatus;
    exitCode: number | null;
    durationMs: number;
    findings: ScannerFinding[];
    error: string | null;
}
export interface Scanner {
    id: ScannerId;
    version: string;
    supports(context: ScannerContext): boolean;
    scan(context: ScannerContext): Promise<ScannerResult>;
}
