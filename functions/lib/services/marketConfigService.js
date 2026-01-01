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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMarketConfig = getMarketConfig;
exports.upsertMarketConfig = upsertMarketConfig;
exports.getBenchmarks = getBenchmarks;
// functions/src/services/marketConfigService.ts
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const DEFAULT_CONFIG = (uid = "") => ({
    enabled: true,
    sector: "",
    region: "",
    companySize: "",
    horizon: "90d",
    updatedAt: admin.firestore.Timestamp.now(),
    updatedBy: uid,
});
function marketDocRef(tenantId) {
    // /tenants/{tenantId}/settings/market
    return db
        .collection("tenants")
        .doc(tenantId)
        .collection("settings")
        .doc("market");
}
/**
 * Retorna a MarketConfig do tenant.
 * Se não existir, retorna um default seguro (não grava).
 */
async function getMarketConfig(tenantId) {
    const ref = marketDocRef(tenantId);
    const snap = await ref.get();
    if (!snap.exists) {
        // default sem gravar – o PUT fará o primeiro persist
        return DEFAULT_CONFIG("");
    }
    const data = snap.data() || {};
    return {
        enabled: data.enabled ?? true,
        sector: data.sector ?? "",
        region: data.region ?? "",
        companySize: data.companySize ?? "",
        horizon: data.horizon ?? "90d",
        updatedAt: data.updatedAt ?? admin.firestore.Timestamp.now(),
        updatedBy: data.updatedBy ?? "",
    };
}
/**
 * Cria/atualiza a MarketConfig do tenant.
 * Carimba updatedAt/updatedBy no servidor.
 */
async function upsertMarketConfig(tenantId, payload, meta) {
    const uid = meta?.uid || "";
    const ref = marketDocRef(tenantId);
    const data = {
        enabled: payload.enabled ?? true,
        sector: (payload.sector || "").trim(),
        region: (payload.region || "").trim(),
        companySize: (payload.companySize || "").trim(),
        horizon: payload.horizon ?? "90d",
        updatedAt: admin.firestore.Timestamp.now(),
        updatedBy: uid,
    };
    await ref.set(data, { merge: true });
    return data;
}
/**
 * Retorna benchmarks de mercado para o setor.
 * Implementa estratégia de Fallback: Dados Reais -> Dados Estáticos (Cold Start).
 */
async function getBenchmarks(industry) {
    const normalizedIndustry = industry.toLowerCase()
        .replace(/\s+/g, "_")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove accents
    // TODO: Implementar agregação real do Firestore aqui (pós-MVP)
    // const realData = await aggregateSectorData(normalizedIndustry);
    // if (realData) return realData;
    // Fallback: Dados estáticos (Cold Start)
    // Import dinâmico ou require para evitar lock de tsconfig se resolveJsonModule falhar
    try {
        const benchmarks = require("../config/industryBenchmarks.json");
        const sectorData = benchmarks[normalizedIndustry] || benchmarks["small_business"];
        return sectorData;
    }
    catch (error) {
        console.warn("Failed to load benchmarks config", error);
        return {
            vacancy_rate: 0,
            profit_margin: 0.1,
            cac: 0,
            churn_rate: 0
        };
    }
}
