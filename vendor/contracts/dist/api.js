"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiPaths = exports.API_PREFIX = void 0;
exports.API_PREFIX = '/api/v1';
exports.ApiPaths = {
    users: `${exports.API_PREFIX}/users`,
    organizations: `${exports.API_PREFIX}/organizations`,
    repositories: `${exports.API_PREFIX}/repositories`,
    analysis: `${exports.API_PREFIX}/analysis`,
    findings: `${exports.API_PREFIX}/findings`,
    reviews: `${exports.API_PREFIX}/reviews`,
    security: `${exports.API_PREFIX}/security`,
    dependencies: `${exports.API_PREFIX}/dependencies`,
    graph: `${exports.API_PREFIX}/graph`,
    ci: `${exports.API_PREFIX}/ci`,
    docs: `${exports.API_PREFIX}/docs`,
    ai: `${exports.API_PREFIX}/ai`,
    remediation: `${exports.API_PREFIX}/remediation`,
    notifications: `${exports.API_PREFIX}/notifications`,
    auth: `${exports.API_PREFIX}/auth`,
};
//# sourceMappingURL=api.js.map