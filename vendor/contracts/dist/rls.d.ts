export type RlsContext = {
    mode: 'app';
    userId: string;
} | {
    mode: 'worker';
};
export declare function enterRlsContext(ctx: RlsContext): void;
export declare function getRlsContext(): RlsContext;
export declare function enterRlsFromRequest(headers: Record<string, unknown>, queryUserId?: string): void;
export declare function runAsWorker<T>(fn: () => Promise<T>): Promise<T>;
export declare function rlsActorHeaders(): Record<string, string>;
export declare function rlsSetupStatements(ctx: RlsContext): Array<{
    text: string;
    values?: string[];
}>;
