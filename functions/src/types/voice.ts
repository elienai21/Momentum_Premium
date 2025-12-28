// functions/src/types/voice.ts

export interface VoiceQueryRequest {
  /** Texto já transcrito OU comando direto de voz em texto */
  text?: string;
  /** Referência para áudio (ex.: GCS URI) */
  audioGcsUri?: string;
  /** Idioma principal (ex.: "pt-BR") */
  locale?: string;
}

export interface VoiceQuerySuccessResponse {
  ok: true;
  /** Texto interpretado do comando de voz */
  interpretedText: string;
  /** Resposta/ação do sistema para o comando */
  answer: string;
  meta: {
    traceId: string;
    duration_ms?: number;
  };
}

export interface VoiceQueryErrorResponse {
  ok: false;
  error: string;
  traceId: string;
}

export type VoiceQueryApiResponse =
  | VoiceQuerySuccessResponse
  | VoiceQueryErrorResponse;
