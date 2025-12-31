"use strict";
// ============================================================
// 🎧 Advisor Voice Route — Momentum AI (v9.5 Unified)
// ============================================================
// 🔹 Pipeline completo: áudio → texto → IA → fala (TTS)
// ============================================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.advisorVoice = advisorVoice;
const advisor_1 = require("./advisor");
const checkPlan_1 = require("../middleware/checkPlan");
const firebase_1 = require("../services/firebase");
const logger_1 = require("../utils/logger");
// Lazy-load para evitar timeout
let speechClient, ttsClient;
async function getSpeechClient() {
    if (!speechClient) {
        const speech = await Promise.resolve().then(() => __importStar(require("@google-cloud/speech")));
        speechClient = new speech.SpeechClient();
    }
    return speechClient;
}
async function getTTSClient() {
    if (!ttsClient) {
        const tts = await Promise.resolve().then(() => __importStar(require("@google-cloud/text-to-speech")));
        ttsClient = new tts.TextToSpeechClient();
    }
    return ttsClient;
}
// ============================================================
// 🎙️ Processa entrada de voz e gera resposta falada
// ============================================================
async function advisorVoice(req, res) {
    try {
        const uid = req.user?.uid;
        if (!uid)
            throw new Error("Usuário não autenticado.");
        await (0, checkPlan_1.checkPlanLimit)(uid, 200, "voiceAI");
        const audioBuffer = req.file?.buffer ||
            req.rawBody ||
            Buffer.from([]);
        if (!audioBuffer.length)
            throw new Error("Nenhum áudio recebido.");
        // 🎧 1️⃣ Transcreve o áudio (fala → texto)
        const speech = await getSpeechClient();
        const [result] = await speech.recognize({
            audio: { content: audioBuffer.toString("base64") },
            config: {
                encoding: "WEBM_OPUS",
                sampleRateHertz: 48000,
                languageCode: "pt-BR",
                enableAutomaticPunctuation: true,
            },
        });
        const transcript = result?.results?.map((r) => r.alternatives?.[0]?.transcript).join(" ") || "";
        if (!transcript)
            throw new Error("Falha ao transcrever o áudio.");
        logger_1.logger.info("🎤 Transcrição obtida", { uid, transcript });
        // 🧠 2️⃣ Envia texto ao Advisor
        const mockReq = { ...req, body: { message: transcript } };
        const mockRes = { json: (d) => d };
        const resultAI = await (0, advisor_1.runAdvisor)(mockReq, mockRes);
        const replyText = resultAI?.reply?.answer || "Não consegui responder agora.";
        // 🔊 3️⃣ Converte resposta em áudio (texto → voz neural)
        const tts = await getTTSClient();
        const [speechResult] = await tts.synthesizeSpeech({
            input: { text: replyText },
            voice: { languageCode: "pt-BR", ssmlGender: "FEMALE" },
            audioConfig: { audioEncoding: "MP3", speakingRate: 1.05, pitch: 0.8 },
        });
        // 🪵 4️⃣ Log no Firestore
        await firebase_1.db.collection("ai_usage_logs").add({
            uid,
            feature: "voiceAI",
            transcript,
            response: replyText,
            timestamp: Date.now(),
        });
        logger_1.logger.info("✅ advisorVoice finalizado", { uid });
        // 📦 5️⃣ Retorna áudio gerado
        res.set("Content-Type", "audio/mpeg");
        res.send(speechResult.audioContent);
    }
    catch (err) {
        logger_1.logger.error("❌ advisorVoice error", { error: err.message });
        res.status(500).json({ ok: false, error: err.message });
    }
}
