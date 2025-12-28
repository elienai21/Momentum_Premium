import { db } from "src/services/firebase";
// ============================
// 💼 Accounts Module — v7.9+ com auditoria nova
// ============================

import { Request, Response, NextFunction, Router } from "express";
import "../../types";

import { z } from "zod";
import { requireAuth } from "../../middleware/requireAuth";
import { withTenant } from "../../middleware/withTenant";
// Mantém seu requireRole existente
import { requireRole } from "../../security/requireRole";
import { ApiError } from "../../utils/errors";
import { Account } from "../../types";
import { logger } from "../../utils/logger";
import { reconcileAccounts } from "../../ai/reconcileAccounts";
import { exportAccountsReport } from "../../reports/exportAccountsReport";
// 🔎 Novo: usa o sistema de auditoria unificado
import { logActionFromRequest } from "../audit/auditService";

export const accountsRouter = Router();
accountsRouter.use(requireAuth, withTenant);

// ============================
// 🔹 Schemas
// ============================
const createAccountSchema = z.object({
  type: z.enum(["payable", "receivable"]),
  description: z.string().min(3),
  amount: z.number().positive(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  method: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

const accountReviewSchema = z.object({
  notes: z.string().optional(),
});

// ============================
// 🧾 Create a new account
// ============================
accountsRouter.post(
  "/",
  requireRole("admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.tenant) throw new ApiError(400, "Tenant context is required.");
      const tenantId = req.tenant.info.id;

      const data = createAccountSchema.parse(req.body);
      const dualValidation = req.tenant.info.features?.dualValidation || false;

      const newAccount: Omit<Account, "id"> = {
        ...data,
        status: "pending",
        dualValidation,
        createdAt: new Date().toISOString(),
      };

      const docRef = await db
        .collection(`tenants/${tenantId}/accounts`)
        .add(newAccount);

      // 🔎 Auditoria unificada
      await logActionFromRequest(req, "account.create", {
        tenantId,
        accountId: docRef.id,
        description: data.description,
        amount: data.amount,
        type: data.type,
      });

      res
        .status(201)
        .json({ status: "success", data: { id: docRef.id, ...newAccount } });
    } catch (err) {
      next(err);
    }
  }
);

// ============================
// 🧩 Review (first validation)
// ============================
accountsRouter.post(
  "/:accountId/review",
  requireRole("admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.tenant) throw new ApiError(400, "Tenant context is required.");
      const tenantId = req.tenant.info.id;
      const userEmail = (req as any)?.user?.email ?? "anonymous";

      const { accountId } = req.params;
      const { notes } = accountReviewSchema.parse(req.body);

      const ref = db.doc(`tenants/${tenantId}/accounts/${accountId}`);
      const doc = await ref.get();
      if (!doc.exists) throw new ApiError(404, "Account not found.");

      const account = doc.data() as Account;
      if (account.status !== "pending" && account.status !== "overdue") {
        throw new ApiError(
          400,
          `Cannot review an account with status '${account.status}'.`
        );
      }

      if (account.dualValidation) {
        await ref.update({
          status: "under_review",
          reviewedBy: userEmail,
          notes,
        });

        await logActionFromRequest(req, "account.review", {
          tenantId,
          accountId,
          description: account.description,
          amount: account.amount,
          dualValidation: account.dualValidation,
        });

        res.json({
          status: "success",
          message: "Account reviewed, awaiting final approval.",
        });
      } else {
        await ref.update({
          status: "paid",
          paidAt: new Date().toISOString(),
          approvedBy: userEmail,
          notes,
        });

        await logActionFromRequest(req, "account.pay.single", {
          tenantId,
          accountId,
          description: account.description,
          amount: account.amount,
          dualValidation: account.dualValidation,
        });

        res.json({ status: "success", message: "Account marked as paid." });
      }
    } catch (err) {
      next(err);
    }
  }
);

// ============================
// ✅ Approval (final step)
// ============================
accountsRouter.post(
  "/:accountId/approve",
  requireRole("admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.tenant) throw new ApiError(400, "Tenant context is required.");
      const tenantId = req.tenant.info.id;
      const userEmail = (req as any)?.user?.email ?? "anonymous";

      const { accountId } = req.params;
      const ref = db.doc(`tenants/${tenantId}/accounts/${accountId}`);
      const doc = await ref.get();
      if (!doc.exists) throw new ApiError(404, "Account not found.");

      const account = doc.data() as Account;
      if (!account.dualValidation)
        throw new ApiError(
          400,
          "This account does not require dual validation approval."
        );
      if (account.status !== "under_review") {
        throw new ApiError(
          400,
          `Cannot approve an account with status '${account.status}'.`
        );
      }
      if (account.reviewedBy === userEmail) {
        throw new ApiError(403, "The same user who reviewed cannot approve.");
      }

      await ref.update({
        status: "paid",
        approvedBy: userEmail,
        paidAt: new Date().toISOString(),
      });

      await logActionFromRequest(req, "account.approve", {
        tenantId,
        accountId,
        description: account.description,
        amount: account.amount,
      });

      res.json({ status: "success", message: "Payment approved and finalized." });
    } catch (err) {
      next(err);
    }
  }
);

// ============================
// 📋 List accounts
// ============================
accountsRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.tenant) throw new ApiError(400, "Tenant context is required.");

      let query = db
        .collection(`tenants/${req.tenant.info.id}/accounts`)
        .orderBy("dueDate", "asc");

      if (req.query.status)
        query = query.where("status", "==", req.query.status as string);
      if (req.query.type)
        query = query.where("type", "==", req.query.type as string);
      if (req.query.start)
        query = query.where("dueDate", ">=", req.query.start as string);
      if (req.query.end)
        query = query.where("dueDate", "<=", req.query.end as string);

      if (req.query.dueDate === "today") {
        const today = new Date().toISOString().split("T")[0];
        query = query.where("dueDate", "==", today);
      }

      const snapshot = await query.limit(100).get();
      const accounts = snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // 🔎 Auditoria de listagem
      await logActionFromRequest(req, "account.list", {
        count: accounts.length,
        status: req.query.status,
        type: req.query.type,
      });

      res.json({ status: "success", data: accounts });
    } catch (err) {
      next(err);
    }
  }
);

// ============================
// 🤖 AI Reconciliation
// ============================
const reconcileSchema = z.object({ statementText: z.string().min(10) });

accountsRouter.post(
  "/reconcile",
  requireRole("admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.tenant) throw new ApiError(400, "Tenant context is required.");
      const tenantId = req.tenant.info.id;

      if (!req.tenant.flags.aiReconciliation)
        throw new ApiError(403, "AI reconciliation feature not enabled.");

      const { statementText } = reconcileSchema.parse(req.body);
      const result = await reconcileAccounts(tenantId, statementText);

      await logActionFromRequest(req, "account.reconcile.ai", {
        tenantId,
        matches: result.matches?.length ?? 0,
        updatedCount: result.updatedCount,
      });

      res.json({ status: "success", data: result });
    } catch (err) {
      next(err);
    }
  }
);

// ============================
// 📤 Export CSV Report
// ============================
accountsRouter.get(
  "/export.csv",
  requireRole("admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.tenant) throw new ApiError(400, "Tenant context is required.");
      const tenantId = req.tenant.info.id;

      if (!req.tenant.flags.pdfExport)
        throw new ApiError(403, "CSV/PDF export feature not enabled.");

      const options = {
        status: req.query.status as any,
        type: req.query.type as any,
      };

      const tenantName = req.tenant.info.name || tenantId;

      const csvData = await exportAccountsReport(tenantId, tenantName, options);

      await logActionFromRequest(req, "account.export.csv", {
        tenantId,
        filters: options,
      });

      res.header("Content-Type", "text/csv");
      res.attachment("report.csv");
      res.send(csvData);
    } catch (err) {
      next(err);
    }
  }
);

// ============================
// 🧾 Batch confirmation
// ============================
accountsRouter.post(
  "/confirm-batch",
  requireRole("admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.tenant) throw new ApiError(400, "Tenant context is required.");
      const tenantId = req.tenant.info.id;
      const userEmail = (req as any)?.user?.email ?? "anonymous";

      const { ids } = z
        .object({ ids: z.array(z.string()).min(1) })
        .parse(req.body);

      const batch = db.batch();
      const collectionRef = db.collection(`tenants/${tenantId}/accounts`);
      const now = new Date().toISOString();

      ids.forEach((id) => {
        batch.update(collectionRef.doc(id), {
          status: "paid",
          paidAt: now,
          approvedBy: userEmail,
        });
      });

      await batch.commit();

      await logActionFromRequest(req, "account.confirm.batch", {
        tenantId,
        count: ids.length,
        accountIds: ids,
      });

      res.json({ status: "success", data: { count: ids.length } });
    } catch (err) {
      next(err);
    }
  }
);

export default accountsRouter;


