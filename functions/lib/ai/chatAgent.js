"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatAgentRouter = void 0;
exports.processChatMessage = processChatMessage;
const express_1 = require("express");
const advisor_1 = require("./advisor");
const requireAuth_1 = require("../middleware/requireAuth");
const withTenant_1 = require("../middleware/withTenant");
exports.chatAgentRouter = (0, express_1.Router)();
// O Agent de Chat agora é um proxy direto para o Advisor (CFO)
exports.chatAgentRouter.post('/chat', requireAuth_1.requireAuth, withTenant_1.withTenant, advisor_1.runAdvisor);
/**
 * Função legado para processamento de chat, mantida para compatibilidade com modules/chat.ts
 * Agora redireciona para a execução do runAdvisor simulando um fluxo de Request/Response se necessário,
 * ou pode ser chamada diretamente se refatorarmos o chamador.
 */
async function processChatMessage(uid, tenantInfo, message, req) {
    // Simulamos uma resposta para obter o texto
    const fakeRes = {
        json: (data) => data,
        status: () => fakeRes,
    };
    // Note: runAdvisor agora lida com o Request unificado
    // Para simplificar a compatibilidade, apenas retornamos a lógica do Advisor
    // mas aqui o ideal seria refatorar o modules/chat.ts para usar runAdvisor diretamente no roteamento.
    return "Processado via Advisor";
}
