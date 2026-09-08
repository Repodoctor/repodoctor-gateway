"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompositeMessageBus = exports.HttpMessageBus = exports.CloudflareQueuesMessageBus = exports.LocalMessageBus = void 0;
exports.createLocalMessageBus = createLocalMessageBus;
/**
 * In-process bus for local development and tests.
 * Production uses the Cloudflare Queues adapter in each worker.
 */
class LocalMessageBus {
    handlers = new Map();
    processed = new Set();
    async publish(topic, message) {
        const handlers = this.handlers.get(topic);
        if (!handlers) {
            return;
        }
        const eventId = typeof message === 'object' &&
            message !== null &&
            'eventId' in message &&
            typeof message.eventId === 'string'
            ? message.eventId
            : undefined;
        if (eventId) {
            if (this.processed.has(`${topic}:${eventId}`)) {
                return;
            }
            this.processed.add(`${topic}:${eventId}`);
        }
        for (const handler of handlers) {
            await handler(message);
        }
    }
    async subscribe(topic, handler) {
        const set = this.handlers.get(topic) ?? new Set();
        set.add(handler);
        this.handlers.set(topic, set);
    }
}
exports.LocalMessageBus = LocalMessageBus;
function createLocalMessageBus() {
    return new LocalMessageBus();
}
/**
 * Production Cloudflare Queues adapter. Queue consumers are configured
 * outside the process (wrangler / Cloudflare). Fastify services on Render
 * typically use HttpMessageBus to fan out until a Queue binding is available.
 */
class CloudflareQueuesMessageBus {
    queue;
    constructor(queue) {
        this.queue = queue;
    }
    async publish(topic, message) {
        await this.queue.send({ topic, message });
    }
    async subscribe(_topic, _handler) {
        return;
    }
}
exports.CloudflareQueuesMessageBus = CloudflareQueuesMessageBus;
/**
 * HTTP fan-out bus for independently deployed services.
 * Subscribers expose POST /internal/events and verify the service token.
 */
class HttpMessageBus {
    targets;
    serviceToken;
    fetchImpl;
    constructor(targets, serviceToken, fetchImpl = fetch) {
        this.targets = targets;
        this.serviceToken = serviceToken;
        this.fetchImpl = fetchImpl;
    }
    async publish(topic, message) {
        if (this.targets.length === 0) {
            return;
        }
        const body = JSON.stringify({ topic, message });
        const results = await Promise.allSettled(this.targets.map(async (url) => {
            const response = await this.fetchImpl(url, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-service-token': this.serviceToken,
                },
                body,
            });
            if (!response.ok) {
                throw new Error(`event fan-out ${url} returned ${response.status}`);
            }
        }));
        const failures = results.filter((result) => result.status === 'rejected');
        if (failures.length === results.length) {
            const reason = failures[0] && failures[0].status === 'rejected' ? failures[0].reason : 'unknown';
            throw new Error(`event fan-out failed for all subscribers: ${String(reason)}`);
        }
    }
    async subscribe(_topic, _handler) {
        return;
    }
}
exports.HttpMessageBus = HttpMessageBus;
class CompositeMessageBus {
    buses;
    constructor(buses) {
        this.buses = buses;
    }
    async publish(topic, message) {
        for (const bus of this.buses) {
            await bus.publish(topic, message);
        }
    }
    async subscribe(topic, handler) {
        for (const bus of this.buses) {
            await bus.subscribe(topic, handler);
        }
    }
}
exports.CompositeMessageBus = CompositeMessageBus;
//# sourceMappingURL=bus.js.map