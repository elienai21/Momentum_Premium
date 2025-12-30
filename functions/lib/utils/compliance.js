"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.complianceRouter = void 0;
const firebase_1 = require("src/services/firebase");
// ============================
// 🧩 Compliance (LGPD) — v7.9.3 Final
// ============================
const express_1 = require("express");
const requireAuth_1 = require("../middleware/requireAuth");
const errors_1 = require("./errors");
const logger_1 = require("./logger");
exports.complianceRouter = (0, express_1.Router)();
/**
 * 🔸 POST /api/compliance/consent
 * Registra consentimento do usuário (LGPD)
 */
exports.complianceRouter.post("/consent", requireAuth_1.requireAuth, async (req, res, next) => {
    try {
        const uid = req.user?.uid ?? "anonymous";
        const tenantId = req.tenant?.info?.id ?? "unknown";
        await firebase_1.db.collection("privacy_consents").doc(uid).set({
            accepted: true,
            acceptedAt: new Date().toISOString(),
            ip: req.ip,
            userAgent: req.headers["user-agent"] || "",
            tenantId,
        });
        logger_1.logger.info("User consent recorded", { uid, tenantId });
        res.json({ ok: true, uid, tenantId });
    }
    catch (err) {
        logger_1.logger.error("Failed to record user consent", { error: err?.message });
        next(new errors_1.ApiError(500, "Erro ao registrar consentimento do usuário."));
    }
});
/**
 * 🔸 GET /api/compliance/export
 * Exporta dados pessoais do usuário para atender à LGPD.
 */
exports.complianceRouter.get("/export", requireAuth_1.requireAuth, async (req, res, next) => {
    try {
        const uid = req.user?.uid ?? "anonymous";
        const tenantId = req.tenant?.info?.id ?? "unknown";
        const txSnap = await firebase_1.db
            .collection("transactions")
            .where("userId", "==", uid)
            .get();
        const data = {
            user: {
                uid,
                email: req.user?.email ?? null,
                tenantId,
            },
            transactions: txSnap.docs.map((d) => d.data()),
            exportedAt: new Date().toISOString(),
        };
        logger_1.logger.info("User data export completed", {
            uid,
            tenantId,
            txCount: data.transactions.length,
        });
        res
            .setHeader("Content-Type", "application/json")
            .setHeader("Content-Disposition", 'attachment; filename="userData.json"')
            .status(200)
            .send(JSON.stringify(data, null, 2));
    }
    catch (err) {
        logger_1.logger.error("Failed to export user data", { error: err?.message });
        next(new errors_1.ApiError(500, "Erro ao exportar dados do usuário."));
    }
});
