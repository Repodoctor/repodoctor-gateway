import { z } from 'zod';
export declare const errorCodeSchema: z.ZodEnum<{
    FORBIDDEN: "FORBIDDEN";
    UNAUTHENTICATED: "UNAUTHENTICATED";
    BAD_REQUEST: "BAD_REQUEST";
    NOT_FOUND: "NOT_FOUND";
    CONFLICT: "CONFLICT";
    RATE_LIMITED: "RATE_LIMITED";
    VALIDATION_ERROR: "VALIDATION_ERROR";
    INTERNAL: "INTERNAL";
    BAD_GATEWAY: "BAD_GATEWAY";
    NOT_IMPLEMENTED: "NOT_IMPLEMENTED";
    PLAN_LIMIT: "PLAN_LIMIT";
}>;
export type ErrorCode = z.infer<typeof errorCodeSchema>;
export declare const apiErrorSchema: z.ZodObject<{
    statusCode: z.ZodNumber;
    error: z.ZodString;
    code: z.ZodEnum<{
        FORBIDDEN: "FORBIDDEN";
        UNAUTHENTICATED: "UNAUTHENTICATED";
        BAD_REQUEST: "BAD_REQUEST";
        NOT_FOUND: "NOT_FOUND";
        CONFLICT: "CONFLICT";
        RATE_LIMITED: "RATE_LIMITED";
        VALIDATION_ERROR: "VALIDATION_ERROR";
        INTERNAL: "INTERNAL";
        BAD_GATEWAY: "BAD_GATEWAY";
        NOT_IMPLEMENTED: "NOT_IMPLEMENTED";
        PLAN_LIMIT: "PLAN_LIMIT";
    }>;
    message: z.ZodString;
    requestId: z.ZodOptional<z.ZodString>;
    details: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export declare function apiError(input: {
    statusCode: number;
    error: string;
    code: ErrorCode;
    message: string;
    requestId?: string;
    details?: unknown;
}): ApiError;
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: ErrorCode;
    readonly error: string;
    readonly details?: unknown;
    constructor(input: {
        statusCode: number;
        error: string;
        code: ErrorCode;
        message: string;
        details?: unknown;
    });
    toEnvelope(requestId?: string): ApiError;
}
export declare function badRequest(message: string, details?: unknown): AppError;
export declare function notFound(message: string): AppError;
export declare function conflict(message: string): AppError;
export declare function planLimit(message: string, details?: unknown): AppError;
