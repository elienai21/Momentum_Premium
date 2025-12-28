import { db } from "src/services/firebase";
import { logger } from '../utils/logger';

export async function supportAgentAsk(_question: string) {
  const response: any = { text: 'Resposta base de conhecimento.' };
  const text = (response?.text || '').trim();
  if (!text) {
    logger.warn('SupportAgent empty response', { question: _question });
    return 'Não encontrei uma resposta no momento.';
  }
  return text;
}

// Legacy alias
export const handleSupportMessage = supportAgentAsk;



