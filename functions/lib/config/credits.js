"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CREDIT_COSTS = void 0;
// functions/src/config/credits.ts
// Tabela centralizada de custos em créditos por tipo de operação.
// Valores podem (e devem) ser ajustados de acordo com o modelo de negócios.
exports.CREDIT_COSTS = {
    // CFO / análises financeiras
    "cfo.summary": 5,
    "cfo.aiReport": 20,
    // Voz TTS padrão (voz mais "robótica"/standard)
    "voice.standardSession": 1,
    // Voz TTS premium/neural (voz mais natural)
    "voice.premiumSession": 3,
    // Alias legado – tratar como sessão padrão enquanto houver código antigo usando "voice.session"
    "voice.session": 1,
    // Outras operações de IA
    "advisor.query": 2,
    "market.advice": 20,
    "support.ask": 2,
};
