"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transcribeFromGcs = transcribeFromGcs;
// functions/src/services/sttService.ts
const speech_1 = __importDefault(require("@google-cloud/speech"));
const storage_1 = require("@google-cloud/storage");
// import { logger } from "../utils/logger";
// Lazy init dos clients de STT (Speech-to-Text) e Storage
let speechClient = null;
let storageClient = null;
function getSttClients() {
    if (!speechClient) {
        speechClient = new speech_1.default.SpeechClient();
    }
    if (!storageClient) {
        storageClient = new storage_1.Storage();
    }
    return { client: speechClient, storage: storageClient };
}
const bucketName = process.env.VOICE_BUCKET || "";
function ensureBucket() {
    if (!bucketName) {
        // logger?.warn?.("VOICE_BUCKET não configurado; STT desativado neste ambiente");
        throw Object.assign(new Error("STT não configurado (VOICE_BUCKET ausente)"), {
            code: "VOICE_DISABLED",
            status: 503,
        });
    }
    return bucketName;
}
async function transcribeFromGcs(params) {
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
        .flatMap((r) => r.alternatives || [])
        .map((a) => a.transcript)
        .join(" ")
        .trim();
    return { text: transcription };
}
