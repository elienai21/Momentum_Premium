import { db } from "src/services/firebase";


export async function buildUserContext(uid: string) {
  const doc = await db.collection("users").doc(uid).get();
  const prefs = doc.data()?.preferences || {};
  const name = prefs.name || "usuário";
  const agent = prefs.agent || "Momentum";
  const tone = prefs.tone || "neutro";

  return {
    name,
    agent,
    tone,
    systemPrompt: `
Você é ${agent}, um assistente financeiro ${tone}.
Fale sempre com ${name} de forma natural, empática e útil.
Mantenha o contexto personalizado e humano, mas objetivo.
`.trim()
  };
}



