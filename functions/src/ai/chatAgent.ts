import { Router, Request, Response } from 'express';
import { runAdvisor } from './advisor';
import { requireAuth } from '../middleware/requireAuth';
import { withTenant } from '../middleware/withTenant';

export const chatAgentRouter = Router();

// O Agent de Chat agora é um proxy direto para o Advisor (CFO)
chatAgentRouter.post('/chat', requireAuth, withTenant, runAdvisor);

/**
 * Função legado para processamento de chat, mantida para compatibilidade com modules/chat.ts
 * Agora redireciona para a execução do runAdvisor simulando um fluxo de Request/Response se necessário,
 * ou pode ser chamada diretamente se refatorarmos o chamador.
 */
export async function processChatMessage(uid: string, tenantInfo: any, message: string, req: Request): Promise<string> {
  let capturedData: any = null;

  const fakeRes: any = {
    json: (data: any) => { capturedData = data; return fakeRes; },
    status: (_code: number) => fakeRes,
    set: () => fakeRes,
    send: () => fakeRes,
  };

  const fakeReq = {
    ...req,
    user: { uid },
    tenant: { info: tenantInfo },
    body: { message },
  } as Request;

  await runAdvisor(fakeReq, fakeRes);

  return capturedData?.reply?.answer || capturedData?.message || "Não consegui processar a mensagem.";
}
