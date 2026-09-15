"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enterRlsContext = enterRlsContext;
exports.getRlsContext = getRlsContext;
exports.enterRlsFromRequest = enterRlsFromRequest;
exports.runAsWorker = runAsWorker;
exports.rlsActorHeaders = rlsActorHeaders;
exports.rlsSetupStatements = rlsSetupStatements;
const node_async_hooks_1 = require("node:async_hooks");
const EMPTY_USER = '00000000-0000-0000-0000-000000000000';
const rlsStorage = new node_async_hooks_1.AsyncLocalStorage();
function enterRlsContext(ctx) {
    rlsStorage.enterWith(ctx);
}
function getRlsContext() {
    return rlsStorage.getStore() ?? { mode: 'app', userId: EMPTY_USER };
}
function enterRlsFromRequest(headers, queryUserId) {
    const actor = headerValue(headers['x-actor-user-id']) ?? queryUserId;
    const mode = headerValue(headers['x-rls-mode']);
    if (actor && isUuid(actor)) {
        enterRlsContext({ mode: 'app', userId: actor });
        return;
    }
    if (mode === 'app') {
        enterRlsContext({ mode: 'app', userId: EMPTY_USER });
        return;
    }
    enterRlsContext({ mode: 'worker' });
}
function runAsWorker(fn) {
    return rlsStorage.run({ mode: 'worker' }, fn);
}
function rlsActorHeaders() {
    const ctx = getRlsContext();
    if (ctx.mode === 'app' && ctx.userId !== EMPTY_USER) {
        return { 'x-actor-user-id': ctx.userId };
    }
    return { 'x-rls-mode': 'worker' };
}
function rlsSetupStatements(ctx) {
    if (ctx.mode === 'worker') {
        return [{ text: 'SET LOCAL ROLE repodoctor_worker' }];
    }
    const claims = JSON.stringify({ sub: ctx.userId, role: 'authenticated' });
    return [
        { text: 'SET LOCAL ROLE repodoctor_app' },
        { text: "SELECT set_config('request.jwt.claim.sub', $1, true)", values: [ctx.userId] },
        { text: "SELECT set_config('request.jwt.claim.role', 'authenticated', true)" },
        { text: "SELECT set_config('request.jwt.claims', $1, true)", values: [claims] },
    ];
}
function headerValue(value) {
    if (typeof value === 'string')
        return value;
    if (Array.isArray(value) && typeof value[0] === 'string')
        return value[0];
    return undefined;
}
function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
//# sourceMappingURL=rls.js.map