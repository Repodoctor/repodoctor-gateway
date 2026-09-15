"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CURRENT_PLAN = exports.FREE_PLAN = void 0;
/** Alpha billing: only the free plan is available. Paid plans will use Stripe later. */
exports.FREE_PLAN = {
    id: 'free',
    name: 'Free',
    maxOwnedWorkspaces: 2,
    maxRepositoriesPerWorkspace: 20,
    maxMembersPerWorkspace: 5,
    maxPendingInvitesPerWorkspace: 10,
    maxScmInstallationsPerWorkspace: 3,
    maxManualAnalysisRunsPerRepositoryPerDay: 10,
};
/** Currently billable plan. Paid SKUs are not sold during alpha. */
exports.CURRENT_PLAN = exports.FREE_PLAN;
//# sourceMappingURL=plan.js.map