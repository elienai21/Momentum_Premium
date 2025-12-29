"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSupportMessage = void 0;
exports.supportAgentAsk = supportAgentAsk;
const logger_1 = require("../utils/logger");
async function supportAgentAsk(_question) {
    const response = { text: 'Resposta base de conhecimento.' };
    const text = (response?.text || '').trim();
    if (!text) {
        logger_1.logger.warn('SupportAgent empty response', { question: _question });
        return 'Não encontrei uma resposta no momento.';
    }
    return text;
}
// Legacy alias
exports.handleSupportMessage = supportAgentAsk;
