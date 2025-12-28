import { db } from "src/services/firebase";

import { Router } from 'express';
import * as admin from 'firebase-admin';
import { requireAuth } from '../middleware/requireAuth';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/errors';

export const complianceRouter = Router();

// POST /api/compliance/consent
complianceRouter.post('/consent', requireAuth as any, async (req: any, res, next) => {
  try {
    const uid = req.user.uid;
    const consent = {
      accepted: true,
      acceptedAt: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.headers['user-agent'] || '',
    };
    await db.collection('privacy_consents').doc(uid).set(consent);
    logger.info(`Consent accepted by ${uid}`, req.traceId);
    res.json({ status: 'ok' });
  } catch (e) {
    next(new ApiError(500, 'Erro ao registrar consentimento', req.traceId));
  }
});

// GET /api/compliance/export
complianceRouter.get('/export', requireAuth as any, async (req: any, res, next) => {
  try {
    const uid = req.user.uid;
    const txSnap = await db.collection('transactions').where('userId', '==', uid).get();

    const userData = {
      user: req.user,
      transactions: txSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="userData.json"');
    res.send(JSON.stringify(userData, null, 2));
  } catch (e) {
    next(new ApiError(500, 'Erro ao exportar dados', req.traceId));
  }
});



