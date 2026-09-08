"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginationQuerySchema = void 0;
exports.paginatedResponseSchema = paginatedResponseSchema;
const zod_1 = require("zod");
exports.paginationQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    pageSize: zod_1.z.coerce.number().int().positive().max(100).default(20),
});
function paginatedResponseSchema(item) {
    return zod_1.z.object({
        items: zod_1.z.array(item),
        page: zod_1.z.number().int(),
        pageSize: zod_1.z.number().int(),
        total: zod_1.z.number().int(),
    });
}
//# sourceMappingURL=pagination.js.map