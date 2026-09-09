import { z } from 'zod';
export declare const organizationSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    slug: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type Organization = z.infer<typeof organizationSchema>;
export declare const createOrganizationBodySchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CreateOrganizationBody = z.infer<typeof createOrganizationBodySchema>;
export declare const updateOrganizationBodySchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type UpdateOrganizationBody = z.infer<typeof updateOrganizationBodySchema>;
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
export declare const organizationMemberSchema: z.ZodObject<{
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
export type OrganizationMember = z.infer<typeof organizationMemberSchema>;
export declare const organizationInviteSchema: z.ZodObject<{
    id: z.ZodString;
    organizationId: z.ZodString;
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
export type OrganizationInvite = z.infer<typeof organizationInviteSchema>;
export declare const organizationInvitePreviewSchema: z.ZodObject<{
    organizationName: z.ZodString;
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
export type OrganizationInvitePreview = z.infer<typeof organizationInvitePreviewSchema>;
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
        organizationId: z.ZodString;
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
