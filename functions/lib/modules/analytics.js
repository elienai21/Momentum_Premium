"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
// src/modules/analytics.ts
const express_1 = require("express");
const errors_1 = require("../middleware/errors");
const analytics_1 = require("../contracts/analytics");
const logger_1 = require("../utils/logger");
const analyticsService_1 = require("../services/analyticsService");
exports.router = (0, express_1.Router)();
// GET /api/v1/analytics/forecast
exports.router.get("/forecast", async (req, res, next) => {
    try {
        if (!req.tenant)
            throw new errors_1.ApiError(400, "Tenant context required");
        const { from, to } = analytics_1.FilterSchema.pick({ from: true, to: true }).parse(req.query);
        const out = await (0, analyticsService_1.getForecastForTenant)({
            tenantId: req.tenant.info.id,
            from: from ?? undefined,
            to: to ?? undefined,
            locale: req.tenant.info.locale ?? "pt-BR",
            traceId: req.traceId
        });
        // garante shape de resposta
        const safe = analytics_1.ForecastResponseSchema.safeParse(out);
        if (!safe.success) {
            logger_1.logger.error("Invalid forecast response shape", { issues: safe.error.issues }, req);
            throw new errors_1.ApiError(500, "Invalid forecast response");
        }
        res.json(safe.data);
    }
    catch (err) {
        next(err);
    }
});
// POST /api/v1/analytics/transactions/filter
exports.router.post("/transactions/filter", async (req, res, next) => {
    try {
        if (!req.tenant)
            throw new errors_1.ApiError(400, "Tenant context required");
        const dto = analytics_1.FilterSchema.parse(req.body);
        const out = await (0, analyticsService_1.filterTransactions)({
            tenantId: req.tenant.info.id,
            filter: dto,
            traceId: req.traceId
        });
        res.json({ transactions: out });
    }
    catch (err) {
        next(err);
    }
});
