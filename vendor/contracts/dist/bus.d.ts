export interface MessageBus {
    publish<T>(topic: string, message: T): Promise<void>;
    subscribe<T>(topic: string, handler: (message: T) => Promise<void>): Promise<void>;
}
/**
 * In-process bus for local development and tests.
 * Production Coolify services use HttpMessageBus (`EVENT_HTTP_TARGETS`) until
 * durable queues live in Supabase.
 */
export declare class LocalMessageBus implements MessageBus {
    private readonly handlers;
    private readonly processed;
    publish<T>(topic: string, message: T): Promise<void>;
    subscribe<T>(topic: string, handler: (message: T) => Promise<void>): Promise<void>;
}
export declare function createLocalMessageBus(): MessageBus;
export interface QueueSender {
    send(body: unknown): Promise<void>;
}
/**
 * Optional queue adapter for a future durable bus (Supabase).
 * Production Coolify services use HttpMessageBus today. Do not bind this to
 * Cloudflare Queues — Cloudflare hosts only the dashboard, DNS, and WAF.
 */
export declare class CloudflareQueuesMessageBus implements MessageBus {
    private readonly queue;
    constructor(queue: QueueSender);
    publish<T>(topic: string, message: T): Promise<void>;
    subscribe<T>(_topic: string, _handler: (message: T) => Promise<void>): Promise<void>;
}
export type ServiceTokenSource = string | (() => string | Promise<string>);
/**
 * HTTP fan-out bus for independently deployed services.
 * Subscribers expose POST /internal/events and verify a short-lived service JWT.
 * Durable queues belong in Supabase, not Cloudflare.
 */
export declare class HttpMessageBus implements MessageBus {
    private readonly targets;
    private readonly serviceToken;
    private readonly fetchImpl;
    constructor(targets: string[], serviceToken: ServiceTokenSource, fetchImpl?: typeof fetch);
    publish<T>(topic: string, message: T): Promise<void>;
    subscribe<T>(_topic: string, _handler: (message: T) => Promise<void>): Promise<void>;
}
export declare class CompositeMessageBus implements MessageBus {
    private readonly buses;
    constructor(buses: MessageBus[]);
    publish<T>(topic: string, message: T): Promise<void>;
    subscribe<T>(topic: string, handler: (message: T) => Promise<void>): Promise<void>;
}
