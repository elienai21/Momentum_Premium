import { db } from "src/services/firebase";
import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';
import { advisorReply } from './advisor';

export const chatAgentRouter = Router();

export async function processChatMessage(...args: any[]) {
  const message = String(args[2] ?? args[0] ?? '');
  return advisorReply(message);
}

chatAgentRouter.post('/chat', requireAuth as any, async (req: any, res, next) => {
  try {
    const message = String(req.body?.message || '').trim();
    if (!message) throw new ApiError(400, 'Mensagem vazia', req.traceId);
    const out = await advisorReply(message);
    logger.info('Advisor respondeu');
    res.json(out);
  } catch (e) {
    next(e);
  }
});



