// functions/src/types/ai.ts

export interface AiQueryRequest {
  /** Pergunta do usuário (obrigatória) */
  question: string;
  /** Contexto adicional (ex.: resumo do tenant, último saldo, etc.) */
  context?: string;
  /** pt-BR, en-US etc. */
  locale?: string;
}

export interface AiQuerySuccessResponse {
  ok: true;
  answer: string;
  /** Resposta bruta do provedor de IA, se quiser expor */
  raw?: any;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  meta: {
    traceId: string;
    model?: string;
    duration_ms?: number;
  };
}

export interface AiQueryErrorResponse {
  ok: false;
  error: string;
  traceId: string;
}

export type AiQueryApiResponse =
  | AiQuerySuccessResponse
  | AiQueryErrorResponse;
