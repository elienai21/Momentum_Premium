import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdvisorChat from "../AdvisorChat";
import React from "react";

// --- 1) Mock do useTTS para não tocar áudio real ---
vi.mock("../../hooks/useTTS", () => ({
  useTTS: () => ({
    speak: vi.fn(async () => { }),
    stop: vi.fn(),
    loading: false,
    error: null,
  }),
}));

// --- 2) Mock do contexto de features (FeatureGate) ---
const MockFeatureContext = React.createContext<any>(null);
function withFeatures(ui: React.ReactNode, features: any) {
  return (
    <MockFeatureContext.Provider value={features}>
      {/* Remapear o hook useFeatures para este provider mock */}
      <FeatureGateMockBridge>{ui}</FeatureGateMockBridge>
    </MockFeatureContext.Provider>
  );
}

// Bridge para interceptar useFeatures()
vi.mock("../../context/FeatureGateContext", async (orig) => {
  const actual = await (orig as any)();
  const { useContext } = await import("react");
  return {
    ...actual,
    useFeatures: () => {
      const ctx = useContext(MockFeatureContext);
      if (!ctx) throw new Error("Mock Feature context not found");
      return ctx;
    },
  };
});

// --- 3) Mock de fetch para /api/advisor/session ---
function mockFetchReply(answer = "Resposta do Advisor OK") {
  (global as any).fetch = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes("/api/advisor/session")) {
      return new Response(
        JSON.stringify({ reply: answer }), // formato que o AdvisorChat espera
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(null, { status: 404 });
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  mockFetchReply();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// --- 4) Bridge invisível: não altera o DOM, só permite useFeatures() ler o mock provider ---
function FeatureGateMockBridge({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

describe("<AdvisorChat /> — Smoke", () => {
  const baseVoiceProfiles = {
    advisor: { tier: "standard", voiceId: "pt-BR-Standard-A" },
    support: { tier: "standard", voiceId: "pt-BR-Standard-B" },
  };

  it("renderiza, envia mensagem e mostra a resposta", async () => {
    const featuresOn = {
      features: { voiceTTS: true, voiceSTT: false, voiceTier: "neural" },
      voiceProfiles: baseVoiceProfiles,
    };

    render(withFeatures(<AdvisorChat />, featuresOn));

    // Mensagem inicial do assistant deve estar visível
    expect(
      screen.getByText(/Olá! Sou seu Advisor Momentum/i)
    ).toBeInTheDocument();

    // Digita e envia
    const input = screen.getByPlaceholderText(/Digite ou fale com seu CFO Virtual/i);
    fireEvent.change(input, { target: { value: "Como está meu caixa?" } });

    const enviar = screen.getByRole("button", { name: /Enviar/i });
    fireEvent.click(enviar);

    // Deve exibir a resposta mockada
    await waitFor(() => {
      expect(screen.getByText(/Resposta do Advisor OK/i)).toBeInTheDocument();
    });

    // `fetch` foi chamado uma vez
    expect((global as any).fetch).toHaveBeenCalledTimes(1);
    expect((global as any).fetch.mock.calls[0][0]).toContain("/api/advisor/session");
  });

  it("quando voiceTTS=true, chama speak() (TTS)", async () => {
    const speakSpy = vi.fn(async () => { });
    // substitui apenas para este teste
    vi.doMock("../../hooks/useTTS", () => ({
      useTTS: () => ({ speak: speakSpy, stop: vi.fn(), loading: false, error: null }),
    }));
    // Reimporta o componente depois do doMock
    const { default: AdvisorChatWithMock } = await import("../AdvisorChat");

    const featuresOn = {
      features: { voiceTTS: true, voiceSTT: false, voiceTier: "neural_premium" },
      voiceProfiles: baseVoiceProfiles,
    };

    render(withFeatures(<AdvisorChatWithMock />, featuresOn));

    const input = screen.getByPlaceholderText(/Digite ou fale com seu CFO Virtual/i);
    fireEvent.change(input, { target: { value: "Fazer TTS?" } });
    fireEvent.click(screen.getByRole("button", { name: /Enviar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Resposta do Advisor OK/i)).toBeInTheDocument();
    });
    expect(speakSpy).toHaveBeenCalledTimes(1);
  });

  it("quando voiceTTS=false, NÃO chama speak()", async () => {
    const speakSpy = vi.fn(async () => { });
    vi.doMock("../../hooks/useTTS", () => ({
      useTTS: () => ({ speak: speakSpy, stop: vi.fn(), loading: false, error: null }),
    }));
    const { default: AdvisorChatWithMock } = await import("../AdvisorChat");

    const featuresOff = {
      features: { voiceTTS: false, voiceSTT: false, voiceTier: "standard" },
      voiceProfiles: baseVoiceProfiles,
    };

    render(withFeatures(<AdvisorChatWithMock />, featuresOff));

    const input = screen.getByPlaceholderText(/Digite ou fale com seu CFO Virtual/i);
    fireEvent.change(input, { target: { value: "Sem TTS?" } });
    fireEvent.click(screen.getByRole("button", { name: /Enviar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Resposta do Advisor OK/i)).toBeInTheDocument();
    });
    expect(speakSpy).not.toHaveBeenCalled();
  });
});
