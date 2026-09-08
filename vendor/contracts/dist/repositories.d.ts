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
