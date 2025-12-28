// ============================================================
// 🤖 Momentum AI Console — Multi-Interface (v8.4 Premium)
// ============================================================

import React, { useState } from "react";
import { AIAdvisorPanel } from "../components/AIAdvisorPanel";
import { AIUploadPanel } from "../components/AIUploadPanel";
import { getAuth } from "firebase/auth";
import "../services/firebase";

// Simulação de níveis de plano — futuramente vem do Firestore
type PlanLevel = "starter" | "pro" | "business" | "enterprise";

export const AIConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"text" | "voice" | "vision">("text");
  const [plan, setPlan] = useState<PlanLevel>("pro"); // teste inicial

  const auth = getAuth();
  const user = auth.currentUser;

  const planLabels: Record<PlanLevel, string> = {
    starter: "Starter",
    pro: "Pro",
    business: "Business",
    enterprise: "Enterprise",
  };

  const canUseVoice = plan !== "starter";
  const canUseVision = plan === "business" || plan === "enterprise";

  return (
    <div className="p-4 md:p-6 space-y-4 transition-all duration-300">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gradient">Momentum AI Console</h1>
        <div className="text-sm opacity-70">
          Plano atual:{" "}
          <span className="font-semibold text-[var(--brand-1)]">
            {planLabels[plan]}
          </span>
        </div>
      </div>

      {/* Abas */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-2">
        <button
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === "text"
              ? "bg-gradient-to-r from-[var(--brand-1)] to-[var(--brand-2)] text-white shadow"
              : "glass border border-white/10"
          }`}
          onClick={() => setActiveTab("text")}
        >
          💬 Texto
        </button>
        <button
          disabled={!canUseVoice}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === "voice"
              ? "bg-gradient-to-r from-[var(--brand-1)] to-[var(--brand-2)] text-white shadow"
              : canUseVoice
              ? "glass border border-white/10"
              : "opacity-40 cursor-not-allowed"
          }`}
          onClick={() => canUseVoice && setActiveTab("voice")}
        >
          🎙 Voz Neural
        </button>
        <button
          disabled={!canUseVision}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === "vision"
              ? "bg-gradient-to-r from-[var(--brand-1)] to-[var(--brand-2)] text-white shadow"
              : canUseVision
              ? "glass border border-white/10"
              : "opacity-40 cursor-not-allowed"
          }`}
          onClick={() => canUseVision && setActiveTab("vision")}
        >
          📸 Visão AI
        </button>
      </div>

      {/* Conteúdo das abas */}
      <div className="min-h-[480px]">
        {activeTab === "text" && <AIAdvisorPanel />}
        {activeTab === "voice" && canUseVoice && (
          <div className="glass rounded-2xl p-4">
            <p className="opacity-70 text-sm mb-3">
              Fale com o CFO Virtual da Momentum — ele responde com voz neural e
              interpreta contexto financeiro.
            </p>
            <AIAdvisorPanel />
          </div>
        )}
        {activeTab === "vision" && canUseVision && <AIUploadPanel />}

        {/* Caso a feature esteja bloqueada */}
        {!canUseVoice && activeTab === "voice" && (
          <div className="glass rounded-xl p-6 text-center opacity-80">
            🔒 Disponível apenas a partir do plano <b>Pro</b>.
          </div>
        )}
        {!canUseVision && activeTab === "vision" && (
          <div className="glass rounded-xl p-6 text-center opacity-80">
            🔒 Disponível apenas para <b>Business</b> e <b>Enterprise</b>.
          </div>
        )}
      </div>

      {/* Rodapé */}
      <div className="text-xs opacity-60 text-center mt-6">
        Usuário: {user?.email || "não autenticado"} • Momentum AI v8.4 Premium
      </div>
    </div>
  );
};
