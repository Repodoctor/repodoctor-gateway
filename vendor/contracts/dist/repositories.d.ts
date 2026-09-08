import { z } from 'zod';
export declare const scmProviderSchema: z.ZodEnum<{
    github: "github";
    gitlab: "gitlab";
    bitbucket: "bitbucket";
    azure_devops: "azure_devops";
}>;
export type ScmProvider = z.infer<typeof scmProviderSchema>;
export declare const repositorySchema: z.ZodObject<{
    id: z.ZodString;
    organizationId: z.ZodString;
    scmProvider: z.ZodEnum<{
        github: "github";
        gitlab: "gitlab";
        bitbucket: "bitbucket";
        azure_devops: "azure_devops";
    }>;
    scmRepositoryId: z.ZodString;
    installationId: z.ZodString;
    owner: z.ZodString;
    name: z.ZodString;
    fullName: z.ZodString;
    defaultBranch: z.ZodString;
    private: z.ZodBoolean;
    url: z.ZodString;
    lastAnalyzedAt: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type Repository = z.infer<typeof repositorySchema>;
export declare const repositoryAccessSchema: z.ZodObject<{
    repositoryId: z.ZodString;
    permission: z.ZodEnum<{
        ADMIN: "ADMIN";
        VIEW: "VIEW";
        ANALYZE: "ANALYZE";
        MANAGE: "MANAGE";
    }>;
}, z.core.$strip>;
export type RepositoryAccess = z.infer<typeof repositoryAccessSchema>;
export declare const scmInstallationSchema: z.ZodObject<{
    id: z.ZodString;
    organizationId: z.ZodString;
    provider: z.ZodEnum<{
        github: "github";
        gitlab: "gitlab";
        bitbucket: "bitbucket";
        azure_devops: "azure_devops";
    }>;
    externalInstallationId: z.ZodString;
    accountLogin: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type ScmInstallation = z.infer<typeof scmInstallationSchema>;
export declare const connectGithubInstallationBodySchema: z.ZodObject<{
    externalInstallationId: z.ZodString;
    accountLogin: z.ZodString;
}, z.core.$strip>;
export type ConnectGithubInstallationBody = z.infer<typeof connectGithubInstallationBodySchema>;
export declare const requestAnalysisBodySchema: z.ZodObject<{
    type: z.ZodDefault<z.ZodEnum<{
        FULL: "FULL";
        REPOGRAPH: "REPOGRAPH";
        REPO_DOCTOR: "REPO_DOCTOR";
        CODE_REVIEW: "CODE_REVIEW";
        SECURITY: "SECURITY";
        DEPENDENCY: "DEPENDENCY";
        DOCUMENTATION: "DOCUMENTATION";
        CI_DOCTOR: "CI_DOCTOR";
        AI: "AI";
    }>>;
    trigger: z.ZodDefault<z.ZodEnum<{
        MANUAL: "MANUAL";
        WEBHOOK: "WEBHOOK";
        SCHEDULE: "SCHEDULE";
        PULL_REQUEST: "PULL_REQUEST";
        CI_FAILURE: "CI_FAILURE";
        REMEDIATION: "REMEDIATION";
    }>>;
    commitSha: z.ZodString;
    branch: z.ZodString;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type RequestAnalysisBody = z.infer<typeof requestAnalysisBodySchema>;
