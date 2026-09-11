"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = exports.apiErrorSchema = exports.errorCodeSchema = void 0;
exports.apiError = apiError;
exports.badRequest = badRequest;
exports.notFound = notFound;
exports.conflict = conflict;
exports.planLimit = planLimit;
const zod_1 = require("zod");
exports.errorCodeSchema = zod_1.z.enum([
    'BAD_REQUEST',
    'UNAUTHENTICATED',
    'FORBIDDEN',
    'NOT_FOUND',
    'CONFLICT',
    'RATE_LIMITED',
    'VALIDATION_ERROR',
    'INTERNAL',
    'BAD_GATEWAY',
    'NOT_IMPLEMENTED',
    'PLAN_LIMIT',
]);
exports.apiErrorSchema = zod_1.z.object({
    statusCode: zod_1.z.number().int(),
    error: zod_1.z.string(),
    code: exports.errorCodeSchema,
    message: zod_1.z.string(),
    requestId: zod_1.z.string().optional(),
    details: zod_1.z.unknown().optional(),
});
function apiError(input) {
    return {
        statusCode: input.statusCode,
        error: input.error,
        code: input.code,
        message: input.message,
        requestId: input.requestId,
        details: input.details,
    };
}
class AppError extends Error {
    statusCode;
    code;
    error;
    details;
    constructor(input) {
        super(input.message);
        this.name = 'AppError';
        this.statusCode = input.statusCode;
        this.code = input.code;
        this.error = input.error;
        this.details = input.details;
    }
    toEnvelope(requestId) {
        return apiError({
            statusCode: this.statusCode,
            error: this.error,
            code: this.code,
            message: this.message,
            requestId,
            details: this.details,
        });
    }
}
exports.AppError = AppError;
function badRequest(message, details) {
    return new AppError({
        statusCode: 400,
        error: 'Bad Request',
        code: 'VALIDATION_ERROR',
        message,
        details,
    });
}
function notFound(message) {
    return new AppError({
        statusCode: 404,
        error: 'Not Found',
        code: 'NOT_FOUND',
        message,
    });
}
function conflict(message) {
    return new AppError({
        statusCode: 409,
        error: 'Conflict',
        code: 'CONFLICT',
        message,
    });
}
function planLimit(message, details) {
    return new AppError({
        statusCode: 403,
        error: 'Plan Limit',
        code: 'PLAN_LIMIT',
        message,
        details,
    });
}
//# sourceMappingURL=errors.js.map