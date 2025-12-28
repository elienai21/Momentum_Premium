"use strict";
/**
 * Momentum AI Advisor — v1.0
 * Consultor financeiro didático e conversacional
 * Integra com Gemini / OpenAI (configurada via Secret Manager)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.advisorChat = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const db = admin.firestore();
// 🔒 Secrets do Google Cloud Secret Manager
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
// Escolhe provedor disponível
const ACTIVE_PROVIDER = GEMINI_API_KEY ? "gemini" : "openai";
exports.advisorChat = (0, https_1.onRequest)(async (req, res) => {
    try {
        if (req.method !== "POST") {
            res.status(405).send({ error: "Método não permitido" });
            return;
        }
        const { tenantId, message, context } = req.body;
        if (!message) {
            res.status(400).send({ error: "Mensagem ausente." });
            return;
        }
        // 🔎 Carrega contexto financeiro básico do usuário
        let contextData = {};
        if (tenantId) {
            const snapshot = await db
                .collection("tenants")
                .doc(tenantId)
                .collection("analytics")
                .limit(1)
                .get();
            if (!snapshot.empty)
                contextData = snapshot.docs[0].data();
        }
        // Prompt para respostas claras e acessíveis
        const systemPrompt = `
Você é o CFO Virtual do Momentum, um assistente financeiro didático.
Responda de forma clara, leve e explicativa — sem jargões contábeis.
Se o usuário pedir algo técnico (DRE, fluxo de caixa, margem), explique em termos simples.
Adapte o tom: amigável, empático e acessível.
`;
        const fullPrompt = `
${systemPrompt}
Contexto financeiro (simplificado): ${JSON.stringify(contextData)}
Usuário: ${message}
`;
        let reply = "";
        if (ACTIVE_PROVIDER === "gemini") {
            const response = await (0, node_fetch_1.default)("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + GEMINI_API_KEY, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
            });
            const data = await response.json();
            reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Não consegui gerar uma resposta agora.";
        }
        else {
            const response = await (0, node_fetch_1.default)("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: message }],
                    temperature: 0.7,
                }),
            });
            const data = await response.json();
            reply = data?.choices?.[0]?.message?.content || "Desculpe, não consegui gerar a resposta agora.";
        }
        // 🔐 Log da conversa (opcional)
        if (tenantId) {
            await db
                .collection("tenants")
                .doc(tenantId)
                .collection("advisor_logs")
                .add({
                message,
                reply,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        res.status(200).send({ reply });
    }
    catch (err) {
        console.error("AdvisorChat Error:", err);
        res.status(500).send({ error: err.message });
    }
});
