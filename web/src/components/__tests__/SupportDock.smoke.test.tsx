import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SupportDock from "../SupportDock";
import React from "react";

// Mock básico para /api/support/query
beforeEach(() => {
  (global as any).fetch = vi.fn(async (url: string) => {
    if (url.includes("/api/support/query")) {
      return new Response(JSON.stringify({ reply: "Aqui está a resposta do suporte." }), { status: 200 });
    }
    return new Response(null, { status: 404 });
  });
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
    render(<SupportDock open onClose={() => { }} />);
    const input = screen.getByPlaceholderText(/Descreva sua dúvida/i);
    fireEvent.change(input, { target: { value: "Como importar CSV?" } });
    fireEvent.click(screen.getByRole("button", { name: /Enviar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Aqui está a resposta do suporte/i)).toBeInTheDocument();
    });
  });
});
