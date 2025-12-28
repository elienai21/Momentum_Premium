"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicRouter = void 0;
const express_1 = require("express");
const firebase_admin_1 = require("firebase-admin");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const zod_1 = require("zod");
const firebase_1 = require("../services/firebase");
exports.publicRouter = (0, express_1.Router)();
const signupSchema = zod_1.z.object({
    companyName: zod_1.z.string().min(2).max(100),
    vertical: zod_1.z.enum(['finance', 'real_estate', 'condos']),
    mode: zod_1.z.enum(['new', 'import', 'sync']).optional(),
    sheetId: zod_1.z.string().optional(),
});
exports.publicRouter.post('/signup', async (req, res, next) => {
    try {
        const xIdToken = req.header("x-id-token");
        const authHeader = req.header("authorization");
        const bearer = (typeof xIdToken === "string" && xIdToken.trim().length > 0
            ? xIdToken.trim()
            : typeof authHeader === "string" && authHeader.startsWith("Bearer ")
                ? authHeader.slice("Bearer ".length).trim()
                : null);
        if (!bearer)
            throw new errors_1.ApiError(401, "Missing x-id-token (or Authorization) token");
        const decodedToken = await (0, firebase_admin_1.auth)().verifyIdToken(bearer, true);
        const uid = decodedToken.uid;
        const email = decodedToken.email || '';
        const { companyName, vertical, mode, sheetId } = signupSchema.parse(req.body);
        const existingTenants = await firebase_1.db.collection('tenants').where('ownerUid', '==', uid).limit(1).get();
        if (!existingTenants.empty) {
            throw new errors_1.ApiError(409, 'A workspace already exists for this user.');
        }
        const tenantRef = firebase_1.db.collection('tenants').doc();
        const tenantId = tenantRef.id;
        await firebase_1.db.runTransaction(async (transaction) => {
            const trialEndDate = new Date();
            trialEndDate.setDate(trialEndDate.getDate() + 7);
            transaction.set(tenantRef, {
                name: companyName,
                vertical,
                ownerUid: uid,
                ownerEmail: email,
                planId: 'starter',
                plan: 'starter',
                theme: 'default',
                billingStatus: 'trial-active',
                createdAt: new Date().toISOString(),
                trialEndsAt: trialEndDate.toISOString(),
                sheetId: (mode === 'import' || mode === 'sync') ? sheetId : null,
                syncEnabled: mode === 'sync',
            });
            const memberRef = tenantRef.collection('members').doc(uid);
            transaction.set(memberRef, {
                role: 'admin',
                email,
                status: 'active',
                joinedAt: new Date().toISOString()
            }, { merge: true });
        });
        // Claims (fora da transaÇõÇœo para evitar retries de transaÇõÇœo com side-effects)
        await (0, firebase_admin_1.auth)().setCustomUserClaims(uid, { tenantId });
        logger_1.logger.info('Public signup created new tenant', { tenantId, uid, email, mode });
        res.status(201).json({ status: 'success', data: { tenantId } });
    }
    catch (e) {
        next(e);
    }
});
