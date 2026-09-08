import { z } from 'zod';
export declare const userSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    displayName: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type User = z.infer<typeof userSchema>;
export declare const signupBodySchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    displayName: z.ZodString;
}, z.core.$strip>;
export type SignupBody = z.infer<typeof signupBodySchema>;
export declare const loginBodySchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export declare const forgotPasswordBodySchema: z.ZodObject<{
    email: z.ZodString;
}, z.core.$strip>;
export type ForgotPasswordBody = z.infer<typeof forgotPasswordBodySchema>;
export declare const refreshBodySchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, z.core.$strip>;
export type RefreshBody = z.infer<typeof refreshBodySchema>;
export declare const sessionSchema: z.ZodObject<{
    accessToken: z.ZodString;
    refreshToken: z.ZodString;
    expiresAt: z.ZodString;
    user: z.ZodObject<{
        id: z.ZodString;
        email: z.ZodString;
        displayName: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export type Session = z.infer<typeof sessionSchema>;
export declare const updateProfileBodySchema: z.ZodObject<{
    displayName: z.ZodString;
}, z.core.$strip>;
export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;
