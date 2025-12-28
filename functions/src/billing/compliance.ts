import { db } from "src/services/firebase";

import { Router } from 'express'

import { requireAuth } from '../middleware/requireAuth'

export const complianceRouter = Router()

complianceRouter.post('/consent', requireAuth, async (req: any, res, next) => {
  try {
    const uid = req.user.uid
    const consent = {
      accepted: true,
      acceptedAt: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      traceId: req.traceId
    }
    await db.collection('privacy_consents').doc(uid).set(consent, { merge: true })
    res.json({ status: 'ok' })
  } catch (e) { next(e) }
})

complianceRouter.get('/export', requireAuth, async (req: any, res, next) => {
  try {
    const uid = req.user.uid
    const userData: any = { user: req.user, transactions: [] }
    const txSnap = await db.collection('transactions').where('userId', '==', uid).get()
    userData.transactions = txSnap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => ({ id: d.id, ...d.data() }))
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', 'attachment; filename=userData.json')
    res.send(JSON.stringify(userData, null, 2))
  } catch (e) { next(e) }
})



