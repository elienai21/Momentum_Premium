"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.synthesizeToGcs = synthesizeToGcs;
// functions/src/services/ttsService.ts
const text_to_speech_1 = __importDefault(require("@google-cloud/text-to-speech"));
const storage_1 = require("@google-cloud/storage");
// import logger se você tiver um (opcional)
// import { logger } from "../utils/logger";
// Lazy init dos clients de TTS (Text-to-Speech) e Storage
let ttsClient = null;
let storageClient = null;
function getTtsClients() {
    if (!ttsClient) {
        ttsClient = new text_to_speech_1.default.TextToSpeechClient();
    }
    if (!storageClient) {
        storageClient = new storage_1.Storage();
    }
    return { client: ttsClient, storage: storageClient };
}
const bucketName = process.env.VOICE_BUCKET || ""; // não joga erro aqui
function ensureBucket() {
    if (!bucketName) {
        // logger?.warn?.("VOICE_BUCKET não configurado; TTS desativado neste ambiente");
        throw Object.assign(new Error("TTS não configurado (VOICE_BUCKET ausente)"), {
            code: "VOICE_DISABLED",
            status: 503,
        });
    }
    const { storage } = getTtsClients();
    return storage.bucket(bucketName);
}
async function synthesizeToGcs(params) {
    const { text, lang = "pt-BR", voiceName = "pt-BR-Neural2-A", tenantId, } = params;
    if (!text || !text.trim()) {
        throw new Error("Texto é obrigatório para TTS");
    }
    const bucket = ensureBucket();
    const safeTenantId = tenantId || "unknown";
    const hash = Buffer.from(text).toString("base64url").slice(0, 24);
    const fileName = `tts/${safeTenantId}/${hash}.mp3`;
    const file = bucket.file(fileName);
    // cache: se já existe, só retorna a URL
    const [exists] = await file.exists();
    if (exists) {
        const [metadata] = await file.getMetadata().catch(() => [{ mediaLink: null }]);
        return {
            cached: true,
            url: metadata.mediaLink,
        };
    }
    const { client } = getTtsClients();
    // chama TTS real
    const [response] = await client.synthesizeSpeech({
        input: { text },
        voice: { languageCode: lang, name: voiceName },
        audioConfig: { audioEncoding: "MP3" },
    });
    const audioContent = response.audioContent;
    if (!audioContent) {
        throw new Error("Falha ao gerar áudio TTS");
    }
    await file.save(audioContent, {
        contentType: "audio/mpeg",
        resumable: false,
    });
    const [metadata] = await file.getMetadata();
    return {
        cached: false,
        url: metadata.mediaLink,
    };
}
