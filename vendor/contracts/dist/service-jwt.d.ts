/** Shared audience for service-to-service JWTs on the private network. */
export declare const INTERNAL_SERVICE_AUDIENCE = "repodoctor-internal";
export declare const SERVICE_ISSUERS: {
    readonly gateway: "repodoctor-gateway";
    readonly scm: "repodoctor-scm";
    readonly repository: "repodoctor-repository";
    readonly findings: "repodoctor-findings";
};
export declare function assertServiceIssuer(iss: string, allowed: readonly string[]): void;
export interface MintServiceJwtInput {
    secret: string;
    issuer: string;
    audience?: string;
    ttlSeconds: number;
}
export declare function mintServiceJwt(input: MintServiceJwtInput): Promise<string>;
export declare function verifyServiceJwt(token: string, secret: string, audience?: string | string[], allowedIssuers?: readonly string[]): Promise<{
    iss: string;
    sub: string;
    aud: string | string[];
}>;
export declare function assertInternalServiceToken(token: string, nodeEnv: string): string;
export declare function readServiceToken(headers: Record<string, unknown>): string | undefined;
