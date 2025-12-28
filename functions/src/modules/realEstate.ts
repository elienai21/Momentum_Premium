// functions/src/modules/realEstate.ts
import { Router, Request, Response } from "express";
import * as admin from "firebase-admin";
import crypto from "crypto";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
export const realEstateRouter = Router();

type PayoutDoc = {
  ownerId?: string;
  ownerName?: string;
  unitCode?: string;
  month?: string; // "2025-12"
  grossRevenue?: number;
  platformFees?: number;
  cleaningFees?: number;
  otherCosts?: number;
  ownerPayout?: number;
};

type OwnerSummary = {
  ownerId: string;
  ownerName: string;
  units: number;
  grossRevenue: number;
  platformFees: number;
  cleaningFees: number;
  otherCosts: number;
  ownerPayout: number;
};

type RealEstateSummaryResponse = {
  ok: true;
  hasData: boolean;
  tenantId: string;
  month: string; // "YYYY-MM"
  totals: {
    grossRevenue: number;
    platformFees: number;
    cleaningFees: number;
    otherCosts: number;
    ownerPayout: number;
  };
  owners: OwnerSummary[];
  meta: {
    traceId: string;
    latency_ms: number;
    sources?: string[];
    rawCount: number;
  };
};

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function getDefaultMonth(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * GET /api/realestate/summary?tenantId=...&month=YYYY-MM
 *
 * Coleção alvo:
 *  tenants/{tenantId}/realEstatePayouts
 *
 * Cada doc (linha de repasse) deve seguir a estrutura aproximada:
 *  {
 *    ownerId: "owner_123",
 *    ownerName: "João Silva",
 *    unitCode: "VN Turiassu 311",
 *    month: "2025-12",
 *    grossRevenue: 10000,
 *    platformFees: 1500,
 *    cleaningFees: 800,
 *    otherCosts: 700,
 *    ownerPayout: 7000
 *  }
 */
realEstateRouter.get(
  "/summary",
  async (req: Request, res: Response): Promise<void> => {
    const t0 = Date.now();
    const traceId =
      (req.headers["x-trace-id"] as string) ?? crypto.randomUUID();

    try {
      const tenantId =
        (req as any).tenant?.id ||
        (req as any).tenant?.info?.id ||
        (req.query.tenantId as string);

      if (!tenantId) {
        res.status(400).json({
          ok: false,
          error: "tenant_required",
          traceId,
        });
        return;
      }

      const month = (req.query.month as string) || getDefaultMonth();

      const colPath = `tenants/${tenantId}/realEstatePayouts`;
      const snap = await db
        .collection(colPath)
        .where("month", "==", month)
        .get();

      const rawCount = snap.size;

      if (snap.empty) {
        const emptyResponse: RealEstateSummaryResponse = {
          ok: true,
          hasData: false,
          tenantId,
          month,
          totals: {
            grossRevenue: 0,
            platformFees: 0,
            cleaningFees: 0,
            otherCosts: 0,
            ownerPayout: 0,
          },
          owners: [],
          meta: {
            traceId,
            latency_ms: Date.now() - t0,
            sources: ["firestore"],
            rawCount,
          },
        };
        res.json(emptyResponse);
        return;
      }

      const ownersMap = new Map<string, OwnerSummary>();

      let totalGross = 0;
      let totalPlatform = 0;
      let totalCleaning = 0;
      let totalOther = 0;
      let totalPayout = 0;

      snap.forEach((doc) => {
        const data = doc.data() as PayoutDoc;

        const ownerId = data.ownerId || "unknown_owner";
        const ownerName = data.ownerName || "Proprietário sem nome";
        const unitCode = data.unitCode || "Unidade";

        const grossRevenue = Number(data.grossRevenue || 0);
        const platformFees = Number(data.platformFees || 0);
        const cleaningFees = Number(data.cleaningFees || 0);
        const otherCosts = Number(data.otherCosts || 0);
        const ownerPayout = Number(data.ownerPayout || 0);

        totalGross += grossRevenue;
        totalPlatform += platformFees;
        totalCleaning += cleaningFees;
        totalOther += otherCosts;
        totalPayout += ownerPayout;

        let current = ownersMap.get(ownerId);
        if (!current) {
          current = {
            ownerId,
            ownerName,
            units: 0,
            grossRevenue: 0,
            platformFees: 0,
            cleaningFees: 0,
            otherCosts: 0,
            ownerPayout: 0,
          };
          ownersMap.set(ownerId, current);
        }

        current.units += 1;
        current.grossRevenue += grossRevenue;
        current.platformFees += platformFees;
        current.cleaningFees += cleaningFees;
        current.otherCosts += otherCosts;
        current.ownerPayout += ownerPayout;
      });

      const owners = Array.from(ownersMap.values()).map((o) => ({
        ...o,
        grossRevenue: round2(o.grossRevenue),
        platformFees: round2(o.platformFees),
        cleaningFees: round2(o.cleaningFees),
        otherCosts: round2(o.otherCosts),
        ownerPayout: round2(o.ownerPayout),
      }));

      const response: RealEstateSummaryResponse = {
        ok: true,
        hasData: owners.length > 0,
        tenantId,
        month,
        totals: {
          grossRevenue: round2(totalGross),
          platformFees: round2(totalPlatform),
          cleaningFees: round2(totalCleaning),
          otherCosts: round2(totalOther),
          ownerPayout: round2(totalPayout),
        },
        owners,
        meta: {
          traceId,
          latency_ms: Date.now() - t0,
          sources: ["firestore"],
          rawCount,
        },
      };

      res.json(response);
    } catch (err: any) {
      console.error("[RealEstate] /summary error", {
        traceId,
        error: err?.message,
        stack: err?.stack,
      });

      res.status(500).json({
        ok: false,
        error: "internal_error",
        traceId,
      });
    }
  }
);
