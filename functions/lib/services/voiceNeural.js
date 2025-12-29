"use strict";
// ============================================================
// 🎙️ Voice Neural Service — Momentum TTS AI (v8.4 Premium)
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.voiceNeural = voiceNeural;
const checkPlan_1 = require("../middleware/checkPlan");
const text_to_speech_1 = __importDefault(require("@google-cloud/text-to-speech"));
const logger_1 = require("../utils/logger");
const firebase_1 = require("../services/firebase");
// Lazy init do cliente de TTS (Text-to-Speech)
let ttsClient = null;
async function getTtsClient() {
    if (!ttsClient) {
        ttsClient = new text_to_speech_1.default.TextToSpeechClient();
    }
    return ttsClient;
}
// ============================================================
// 🔊 IA de Voz — TTS Neural Momentum
// ============================================================
async function voiceNeural(req, res) {
    const uid = req.user?.uid; // ajuste conforme seu middleware de auth
    const { text, voice = "female" } = req.body;
    if (!uid)
        return res
            .status(401)
            .json({ ok: false, error: "Usuário não autenticado." });
    if (!text || !text.trim())
        return res
            .status(400)
            .json({ ok: false, error: "Texto ausente para conversão." });
    try {
        // ✅ 1. Controle de plano (cota e feature)
        await (0, checkPlan_1.checkPlanLimit)(uid, 100, "ttsNeural");
        // ✅ 2. Geração de áudio
        const client = await getTtsClient();
        const [response] = await client.synthesizeSpeech({
            input: { text },
            voice: {
                languageCode: "pt-BR",
                name: voice === "male" ? "pt-BR-Neural2-D" : "pt-BR-Neural2-A",
            },
            audioConfig: {
                audioEncoding: "MP3",
                speakingRate: 1.05,
                pitch: 0.9,
                volumeGainDb: 0.2,
            },
        });
        if (!response.audioContent) {
            throw new Error("Falha ao gerar áudio de voz neural");
        }
        // ✅ 3. Registro no Firestore (monitoramento de uso)
        await firebase_1.db.collection("ai_usage_logs").add({
            uid,
            feature: "ttsNeural",
            textLength: text.length,
            timestamp: Date.now(),
        });
        logger_1.logger.info("🟣 Voz neural gerada com sucesso", {
            uid,
            length: text.length,
        });
        res.set("Content-Type", "audio/mpeg").send(response.audioContent);
    }
    catch (error) {
        logger_1.logger.error("❌ Erro no voiceNeural", { uid, error: error.message });
        res.status(500).json({ ok: false, error: error.message });
    }
}
