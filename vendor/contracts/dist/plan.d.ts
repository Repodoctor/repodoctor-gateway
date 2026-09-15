/** Alpha billing: only the free plan is available. Paid plans will use Stripe later. */
export declare const FREE_PLAN: {
    readonly id: "free";
    readonly name: "Free";
    readonly maxOwnedWorkspaces: 2;
    readonly maxRepositoriesPerWorkspace: 20;
    readonly maxMembersPerWorkspace: 5;
    readonly maxPendingInvitesPerWorkspace: 10;
    readonly maxScmInstallationsPerWorkspace: 3;
    readonly maxManualAnalysisRunsPerRepositoryPerDay: 10;
};
export type FreePlan = typeof FREE_PLAN;
export type PlanId = FreePlan['id'];
/** Currently billable plan. Paid SKUs are not sold during alpha. */
export declare const CURRENT_PLAN: {
    readonly id: "free";
    readonly name: "Free";
    readonly maxOwnedWorkspaces: 2;
    readonly maxRepositoriesPerWorkspace: 20;
    readonly maxMembersPerWorkspace: 5;
    readonly maxPendingInvitesPerWorkspace: 10;
    readonly maxScmInstallationsPerWorkspace: 3;
    readonly maxManualAnalysisRunsPerRepositoryPerDay: 10;
};
