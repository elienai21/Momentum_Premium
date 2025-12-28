"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.realEstateRouter = void 0;
// functions/src/modules/realEstate.ts
const express_1 = require("express");
const admin = __importStar(require("firebase-admin"));
const crypto_1 = __importDefault(require("crypto"));
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.realEstateRouter = (0, express_1.Router)();
function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}
function getDefaultMonth() {
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
exports.realEstateRouter.get("/summary", async (req, res) => {
    const t0 = Date.now();
    const traceId = req.headers["x-trace-id"] ?? crypto_1.default.randomUUID();
    try {
        const tenantId = req.tenant?.id ||
            req.tenant?.info?.id ||
            req.query.tenantId;
        if (!tenantId) {
            res.status(400).json({
                ok: false,
                error: "tenant_required",
                traceId,
            });
            return;
        }
        const month = req.query.month || getDefaultMonth();
        const colPath = `tenants/${tenantId}/realEstatePayouts`;
        const snap = await db
            .collection(colPath)
            .where("month", "==", month)
            .get();
        const rawCount = snap.size;
        if (snap.empty) {
            const emptyResponse = {
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
        const ownersMap = new Map();
        let totalGross = 0;
        let totalPlatform = 0;
        let totalCleaning = 0;
        let totalOther = 0;
        let totalPayout = 0;
        snap.forEach((doc) => {
            const data = doc.data();
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
        const response = {
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
    }
    catch (err) {
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
});
