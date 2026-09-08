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
