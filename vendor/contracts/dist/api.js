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
    auth: `${exports.API_PREFIX}/auth`,
    webhooks: `${exports.API_PREFIX}/webhooks/:provider`,
    webhooksGithub: `${exports.API_PREFIX}/webhooks/github`,
};
//# sourceMappingURL=api.js.map