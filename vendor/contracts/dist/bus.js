"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalMessageBus = void 0;
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
//# sourceMappingURL=bus.js.map