import { BrokenCircuitError, type IPolicy } from 'cockatiel';
export { BrokenCircuitError };
export declare class RetryableHttpError extends Error {
    readonly status: number;
    constructor(status: number, message: string);
}
export declare function isRetryableHttpStatus(status: number): boolean;
export declare function isTransientSqlError(error: unknown): boolean;
/**
 * Named Cockatiel retry + circuit breaker. Share the name across callers of
 * the same dependency (e.g. `github-api`, `gateway-scm`) so the breaker state
 * is per-destination, not global.
 */
export declare function resiliencePolicy(name: string, kind?: 'http' | 'sql'): IPolicy;
export declare function executeResilient<T>(name: string, work: () => Promise<T>, kind?: 'http' | 'sql'): Promise<T>;
export declare function executeSql<T>(name: string, work: () => Promise<T> | T): Promise<T>;
/**
 * Fetch that retries 429/5xx/timeouts and trips a per-name circuit breaker.
 * Non-retryable statuses are returned as-is so callers can map 401/404.
 */
export declare function resilientFetch(name: string, url: Parameters<typeof fetch>[0], init?: RequestInit, fetchImpl?: typeof fetch): Promise<Response>;
/** Wrap a pg Pool.query-style function with the SQL policy. */
export declare function wrapSqlQuery<A extends unknown[], R>(name: string, query: (...args: A) => Promise<R>): (...args: A) => Promise<R>;
