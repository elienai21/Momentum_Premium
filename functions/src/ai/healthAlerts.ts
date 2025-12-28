import { db } from "src/services/firebase";
import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';

export async function sendHealthAlerts(...args: any[]) {
  const userId = args[0];
  const doc = await db.collection('user_prefs').doc(userId).get();
  const prefs = (doc.data() as any) || {};
  if (!prefs?.enabled) return;

  const recipients: string[] = prefs.recipients || [];
  for (const r of recipients) {
    logger.info('Health alert sent', { userId, to: r });
  }
}

export const processHealthAlerts = sendHealthAlerts;



