"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statementListQuerySchema = exports.generateStatementSchema = exports.ownerStatementSchema = exports.agingAnalyticsQuerySchema = exports.receivableListQuerySchema = exports.receivableGenerateBatchSchema = exports.receivableSchema = exports.receivableStatusEnum = exports.documentListQuerySchema = exports.documentCommitSchema = exports.documentInitUploadSchema = exports.documentSchema = exports.documentStatusEnum = exports.linkedEntityTypeEnum = void 0;
const zod_1 = require("zod");
exports.linkedEntityTypeEnum = zod_1.z.enum([
    "contract",
    "unit",
    "building",
    "owner",
]);
exports.documentStatusEnum = zod_1.z.enum(["active", "archived"]);
exports.documentSchema = zod_1.z.object({
    id: zod_1.z.string(),
    tenantId: zod_1.z.string(),
    linkedEntityType: exports.linkedEntityTypeEnum,
    linkedEntityId: zod_1.z.string(),
    title: zod_1.z.string(),
    docType: zod_1.z.string(),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    validUntil: zod_1.z.string().datetime().nullable(),
    version: zod_1.z.number(),
    status: exports.documentStatusEnum,
    storagePath: zod_1.z.string(),
    fileName: zod_1.z.string(),
    mimeType: zod_1.z.string(),
    sizeBytes: zod_1.z.number().nonnegative(),
    checksum: zod_1.z.string().nullable(),
    createdAt: zod_1.z.string(),
    createdBy: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
    updatedBy: zod_1.z.string(),
    versionKey: zod_1.z.string().optional(),
});
exports.documentInitUploadSchema = zod_1.z.object({
    linkedEntityType: exports.linkedEntityTypeEnum,
    linkedEntityId: zod_1.z.string().min(1),
    title: zod_1.z.string().min(1),
    docType: zod_1.z.string().min(1),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    validUntil: zod_1.z.string().datetime().optional(),
    fileName: zod_1.z.string().min(1),
    mimeType: zod_1.z.string().min(1),
    sizeBytes: zod_1.z.number().int().nonnegative(),
    checksum: zod_1.z.string().optional(),
});
exports.documentCommitSchema = exports.documentInitUploadSchema.extend({
    storagePath: zod_1.z.string().min(1),
    uploadSessionId: zod_1.z.string().min(1),
});
exports.documentListQuerySchema = zod_1.z.object({
    linkedEntityType: exports.linkedEntityTypeEnum.optional(),
    linkedEntityId: zod_1.z.string().optional(),
    docType: zod_1.z.string().optional(),
    status: exports.documentStatusEnum.optional(),
    validBefore: zod_1.z.string().datetime().optional(),
    validAfter: zod_1.z.string().datetime().optional(),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional(),
    cursor: zod_1.z.string().optional(),
});
exports.receivableStatusEnum = zod_1.z.enum([
    "open",
    "partial",
    "paid",
    "overdue",
    "renegotiated",
]);
exports.receivableSchema = zod_1.z.object({
    id: zod_1.z.string(),
    tenantId: zod_1.z.string(),
    contractId: zod_1.z.string(),
    unitId: zod_1.z.string(),
    ownerId: zod_1.z.string(),
    tenantName: zod_1.z.string().optional(),
    period: zod_1.z.string().regex(/^\d{4}-\d{2}$/),
    dueDate: zod_1.z.string().datetime(),
    amount: zod_1.z.number().nonnegative(),
    amountPaid: zod_1.z.number().nonnegative(),
    status: exports.receivableStatusEnum,
    paidAt: zod_1.z.string().datetime().nullable(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
});
exports.receivableGenerateBatchSchema = zod_1.z.object({
    period: zod_1.z.string().regex(/^\d{4}-\d{2}$/),
});
exports.receivableListQuerySchema = zod_1.z.object({
    period: zod_1.z.string().regex(/^\d{4}-\d{2}$/).optional(),
    status: exports.receivableStatusEnum.optional(),
    ownerId: zod_1.z.string().optional(),
    unitId: zod_1.z.string().optional(),
    contractId: zod_1.z.string().optional(),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional(),
    cursor: zod_1.z.string().optional(),
});
exports.agingAnalyticsQuerySchema = zod_1.z.object({
    asOf: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
exports.ownerStatementSchema = zod_1.z.object({
    id: zod_1.z.string(),
    tenantId: zod_1.z.string(),
    ownerId: zod_1.z.string(),
    period: zod_1.z.string().regex(/^\d{4}-\d{2}$/),
    unitIds: zod_1.z.array(zod_1.z.string()),
    totals: zod_1.z.object({
        income: zod_1.z.number().nonnegative(),
        expenses: zod_1.z.number().nonnegative(),
        fees: zod_1.z.number().nonnegative(),
        net: zod_1.z.number(),
    }),
    generatedAt: zod_1.z.string(),
    generatedBy: zod_1.z.string(),
    htmlPath: zod_1.z.string().optional(),
    pdfPath: zod_1.z.string().optional(),
    status: zod_1.z.enum(["ready", "failed"]),
    idempotencyKey: zod_1.z.string(),
});
exports.generateStatementSchema = zod_1.z.object({
    ownerId: zod_1.z.string().min(1),
    period: zod_1.z.string().regex(/^\d{4}-\d{2}$/),
    force: zod_1.z.boolean().optional(),
});
exports.statementListQuerySchema = zod_1.z.object({
    ownerId: zod_1.z.string().optional(),
    period: zod_1.z.string().regex(/^\d{4}-\d{2}$/).optional(),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional(),
    cursor: zod_1.z.string().optional(),
});
