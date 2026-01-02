// web/src/hooks/useSupportChat.ts
import { useCallback, useMemo, useState } from "react";
import { track } from "../lib/analytics";
import { useAuthToken } from "./useAuthToken";
import authorizedFetch from "@/services/authorizedFetch";

export interface SupportMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: Date;
}

export interface UseSupportChatResult {
  messages: SupportMessage[];
  isSending: boolean;
  error: Error | null;
  noCredits: boolean;
  sendMessage: (content: string) => Promise<void>;
  reset: () => void;
}

interface SupportResponse {
  answer: string;
  language: string;
  topics?: string[];
  confidence?: number;
  sessionId?: string;
}

interface SupportErrorPayload {
  code?: string;
  message?: string;
}

async function askSupport(
  question: string,
  locale?: string,
  sessionId?: string,
): Promise<SupportResponse> {
  const res = await authorizedFetch("/api/support/chat", {
    method: "POST",
    body: { question, locale, sessionId },
  });

  if (!res.ok) {
    let payload: SupportErrorPayload | null = null;

    try {
      payload = (await res.json()) as SupportErrorPayload;
    } catch {
      // body vazio ou não JSON – ignora
    }

    const err = new Error(
      payload?.message ??
        "Não foi possível falar com o suporte automatizado agora. Tente novamente em alguns instantes.",
    ) as Error & { code?: string };

    if (payload?.code) {
      err.code = payload.code;
    }

    throw err;
  }

  return (await res.json()) as SupportResponse;
}

const initialSystemMessage: SupportMessage = {
  id: "system-welcome",
  role: "system",
  content:
    "Sou o assistente de suporte do Momentum. Posso te ajudar com:\n" +
    "– como usar o painel\n" +
    "– entender seus relatórios\n" +
    "– saber onde ajustar planos e créditos\n" +
    "– tirar dúvidas sobre CFO, Pulse, Mercado e Voz.\n" +
    "Não respondo dúvidas legais, tributárias ou médicas.",
  createdAt: new Date(),
};

export function useSupportChat(): UseSupportChatResult {
  const token = useAuthToken();
  const [messages, setMessages] = useState<SupportMessage[]>([
    initialSystemMessage,
  ]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [noCredits, setNoCredits] = useState(false);

  // id da sessão de suporte gerenciada pelo backend
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);

  const locale = useMemo(
    () => navigator?.language ?? "pt-BR",
    [],
  );

  const reset = useCallback(() => {
    setMessages([
      {
        ...initialSystemMessage,
        createdAt: new Date(),
      },
    ]);
    setError(null);
    setNoCredits(false);
    setSessionId(undefined);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isSending) return;

      if (!token) {
        setError(
          new Error(
            "Você precisa estar autenticado para falar com o suporte Momentum.",
          ),
        );
        return;
      }

      const now = new Date();

      const userMessage: SupportMessage = {
        id: `user-${now.getTime()}`,
        role: "user",
        content: trimmed,
        createdAt: now,
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsSending(true);
      setError(null);
      setNoCredits(false);

      track?.("support_send");

      try {
        const response = await askSupport(trimmed, locale, sessionId);

        if (response.sessionId && response.sessionId !== sessionId) {
          setSessionId(response.sessionId);
        }

        const assistantMessage: SupportMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response.answer,
          createdAt: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err: any) {
        const maybeCode = (err && (err as any).code) as string | undefined;

        if (maybeCode === "NO_CREDITS") {
          setNoCredits(true);
        }

        const friendly =
          err instanceof Error
            ? err.message
            : "Não consegui responder agora. Tente novamente em alguns instantes.";

        setError(new Error(friendly));

        // opcional: adiciona uma mensagem do assistente explicando o erro
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-error-${Date.now()}`,
            role: "assistant",
            content: friendly,
            createdAt: new Date(),
          },
        ]);

        if (import.meta.env.DEV) {
          // importante: endpoint novo de suporte
          // eslint-disable-next-line no-console
          console.warn("[Support] Falha ao enviar para /api/support/chat:", err);
        }

        throw err;
      } finally {
        setIsSending(false);
      }
    },
    [isSending, locale, token, sessionId],
  );

  return {
    messages,
    isSending,
    error,
    noCredits,
    sendMessage,
    reset,
  };
}
