"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminMarketRouter = void 0;
// functions/src/modules/adminMarket.ts
const express_1 = require("express");
const zod_1 = require("zod");
// ✅ Middlewares do seu projeto (pasta singular "middleware")
const withTenant_1 = require("../middleware/withTenant");
// ✅ Service que você vai criar (ou já existe)
const marketConfigService_1 = require("../services/marketConfigService");
// (Opcional) Logger central; se não existir, o TS pode ser ajustado para usar console
const logger_1 = require("../lib/logger");
exports.adminMarketRouter = (0, express_1.Router)();
/** Guard mínimo de autenticação (caso o withTenant não valide sozinho). */
function ensureAuth(req, res, next) {
    const uid = req?.user?.uid ??
        req?.auth?.uid ??
        req?.firebaseUser?.uid;
    if (!uid) {
        return res.status(401).json({
            ok: false,
            code: "UNAUTHENTICATED",
            message: "Usuário não autenticado.",
        });
    }
    req.uid = uid;
    next();
}
/** Validação do payload de MarketConfig */
const marketConfigBodySchema = zod_1.z.object({
    enabled: zod_1.z.boolean().optional().default(true),
    sector: zod_1.z.string().trim().min(1, "sector é obrigatório"),
    region: zod_1.z.string().trim().min(1, "region é obrigatório"),
    companySize: zod_1.z.string().trim().min(1, "companySize é obrigatório"),
    horizon: zod_1.z.enum(["30d", "90d"]).optional(),
});
function badRequest(res, message, issues) {
    return res.status(400).json({ ok: false, code: "BAD_REQUEST", message, issues });
}
/**
 * GET /tenant/:tenantId/market-config
 * Retorna a configuração (ou default, se ainda não existir)
 */
exports.adminMarketRouter.get("/tenant/:tenantId/market-config", ensureAuth, withTenant_1.withTenant, 
// opcional: exigir feature específica, se desejar
// requireFeature("market.config:read"),
async (req, res) => {
    try {
        const { tenantId } = req.params;
        const data = await (0, marketConfigService_1.getMarketConfig)(tenantId);
        return res.status(200).json({ ok: true, data });
    }
    catch (err) {
        (logger_1.logger ?? console).error?.("admin.market-config.get.error", {
            tenantId: req.params?.tenantId,
            error: err?.message || String(err),
        });
        return res.status(500).json({
            ok: false,
            code: "INTERNAL_ERROR",
            message: "Não foi possível obter a configuração de mercado.",
        });
    }
});
/**
 * PUT /tenant/:tenantId/market-config
 * Cria/atualiza e carimba updatedAt/updatedBy
 */
exports.adminMarketRouter.put("/tenant/:tenantId/market-config", ensureAuth, withTenant_1.withTenant, 
// opcional: exigir feature específica
// requireFeature("market.config:write"),
async (req, res) => {
    try {
        const parsed = marketConfigBodySchema.safeParse(req.body);
        if (!parsed.success) {
            return badRequest(res, "Payload inválido para MarketConfig.", parsed.error.issues);
        }
        const { tenantId } = req.params;
        const uid = req?.uid ||
            req?.user?.uid ||
            req?.auth?.uid ||
            "";
        const updated = await (0, marketConfigService_1.upsertMarketConfig)(tenantId, parsed.data, { uid });
        (logger_1.logger ?? console).info?.("admin.market-config.updated", { tenantId, uid });
        return res.status(200).json({ ok: true, data: updated });
    }
    catch (err) {
        (logger_1.logger ?? console).error?.("admin.market-config.put.error", {
            tenantId: req.params?.tenantId,
            error: err?.message || String(err),
        });
        if (err?.code === "VALIDATION_ERROR") {
            return badRequest(res, err?.message ?? "Erro de validação.", err?.issues);
        }
        return res.status(500).json({
            ok: false,
            code: "INTERNAL_ERROR",
            message: "Não foi possível salvar a configuração de mercado.",
        });
    }
});
exports.default = exports.adminMarketRouter;
