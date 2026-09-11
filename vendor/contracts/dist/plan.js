"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CURRENT_PLAN = exports.FREE_PLAN = void 0;
/** Alpha billing: only the free plan is available. Paid plans will use Stripe later. */
exports.FREE_PLAN = {
    id: 'free',
    name: 'Free',
    maxOwnedOrganizations: 2,
    maxRepositoriesPerOrganization: 20,
    maxMembersPerOrganization: 5,
    maxPendingInvitesPerOrganization: 10,
    maxScmInstallationsPerOrganization: 1,
    maxManualAnalysisRunsPerRepositoryPerDay: 10,
};
/** Currently billable plan. Paid SKUs are not sold during alpha. */
exports.CURRENT_PLAN = exports.FREE_PLAN;
//# sourceMappingURL=plan.js.map