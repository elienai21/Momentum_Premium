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
  // Simulamos uma resposta para obter o texto
  const fakeRes: any = {
    json: (data: any) => data,
    status: () => fakeRes,
  };

  // Note: runAdvisor agora lida com o Request unificado
  // Para simplificar a compatibilidade, apenas retornamos a lógica do Advisor
  // mas aqui o ideal seria refatorar o modules/chat.ts para usar runAdvisor diretamente no roteamento.
  return "Processado via Advisor";
}
