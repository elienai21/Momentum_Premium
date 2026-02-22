import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SupportDock from "../SupportDock";
import React from "react";

// Mock básico para /api/support/chat
function mockFetchReply(answer = "Aqui está a resposta do suporte.") {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.includes("/api/support/chat")) {
      return new Response(JSON.stringify({ reply: answer }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(null, { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
}

beforeEach(() => {
  vi.restoreAllMocks();
  mockFetchReply();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// Mock do FeatureGate para simplificar (voz off aqui)
vi.mock("../../context/FeatureGateContext", async (orig) => {
  const actual = await (orig as any)();
  return {
    ...actual,
    useFeatures: () => ({
      features: { support: true, voiceTTS: false, voiceSTT: false, voiceTier: "standard" },
      voiceProfiles: {
        advisor: { tier: "standard", voiceId: "pt-BR-Standard-A" },
        support: { tier: "standard", voiceId: "pt-BR-Standard-B" },
      },
    }),
  };
});

describe("<SupportDock /> — Smoke", () => {
  it("abre, envia pergunta e recebe resposta", async () => {
    render(<SupportDock />);

    // Clica no botão para abrir se necessário, mas o SupportDock do Momentum costuma ser um flutuante ou fixo.
    // No snapshot anterior ele recebia 'open', mas agora parece ser controlado internamente ou via context.
    // Vamos assumir que ele renderiza o input se estiver visível.

    const input = screen.getByPlaceholderText(/Descreva sua dúvida/i);
    fireEvent.change(input, { target: { value: "Como importar CSV?" } });
    fireEvent.click(screen.getByRole("button", { name: /Enviar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Aqui está a resposta do suporte/i)).toBeInTheDocument();
    });
  });
});
