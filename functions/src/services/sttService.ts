// functions/src/services/sttService.ts
import speech from "@google-cloud/speech";
import { Storage } from "@google-cloud/storage";
// import { logger } from "../utils/logger";

// Lazy init dos clients de STT (Speech-to-Text) e Storage
let speechClient: any | null = null;
let storageClient: Storage | null = null;

function getSttClients() {
  if (!speechClient) {
    speechClient = new speech.SpeechClient();
  }
  if (!storageClient) {
    storageClient = new Storage();
  }
  return { client: speechClient, storage: storageClient };
}

const bucketName = process.env.VOICE_BUCKET || "";

function ensureBucket() {
  if (!bucketName) {
    // logger?.warn?.("VOICE_BUCKET não configurado; STT desativado neste ambiente");
    throw Object.assign(
      new Error("STT não configurado (VOICE_BUCKET ausente)"),
      {
        code: "VOICE_DISABLED",
        status: 503,
      }
    );
  }
  return bucketName;
}

// 🔧 Incluí tenantId como opcional para compatibilizar com src/routes/voice.ts
export type SttParams = {
  gcsUri: string;
  languageCode?: string;
  tenantId?: string;
};

export async function transcribeFromGcs(params: SttParams) {
  const { gcsUri, languageCode = "pt-BR" } = params;

  if (!gcsUri) {
    throw new Error("gcsUri é obrigatório para STT");
  }

  ensureBucket(); // só valida config; se quiser, pode validar prefixo do gcsUri também

  const { client } = getSttClients();

  const [operation] = await client.longRunningRecognize({
    audio: { uri: gcsUri },
    config: {
      languageCode,
      encoding: "WEBM_OPUS",
      enableAutomaticPunctuation: true,
    },
  });

  const [response] = await operation.promise();
  const transcription = (response.results || [])
    .flatMap((r: any) => r.alternatives || [])
    .map((a: any) => a.transcript)
    .join(" ")
    .trim();

  return { text: transcription };
}
