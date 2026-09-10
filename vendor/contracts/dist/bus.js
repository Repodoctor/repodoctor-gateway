"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompositeMessageBus = exports.HttpMessageBus = exports.CloudflareQueuesMessageBus = exports.LocalMessageBus = void 0;
exports.createLocalMessageBus = createLocalMessageBus;
const resilience_1 = require("./resilience");
/**
 * In-process bus for local development and tests.
 * Production Coolify services use HttpMessageBus (`EVENT_HTTP_TARGETS`) until
 * durable queues live in Supabase.
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
 * Optional queue adapter for a future durable bus (Supabase).
 * Production Coolify services use HttpMessageBus today. Do not bind this to
 * Cloudflare Queues — Cloudflare hosts only the dashboard, DNS, and WAF.
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
async function resolveServiceToken(source) {
    return typeof source === 'function' ? source() : source;
}
/**
 * HTTP fan-out bus for independently deployed services.
 * Subscribers expose POST /internal/events and verify a short-lived service JWT.
 * Durable queues belong in Supabase, not Cloudflare.
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
        const token = await resolveServiceToken(this.serviceToken);
        const body = JSON.stringify({ topic, message });
        const results = await Promise.allSettled(this.targets.map(async (url) => {
            const response = await (0, resilience_1.resilientFetch)(`event-bus:${url}`, url, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    authorization: `Bearer ${token}`,
                    'x-service-token': token,
                },
                body,
                signal: AbortSignal.timeout(10000),
            }, this.fetchImpl);
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