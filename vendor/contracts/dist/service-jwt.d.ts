/** Shared audience for service-to-service JWTs on the private network. */
export declare const INTERNAL_SERVICE_AUDIENCE = "repodoctor-internal";
export interface MintServiceJwtInput {
    secret: string;
    issuer: string;
    audience?: string;
    ttlSeconds: number;
}
export declare function mintServiceJwt(input: MintServiceJwtInput): Promise<string>;
export declare function verifyServiceJwt(token: string, secret: string, audience?: string | string[]): Promise<{
    iss: string;
    sub: string;
    aud: string | string[];
}>;
export declare function assertInternalServiceToken(token: string, nodeEnv: string): string;
export declare function readServiceToken(headers: Record<string, unknown>): string | undefined;
