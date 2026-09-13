import type { AnalysisTrigger, AnalysisType } from './analysis';
import type { ScmProvider } from './repositories';
export interface RepositoryConnectedPayload {
    installationId: string;
    scmProvider: ScmProvider;
    scmRepositoryId: string;
    owner: string;
    name: string;
    fullName: string;
    defaultBranch: string;
    private: boolean;
    url: string;
    commitSha?: string;
    requestAnalysis?: boolean;
    [key: string]: unknown;
}
export interface RepositoryUpdatedPayload {
    scmProvider: ScmProvider;
    scmRepositoryId: string;
    commitSha: string;
    branch: string;
    trigger: AnalysisTrigger;
    [key: string]: unknown;
}
export interface RepositoryDisconnectedPayload {
    scmProvider: ScmProvider;
    scmRepositoryId: string;
    installationId?: string;
    [key: string]: unknown;
}
export interface InstallationSyncedPayload {
    installationId: string;
    scmProvider: ScmProvider;
    scmRepositoryIds: string[];
    [key: string]: unknown;
}
export interface PullRequestOpenedPayload {
    scmProvider: ScmProvider;
    scmRepositoryId: string;
    number: number;
    title: string;
    sourceBranch: string;
    targetBranch: string;
    commitSha: string;
    url: string;
    [key: string]: unknown;
}
export interface AnalysisRequestedPayload {
    analysisRunId: string;
    type: AnalysisType;
    trigger: AnalysisTrigger;
    commitSha: string;
    branch: string;
    [key: string]: unknown;
}
export interface AnalysisLifecyclePayload {
    analysisRunId: string;
    error?: string | null;
    [key: string]: unknown;
}
