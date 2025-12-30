"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.complianceRouter = void 0;
const firebase_1 = require("../services/firebase");
const express_1 = require("express");
const requireAuth_1 = require("../middleware/requireAuth");
exports.complianceRouter = (0, express_1.Router)();
exports.complianceRouter.post('/consent', requireAuth_1.requireAuth, async (req, res, next) => {
    try {
        const uid = req.user.uid;
        const consent = {
            accepted: true,
            acceptedAt: new Date().toISOString(),
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            traceId: req.traceId
        };
        await firebase_1.db.collection('privacy_consents').doc(uid).set(consent, { merge: true });
        res.json({ status: 'ok' });
    }
    catch (e) {
        next(e);
    }
});
exports.complianceRouter.get('/export', requireAuth_1.requireAuth, async (req, res, next) => {
    try {
        const uid = req.user.uid;
        const userData = { user: req.user, transactions: [] };
        const txSnap = await firebase_1.db.collection('transactions').where('userId', '==', uid).get();
        userData.transactions = txSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=userData.json');
        res.send(JSON.stringify(userData, null, 2));
    }
    catch (e) {
        next(e);
    }
});
