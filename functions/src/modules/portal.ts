import { db } from "src/services/firebase";





import { Request, Response, NextFunction, Router } from "express";
// FIX: Add import for type augmentations
import "../types";
import { requireAuth } from "../middleware/requireAuth";
import { z } from "zod";
import { ApiError } from "../utils/errors";
import { withTenant } from "../middleware/withTenant";
import { FirestoreAdapter } from "../core/adapters/firestore";
import { recordAudit } from "../core/audit";


export const portalRouter = Router();
portalRouter.use(requireAuth, withTenant);

const getRecordsQuerySchema = z.object({
    limit: z.preprocess((val) => (val ? Number(val) : undefined), z.number().int().positive().optional()),
    offset: z.preprocess((val) => (val ? Number(val) : undefined), z.number().int().nonnegative().optional()),
});

portalRouter.get("/records", async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.tenant) throw new ApiError(400, "Tenant context is required.");
        const options = getRecordsQuerySchema.parse(req.query);
        const db = new FirestoreAdapter(req.tenant.info.id);
        const data = await db.getRecords(options);
        res.json({ status: "success", data });
    } catch (err) {
        next(err);
    }
});

const addRecordBodySchema = z.object({
    description: z.string().min(1),
    amount: z.number(),
    category: z.string().min(1),
    type: z.enum(["Income", "Expense"]),
    installments: z.number().optional(),
    paymentMethod: z.string().optional(),
    date: z.string().optional(),
});

portalRouter.post("/records", async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.tenant) throw new ApiError(400, "Tenant context is required.");
        const tenantId = req.tenant.info.id;
        const record = addRecordBodySchema.parse(req.body);
        const db = new FirestoreAdapter(tenantId);
        const result = await db.addRecord(req.user!.uid, record);

        await recordAudit(
            "addRecord",
            req.user!.email!,
            `Added ${result.count} new transaction(s) for '${record.description}'.`,
            { tenantId, traceId: req.traceId }
        );

        if (result.needsReview) {
            res.status(201).json({
                status: "success",
                data: { count: result.count },
                message: `Transação registrada, mas o cartão '${result.paymentMethod}' não foi encontrado. Por favor, cadastre-o para gerenciar parcelas futuras.`
            });
        } else {
            res.status(201).json({ status: "success", data: { count: result.count } });
        }
    } catch (err) {
        next(err);
    }
});

portalRouter.get("/dashboard", async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.tenant) throw new ApiError(400, "Tenant context is required.");
        const db = new FirestoreAdapter(req.tenant.info.id);
        const data = await db.getDashboardData();
        res.json({ status: "success", data });
    } catch (err) {
        next(err);
    }
});

portalRouter.get("/health-score", async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.tenant) throw new ApiError(400, "Tenant context is required.");
        const docRef = db.collection(`tenants/${req.tenant.info.id}/insights`).doc("healthScore");
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            res.json({ status: "success", data: docSnap.data() });
        } else {
            res.json({
                status: "success",
                data: { score: 0, aiComment: "Análise de saúde financeira ainda não disponível." },
            });
        }
    } catch (err) {
        next(err);
    }
});


