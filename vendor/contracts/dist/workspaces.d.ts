import { z } from 'zod';
export declare const workspaceSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    slug: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type Workspace = z.infer<typeof workspaceSchema>;
export declare const createWorkspaceBodySchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CreateWorkspaceBody = z.infer<typeof createWorkspaceBodySchema>;
export declare const updateWorkspaceBodySchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type UpdateWorkspaceBody = z.infer<typeof updateWorkspaceBodySchema>;
export declare const addMemberBodySchema: z.ZodObject<{
    email: z.ZodString;
    role: z.ZodDefault<z.ZodEnum<{
        OWNER: "OWNER";
        ADMIN: "ADMIN";
        MEMBER: "MEMBER";
        VIEWER: "VIEWER";
    }>>;
}, z.core.$strip>;
export type AddMemberBody = z.infer<typeof addMemberBodySchema>;
export declare const updateMemberBodySchema: z.ZodObject<{
    role: z.ZodEnum<{
        OWNER: "OWNER";
        ADMIN: "ADMIN";
        MEMBER: "MEMBER";
        VIEWER: "VIEWER";
    }>;
}, z.core.$strip>;
export type UpdateMemberBody = z.infer<typeof updateMemberBodySchema>;
export declare const workspaceMemberSchema: z.ZodObject<{
    userId: z.ZodString;
    email: z.ZodString;
    displayName: z.ZodString;
    role: z.ZodEnum<{
        OWNER: "OWNER";
        ADMIN: "ADMIN";
        MEMBER: "MEMBER";
        VIEWER: "VIEWER";
    }>;
    createdAt: z.ZodString;
}, z.core.$strip>;
export type WorkspaceMember = z.infer<typeof workspaceMemberSchema>;
export declare const workspaceInviteSchema: z.ZodObject<{
    id: z.ZodString;
    workspaceId: z.ZodString;
    email: z.ZodString;
    role: z.ZodEnum<{
        OWNER: "OWNER";
        ADMIN: "ADMIN";
        MEMBER: "MEMBER";
        VIEWER: "VIEWER";
    }>;
    token: z.ZodOptional<z.ZodString>;
    signupUrl: z.ZodOptional<z.ZodString>;
    expiresAt: z.ZodString;
    createdAt: z.ZodString;
}, z.core.$strip>;
export type WorkspaceInvite = z.infer<typeof workspaceInviteSchema>;
export declare const workspaceInvitePreviewSchema: z.ZodObject<{
    workspaceName: z.ZodString;
    email: z.ZodString;
    role: z.ZodEnum<{
        OWNER: "OWNER";
        ADMIN: "ADMIN";
        MEMBER: "MEMBER";
        VIEWER: "VIEWER";
    }>;
    expiresAt: z.ZodString;
    expired: z.ZodBoolean;
}, z.core.$strip>;
export type WorkspaceInvitePreview = z.infer<typeof workspaceInvitePreviewSchema>;
export declare const addMemberResponseSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    status: z.ZodLiteral<"added">;
    member: z.ZodObject<{
        userId: z.ZodString;
        email: z.ZodString;
        displayName: z.ZodString;
        role: z.ZodEnum<{
            OWNER: "OWNER";
            ADMIN: "ADMIN";
            MEMBER: "MEMBER";
            VIEWER: "VIEWER";
        }>;
        createdAt: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    status: z.ZodLiteral<"invited">;
    invite: z.ZodObject<{
        id: z.ZodString;
        workspaceId: z.ZodString;
        email: z.ZodString;
        role: z.ZodEnum<{
            OWNER: "OWNER";
            ADMIN: "ADMIN";
            MEMBER: "MEMBER";
            VIEWER: "VIEWER";
        }>;
        token: z.ZodOptional<z.ZodString>;
        signupUrl: z.ZodOptional<z.ZodString>;
        expiresAt: z.ZodString;
        createdAt: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>], "status">;
export type AddMemberResponse = z.infer<typeof addMemberResponseSchema>;
