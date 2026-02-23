/**
 * Momentum AI Advisor — v1.0
 * Consultor financeiro didático e conversacional
 * Integra com Gemini / OpenAI (configurada via Secret Manager)
 */

import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import fetch from "node-fetch";

const db = admin.firestore();

// 🔒 Secrets via Firebase Secret Manager (injetados em runtime)
const GEMINI_SECRET = defineSecret("GEMINI_API_KEY");
const OPENAI_SECRET = defineSecret("OPENAI_API_KEY");

export const advisorChat = onRequest(
  {
    secrets: [GEMINI_SECRET, OPENAI_SECRET],
    region: "southamerica-east1",
    memory: "512MiB",
  },
  async (req, res) => {
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
      if (!snapshot.empty) contextData = snapshot.docs[0].data();
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

    const geminiKey = GEMINI_SECRET.value();
    const openaiKey = OPENAI_SECRET.value();
    const activeProvider = geminiKey ? "gemini" : "openai";

    if (activeProvider === "gemini") {
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + geminiKey, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
      });
      const data = await response.json();
      reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Não consegui gerar uma resposta agora.";
    } else {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
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
      const { redactPII } = await import("../utils/redactPII");

      // Calculate expiration date (30 days from now)
      // Expiration handled by cleanupExpiredLogs scheduler
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await db
        .collection("tenants")
        .doc(tenantId)
        .collection("advisor_logs")
        .add({
          message: redactPII(message), // Redact PII before storage
          reply: redactPII(reply), // Redact PII from AI response
          expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    res.status(200).send({ reply });
  } catch (err: any) {
    console.error("AdvisorChat Error:", err.message); // Log only message, not full error
    res.status(500).send({ error: "Failed to process request" }); // Don't expose internals
  }
});
