"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findingFingerprint = findingFingerprint;
const node_crypto_1 = require("node:crypto");
function findingFingerprint(input) {
    const canonical = [
        input.source.trim().toLowerCase(),
        input.ruleId.trim(),
        (input.filePath ?? '').replaceAll('\\', '/'),
        String(input.lineNumber ?? ''),
        (input.title ?? '').trim().toLowerCase(),
    ].join('|');
    return (0, node_crypto_1.createHash)('sha256').update(canonical).digest('hex');
}
//# sourceMappingURL=fingerprint.js.map