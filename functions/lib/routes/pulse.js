"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const firebase_1 = require("../services/firebase");
const requireAuth_1 = require("../middleware/requireAuth");
const withTenant_1 = require("../middleware/withTenant");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const pulseRouter = (0, express_1.Router)();
// Middleware de segurança: Garante que o usuário está logado e pertence ao Tenant
pulseRouter.use(requireAuth_1.requireAuth, withTenant_1.withTenant);
// ✅ Rota Healthcheck (para garantir que o módulo subiu)
pulseRouter.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
/**
 * GET /api/pulse/summary
 * Retorna os dados agregados (KPIs, Gráficos) do cache 'last30'.
 * Esse documento é gerado automaticamente pela trigger 'pulseAggregateOnWrite'.
 */
pulseRouter.get("/summary", async (req, res, next) => {
    try {
        if (!req.tenant) {
            throw new errors_1.ApiError(400, "Tenant context required.");
        }
        const tenantId = req.tenant.info.id;
        // Busca o documento de cache gerado pela trigger
        const docRef = firebase_1.db.doc(`tenants/${tenantId}/pulseCache/last30`);
        const snap = await docRef.get();
        if (!snap.exists) {
            // Se não houver cache ainda (ex: tenant novo sem transações), 
            // retorna estrutura vazia "com sucesso" para o frontend não quebrar.
            return res.json({
                ok: true,
                hasData: false,
                tenantId,
                kpis: {
                    cash_in: 0,
                    cash_out: 0,
                    net_cash: 0,
                    opening_balance: 0,
                    closing_balance: 0,
                    runway_days: 0
                },
                meta: {
                    traceId: req.traceId,
                    source: "empty_fallback"
                }
            });
        }
        const data = snap.data();
        // Retorna os dados reais
        res.json({
            ok: true,
            hasData: data?.hasData ?? false,
            ...data,
            meta: {
                traceId: req.traceId,
                latency_ms: 0, // Cache hit é instantâneo
                source: "firestore_cache"
            }
        });
    }
    catch (err) {
        logger_1.logger.error("Erro ao buscar resumo Pulse", { error: err.message });
        next(new errors_1.ApiError(500, "Falha ao carregar dashboard."));
    }
});
exports.default = pulseRouter;
