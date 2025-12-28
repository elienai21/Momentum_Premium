import { Router } from 'express';
import { auth } from 'firebase-admin';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';
import { z } from 'zod';
import { db } from "src/services/firebase";

export const publicRouter = Router();

const signupSchema = z.object({
    companyName: z.string().min(2).max(100),
    vertical: z.enum(['finance', 'real_estate', 'condos']),
    mode: z.enum(['new', 'import', 'sync']).optional(),
    sheetId: z.string().optional(),
});

publicRouter.post('/signup', async (req, res, next) => {
  try {
    const xIdToken = req.header("x-id-token");
    const authHeader = req.header("authorization");
    const bearer =
      (typeof xIdToken === "string" && xIdToken.trim().length > 0
        ? xIdToken.trim()
        : typeof authHeader === "string" && authHeader.startsWith("Bearer ")
          ? authHeader.slice("Bearer ".length).trim()
          : null);

    if (!bearer) throw new ApiError(401, "Missing x-id-token (or Authorization) token");

    const decodedToken = await auth().verifyIdToken(bearer, true);
    const uid = decodedToken.uid;
    const email = decodedToken.email || '';

    const { companyName, vertical, mode, sheetId } = signupSchema.parse(req.body);

    const existingTenants = await db.collection('tenants').where('ownerUid', '==', uid).limit(1).get();
    if (!existingTenants.empty) {
      throw new ApiError(409, 'A workspace already exists for this user.');
    }

    const tenantRef = db.collection('tenants').doc();
    const tenantId = tenantRef.id;

    await db.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
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
        transaction.set(
            memberRef,
            {
                role: 'admin',
                email,
                status: 'active',
                joinedAt: new Date().toISOString()
            },
            { merge: true }
        );
    });

    // Claims (fora da transaÇõÇœo para evitar retries de transaÇõÇœo com side-effects)
    await auth().setCustomUserClaims(uid, { tenantId });

    logger.info('Public signup created new tenant', { tenantId, uid, email, mode });
    res.status(201).json({ status: 'success', data: { tenantId } });
  } catch (e) {
    next(e);
  }
});



