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
    workspaceId: z.ZodString;
    workspaceName: z.ZodDefault<z.ZodString>;
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
    workspaceId: z.ZodString;
    repositoryId: z.ZodString;
    userId: z.ZodString;
    permission: z.ZodEnum<{
        ADMIN: "ADMIN";
        NONE: "NONE";
        VIEW: "VIEW";
        ANALYZE: "ANALYZE";
        MANAGE: "MANAGE";
    }>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type RepositoryAccess = z.infer<typeof repositoryAccessSchema>;
export declare const repositoryAccessGrantSchema: z.ZodObject<{
    userId: z.ZodString;
    email: z.ZodString;
    displayName: z.ZodString;
    role: z.ZodEnum<{
        OWNER: "OWNER";
        ADMIN: "ADMIN";
        MEMBER: "MEMBER";
        VIEWER: "VIEWER";
    }>;
    permission: z.ZodEnum<{
        ADMIN: "ADMIN";
        NONE: "NONE";
        VIEW: "VIEW";
        ANALYZE: "ANALYZE";
        MANAGE: "MANAGE";
    }>;
    source: z.ZodEnum<{
        role: "role";
        override: "override";
    }>;
}, z.core.$strip>;
export type RepositoryAccessGrant = z.infer<typeof repositoryAccessGrantSchema>;
export declare const updateRepositoryAccessBodySchema: z.ZodObject<{
    permission: z.ZodEnum<{
        ADMIN: "ADMIN";
        NONE: "NONE";
        VIEW: "VIEW";
        ANALYZE: "ANALYZE";
        MANAGE: "MANAGE";
    }>;
}, z.core.$strip>;
export type UpdateRepositoryAccessBody = z.infer<typeof updateRepositoryAccessBodySchema>;
export declare const repositoryWithPermissionSchema: z.ZodObject<{
    id: z.ZodString;
    workspaceId: z.ZodString;
    workspaceName: z.ZodDefault<z.ZodString>;
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
    permission: z.ZodEnum<{
        ADMIN: "ADMIN";
        NONE: "NONE";
        VIEW: "VIEW";
        ANALYZE: "ANALYZE";
        MANAGE: "MANAGE";
    }>;
}, z.core.$strip>;
export type RepositoryWithPermission = z.infer<typeof repositoryWithPermissionSchema>;
export declare const scmInstallationSchema: z.ZodObject<{
    id: z.ZodString;
    workspaceId: z.ZodString;
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
    }>>;
    trigger: z.ZodDefault<z.ZodEnum<{
        MANUAL: "MANUAL";
        WEBHOOK: "WEBHOOK";
        SCHEDULE: "SCHEDULE";
        PULL_REQUEST: "PULL_REQUEST";
    }>>;
    commitSha: z.ZodString;
    branch: z.ZodString;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type RequestAnalysisBody = z.infer<typeof requestAnalysisBodySchema>;
