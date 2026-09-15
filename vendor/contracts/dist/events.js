"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inboundEventSchema = exports.domainEventSchema = exports.Topics = exports.eventTopicSchema = void 0;
exports.createDomainEvent = createDomainEvent;
const zod_1 = require("zod");
exports.eventTopicSchema = zod_1.z.enum([
    'repository.connected',
    'repository.created',
    'repository.updated',
    'repository.disconnected',
    'installation.synced',
    'pull_request.opened',
    'pull_request.updated',
    'analysis.requested',
    'analysis.started',
    'analysis.completed',
    'analysis.failed',
    'finding.created',
    'finding.resolved',
    'finding.ignored',
]);
exports.Topics = {
    REPOSITORY_CONNECTED: 'repository.connected',
    REPOSITORY_CREATED: 'repository.created',
    REPOSITORY_UPDATED: 'repository.updated',
    REPOSITORY_DISCONNECTED: 'repository.disconnected',
    INSTALLATION_SYNCED: 'installation.synced',
    PULL_REQUEST_OPENED: 'pull_request.opened',
    PULL_REQUEST_UPDATED: 'pull_request.updated',
    ANALYSIS_REQUESTED: 'analysis.requested',
    ANALYSIS_STARTED: 'analysis.started',
    ANALYSIS_COMPLETED: 'analysis.completed',
    ANALYSIS_FAILED: 'analysis.failed',
    FINDING_CREATED: 'finding.created',
    FINDING_RESOLVED: 'finding.resolved',
    FINDING_IGNORED: 'finding.ignored',
};
exports.domainEventSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid(),
    topic: exports.eventTopicSchema,
    occurredAt: zod_1.z.string().datetime(),
    correlationId: zod_1.z.string(),
    workspaceId: zod_1.z.string().uuid(),
    repositoryId: zod_1.z.string().uuid().optional(),
    actorUserId: zod_1.z.string().uuid().optional(),
    payload: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
});
exports.inboundEventSchema = zod_1.z.object({
    topic: exports.eventTopicSchema,
    message: exports.domainEventSchema,
});
function createDomainEvent(input) {
    return {
        eventId: input.eventId,
        topic: input.topic,
        occurredAt: input.occurredAt ?? new Date().toISOString(),
        correlationId: input.correlationId,
        workspaceId: input.workspaceId,
        repositoryId: input.repositoryId,
        actorUserId: input.actorUserId,
        payload: input.payload,
    };
}
//# sourceMappingURL=events.js.map