"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.complianceRouter = void 0;
const firebase_1 = require("src/services/firebase");
const express_1 = require("express");
const requireAuth_1 = require("../middleware/requireAuth");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
exports.complianceRouter = (0, express_1.Router)();
// POST /api/compliance/consent
exports.complianceRouter.post('/consent', requireAuth_1.requireAuth, async (req, res, next) => {
    try {
        const uid = req.user.uid;
        const consent = {
            accepted: true,
            acceptedAt: new Date().toISOString(),
            ip: req.ip,
            userAgent: req.headers['user-agent'] || '',
        };
        await firebase_1.db.collection('privacy_consents').doc(uid).set(consent);
        logger_1.logger.info(`Consent accepted by ${uid}`, req.traceId);
        res.json({ status: 'ok' });
    }
    catch (e) {
        next(new errors_1.ApiError(500, 'Erro ao registrar consentimento', req.traceId));
    }
});
// GET /api/compliance/export
exports.complianceRouter.get('/export', requireAuth_1.requireAuth, async (req, res, next) => {
    try {
        const uid = req.user.uid;
        const txSnap = await firebase_1.db.collection('transactions').where('userId', '==', uid).get();
        const userData = {
            user: req.user,
            transactions: txSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        };
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="userData.json"');
        res.send(JSON.stringify(userData, null, 2));
    }
    catch (e) {
        next(new errors_1.ApiError(500, 'Erro ao exportar dados', req.traceId));
    }
});
