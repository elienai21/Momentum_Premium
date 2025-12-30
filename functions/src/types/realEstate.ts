import { z } from "zod";

export const linkedEntityTypeEnum = z.enum([
  "contract",
  "unit",
  "building",
  "owner",
]);

export const documentStatusEnum = z.enum(["active", "archived"]);

export const documentSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  linkedEntityType: linkedEntityTypeEnum,
  linkedEntityId: z.string(),
  title: z.string(),
  docType: z.string(),
  tags: z.array(z.string()).default([]),
  validUntil: z.string().datetime().nullable(),
  version: z.number(),
  status: documentStatusEnum,
  storagePath: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().nonnegative(),
  checksum: z.string().nullable(),
  createdAt: z.string(),
  createdBy: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string(),
  versionKey: z.string().optional(),
});

export type RealEstateDocument = z.infer<typeof documentSchema>;

export const documentInitUploadSchema = z.object({
  linkedEntityType: linkedEntityTypeEnum,
  linkedEntityId: z.string().min(1),
  title: z.string().min(1),
  docType: z.string().min(1),
  tags: z.array(z.string()).default([]),
  validUntil: z.string().datetime().optional(),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  checksum: z.string().optional(),
});

export const documentCommitSchema = documentInitUploadSchema.extend({
  storagePath: z.string().min(1),
  uploadSessionId: z.string().min(1),
});

export const documentListQuerySchema = z.object({
  linkedEntityType: linkedEntityTypeEnum.optional(),
  linkedEntityId: z.string().optional(),
  docType: z.string().optional(),
  status: documentStatusEnum.optional(),
  validBefore: z.string().datetime().optional(),
  validAfter: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().optional(),
});

export const receivableStatusEnum = z.enum([
  "open",
  "partial",
  "paid",
  "overdue",
  "renegotiated",
]);

export const receivableSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  contractId: z.string(),
  unitId: z.string(),
  ownerId: z.string(),
  tenantName: z.string().optional(),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  dueDate: z.string().datetime(),
  amount: z.number().nonnegative(),
  amountPaid: z.number().nonnegative(),
  status: receivableStatusEnum,
  paidAt: z.string().datetime().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type RealEstateReceivable = z.infer<typeof receivableSchema>;

export const receivableGenerateBatchSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/),
});

export const receivableListQuerySchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  status: receivableStatusEnum.optional(),
  ownerId: z.string().optional(),
  unitId: z.string().optional(),
  contractId: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().optional(),
});

export const agingAnalyticsQuerySchema = z.object({
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const ownerStatementSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  ownerId: z.string(),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  unitIds: z.array(z.string()),
  totals: z.object({
    income: z.number().nonnegative(),
    expenses: z.number().nonnegative(),
    fees: z.number().nonnegative(),
    net: z.number(),
  }),
  generatedAt: z.string(),
  generatedBy: z.string(),
  htmlPath: z.string().optional(),
  pdfPath: z.string().optional(),
  status: z.enum(["ready", "failed"]),
  idempotencyKey: z.string(),
});

export type OwnerStatement = z.infer<typeof ownerStatementSchema>;

export const generateStatementSchema = z.object({
  ownerId: z.string().min(1),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  force: z.boolean().optional(),
});

export const statementListQuerySchema = z.object({
  ownerId: z.string().optional(),
  period: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().optional(),
});
