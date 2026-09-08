export interface MessageBus {
    publish<T>(topic: string, message: T): Promise<void>;
    subscribe<T>(topic: string, handler: (message: T) => Promise<void>): Promise<void>;
}
/**
 * In-process bus for local development and tests.
 * Production uses the Cloudflare Queues adapter in each worker.
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
 * Production Cloudflare Queues adapter. Queue consumers are configured
 * outside the process (wrangler / Cloudflare). Fastify services on Render
 * typically use HttpMessageBus to fan out until a Queue binding is available.
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
