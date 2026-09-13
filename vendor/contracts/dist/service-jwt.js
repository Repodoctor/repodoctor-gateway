"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERVICE_ISSUERS = exports.INTERNAL_SERVICE_AUDIENCE = void 0;
exports.assertServiceIssuer = assertServiceIssuer;
exports.mintServiceJwt = mintServiceJwt;
exports.verifyServiceJwt = verifyServiceJwt;
exports.assertInternalServiceToken = assertInternalServiceToken;
exports.readServiceToken = readServiceToken;
const node_crypto_1 = require("node:crypto");
const jose_1 = require("jose");
const auth_1 = require("./auth");
const errors_1 = require("./errors");
/** Shared audience for service-to-service JWTs on the private network. */
exports.INTERNAL_SERVICE_AUDIENCE = 'repodoctor-internal';
exports.SERVICE_ISSUERS = {
    gateway: 'repodoctor-gateway',
    scm: 'repodoctor-scm',
    repository: 'repodoctor-repository',
    findings: 'repodoctor-findings',
    worker: 'repodoctor-worker',
};
function assertServiceIssuer(iss, allowed) {
    if (!allowed.includes(iss)) {
        throw new auth_1.UnauthenticatedError('Service token is not allowed for this route');
    }
}
function secretKey(secret) {
    if (!secret) {
        throw new errors_1.AppError({
            statusCode: 503,
            error: 'Service Unavailable',
            code: 'INTERNAL',
            message: 'INTERNAL_SERVICE_TOKEN is required to mint or verify service JWTs',
        });
    }
    return new TextEncoder().encode(secret);
}
async function mintServiceJwt(input) {
    const now = Math.floor(Date.now() / 1000);
    const audience = input.audience ?? exports.INTERNAL_SERVICE_AUDIENCE;
    return new jose_1.SignJWT({})
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer(input.issuer)
        .setSubject(input.issuer)
        .setAudience(audience)
        .setIssuedAt(now)
        .setExpirationTime(now + input.ttlSeconds)
        .setJti((0, node_crypto_1.randomUUID)())
        .sign(secretKey(input.secret));
}
async function verifyServiceJwt(token, secret, audience = exports.INTERNAL_SERVICE_AUDIENCE, allowedIssuers) {
    const { payload } = await (0, jose_1.jwtVerify)(token, secretKey(secret), {
        audience,
        algorithms: ['HS256'],
    });
    const iss = typeof payload.iss === 'string' ? payload.iss : undefined;
    const sub = typeof payload.sub === 'string' ? payload.sub : undefined;
    if (!iss || !sub) {
        throw new errors_1.AppError({
            statusCode: 401,
            error: 'Unauthorized',
            code: 'UNAUTHENTICATED',
            message: 'Service token is missing issuer/subject',
        });
    }
    if (allowedIssuers)
        assertServiceIssuer(iss, allowedIssuers);
    return { iss, sub, aud: audience };
}
function assertInternalServiceToken(token, nodeEnv) {
    if (nodeEnv === 'production' && !token) {
        throw new Error('INTERNAL_SERVICE_TOKEN is required in production');
    }
    return token;
}
function readServiceToken(headers) {
    const authorization = headers.authorization ?? headers.Authorization;
    const authValue = Array.isArray(authorization) ? authorization[0] : authorization;
    if (typeof authValue === 'string' && authValue.toLowerCase().startsWith('bearer ')) {
        const bearer = authValue.slice(7).trim();
        if (bearer.length > 0)
            return bearer;
    }
    const header = headers['x-service-token'];
    const token = Array.isArray(header) ? header[0] : header;
    return typeof token === 'string' && token.length > 0 ? token : undefined;
}
//# sourceMappingURL=service-jwt.js.map