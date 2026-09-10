"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryableHttpError = exports.BrokenCircuitError = void 0;
exports.isRetryableHttpStatus = isRetryableHttpStatus;
exports.isTransientSqlError = isTransientSqlError;
exports.resiliencePolicy = resiliencePolicy;
exports.executeResilient = executeResilient;
exports.executeSql = executeSql;
exports.resilientFetch = resilientFetch;
exports.wrapSqlQuery = wrapSqlQuery;
const cockatiel_1 = require("cockatiel");
Object.defineProperty(exports, "BrokenCircuitError", { enumerable: true, get: function () { return cockatiel_1.BrokenCircuitError; } });
const HTTP_RETRY_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const SQL_RETRY_CODES = new Set([
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'EPIPE',
    'ENOTFOUND',
    'EAI_AGAIN',
    '40001',
    '40P01',
    '57P01',
    '57P02',
    '57P03',
    '53300',
    '08000',
    '08001',
    '08003',
    '08004',
    '08006',
]);
class RetryableHttpError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.name = 'RetryableHttpError';
        this.status = status;
    }
}
exports.RetryableHttpError = RetryableHttpError;
function isRetryableHttpStatus(status) {
    return HTTP_RETRY_STATUS.has(status);
}
function isTransientSqlError(error) {
    if (!error || typeof error !== 'object')
        return false;
    const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
    return SQL_RETRY_CODES.has(code);
}
function isTransientHttpError(error) {
    if (error instanceof RetryableHttpError)
        return true;
    if (error instanceof cockatiel_1.BrokenCircuitError)
        return false;
    if (!error || typeof error !== 'object')
        return false;
    const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
    if (SQL_RETRY_CODES.has(code))
        return true;
    const name = 'name' in error && typeof error.name === 'string' ? error.name : '';
    return name === 'AbortError' || name === 'TimeoutError' || name === 'FetchError';
}
const policies = new Map();
function enabled() {
    return process.env.NODE_ENV !== 'test';
}
/**
 * Named Cockatiel retry + circuit breaker. Share the name across callers of
 * the same dependency (e.g. `github-api`, `gateway-scm`) so the breaker state
 * is per-destination, not global.
 */
function resiliencePolicy(name, kind = 'http') {
    const key = `${kind}:${name}`;
    const existing = policies.get(key);
    if (existing)
        return existing;
    if (!enabled()) {
        policies.set(key, cockatiel_1.noop);
        return cockatiel_1.noop;
    }
    const filter = kind === 'sql' ? (0, cockatiel_1.handleWhen)(isTransientSqlError) : (0, cockatiel_1.handleWhen)(isTransientHttpError);
    const retryPolicy = (0, cockatiel_1.retry)(filter, {
        maxAttempts: 3,
        backoff: new cockatiel_1.ExponentialBackoff({ initialDelay: 200, maxDelay: 2000 }),
    });
    const breaker = (0, cockatiel_1.circuitBreaker)(filter, {
        halfOpenAfter: 10_000,
        breaker: new cockatiel_1.ConsecutiveBreaker(5),
    });
    const combined = (0, cockatiel_1.wrap)(breaker, retryPolicy);
    policies.set(key, combined);
    return combined;
}
async function executeResilient(name, work, kind = 'http') {
    return resiliencePolicy(name, kind).execute(work);
}
async function executeSql(name, work) {
    return executeResilient(name, async () => work(), 'sql');
}
/**
 * Fetch that retries 429/5xx/timeouts and trips a per-name circuit breaker.
 * Non-retryable statuses are returned as-is so callers can map 401/404.
 */
async function resilientFetch(name, url, init, fetchImpl = fetch) {
    const label = typeof url === 'string' || url instanceof URL ? String(url) : url.url;
    return executeResilient(name, async () => {
        const response = await fetchImpl(url, init);
        if (isRetryableHttpStatus(response.status)) {
            throw new RetryableHttpError(response.status, `HTTP ${response.status} ${label}`);
        }
        return response;
    });
}
/** Wrap a pg Pool.query-style function with the SQL policy. */
function wrapSqlQuery(name, query) {
    return (...args) => executeSql(name, () => query(...args));
}
//# sourceMappingURL=resilience.js.map