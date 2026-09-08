"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.domainEventSchema = exports.Topics = exports.eventTopicSchema = void 0;
exports.createDomainEvent = createDomainEvent;
const zod_1 = require("zod");
exports.eventTopicSchema = zod_1.z.enum([
    'repository.connected',
    'repository.created',
    'repository.updated',
    'pull_request.opened',
    'pull_request.updated',
    'analysis.requested',
    'analysis.started',
    'analysis.completed',
    'analysis.failed',
    'repograph.analysis.completed',
    'security.scan.completed',
    'dependency.scan.completed',
    'documentation.generated',
    'ci.run.failed',
    'ci.failure.analyzed',
    'code-review.requested',
    'code-review.completed',
    'finding.created',
    'finding.resolved',
    'finding.ignored',
    'remediation.requested',
    'remediation.completed',
]);
exports.Topics = {
    REPOSITORY_CONNECTED: 'repository.connected',
    REPOSITORY_CREATED: 'repository.created',
    REPOSITORY_UPDATED: 'repository.updated',
    PULL_REQUEST_OPENED: 'pull_request.opened',
    PULL_REQUEST_UPDATED: 'pull_request.updated',
    ANALYSIS_REQUESTED: 'analysis.requested',
    ANALYSIS_STARTED: 'analysis.started',
    ANALYSIS_COMPLETED: 'analysis.completed',
    ANALYSIS_FAILED: 'analysis.failed',
    REPOGRAPH_ANALYSIS_COMPLETED: 'repograph.analysis.completed',
    SECURITY_SCAN_COMPLETED: 'security.scan.completed',
    DEPENDENCY_SCAN_COMPLETED: 'dependency.scan.completed',
    DOCUMENTATION_GENERATED: 'documentation.generated',
    CI_RUN_FAILED: 'ci.run.failed',
    CI_FAILURE_ANALYZED: 'ci.failure.analyzed',
    CODE_REVIEW_REQUESTED: 'code-review.requested',
    CODE_REVIEW_COMPLETED: 'code-review.completed',
    FINDING_CREATED: 'finding.created',
    FINDING_RESOLVED: 'finding.resolved',
    FINDING_IGNORED: 'finding.ignored',
    REMEDIATION_REQUESTED: 'remediation.requested',
    REMEDIATION_COMPLETED: 'remediation.completed',
};
exports.domainEventSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid(),
    topic: exports.eventTopicSchema,
    occurredAt: zod_1.z.string().datetime(),
    correlationId: zod_1.z.string(),
    organizationId: zod_1.z.string().uuid(),
    repositoryId: zod_1.z.string().uuid().optional(),
    actorUserId: zod_1.z.string().uuid().optional(),
    payload: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
});
function createDomainEvent(input) {
    return {
        eventId: input.eventId,
        topic: input.topic,
        occurredAt: input.occurredAt ?? new Date().toISOString(),
        correlationId: input.correlationId,
        organizationId: input.organizationId,
        repositoryId: input.repositoryId,
        actorUserId: input.actorUserId,
        payload: input.payload,
    };
}
//# sourceMappingURL=events.js.map