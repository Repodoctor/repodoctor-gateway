export interface ScmFile {
    path: string;
    type: 'file' | 'dir';
    sha?: string;
    size?: number;
}
export interface ScmPullRequest {
    id: string;
    number: number;
    title: string;
    body: string;
    sourceBranch: string;
    targetBranch: string;
    author: string;
    url: string;
    draft: boolean;
}
export interface ScmCommit {
    sha: string;
    message: string;
    author: string;
    committedAt: string;
}
export interface ScmCiStatus {
    state: 'pending' | 'success' | 'failure' | 'error' | 'unknown';
    targetUrl?: string;
    description?: string;
}
export interface ScmReview {
    body: string;
    event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
}
/**
 * Provider-neutral source-control interface.
 * GitHub is implemented first; GitLab, Bitbucket, and Azure DevOps adapters
 * must satisfy this contract without changing analyzer business logic.
 */
export interface SourceControlProvider {
    getRepositories(): Promise<Array<{
        id: string;
        fullName: string;
        defaultBranch: string;
    }>>;
    getRepository(id: string): Promise<{
        id: string;
        fullName: string;
        defaultBranch: string;
    }>;
    getFileTree(repositoryId: string, ref: string): Promise<ScmFile[]>;
    getFile(repositoryId: string, path: string, ref: string): Promise<string>;
    getPullRequest(repositoryId: string, number: number): Promise<ScmPullRequest>;
    getPullRequestDiff(repositoryId: string, number: number): Promise<string>;
    getCommits(repositoryId: string, ref: string): Promise<ScmCommit[]>;
    getCIStatus(repositoryId: string, sha: string): Promise<ScmCiStatus>;
    createIssue(repositoryId: string, title: string, body: string): Promise<{
        id: string;
        url: string;
    }>;
    createPullRequest(repositoryId: string, input: {
        title: string;
        body: string;
        head: string;
        base: string;
    }): Promise<ScmPullRequest>;
    createReview(repositoryId: string, number: number, review: ScmReview): Promise<{
        id: string;
    }>;
    createBranch(repositoryId: string, name: string, fromSha: string): Promise<void>;
    createCommit(repositoryId: string, input: {
        branch: string;
        message: string;
        files: Array<{
            path: string;
            content: string;
        }>;
    }): Promise<ScmCommit>;
    createComment(repositoryId: string, number: number, body: string): Promise<{
        id: string;
    }>;
}
