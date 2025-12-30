"use strict";
// ============================================================
// 🧠 Momentum Voice AI Service — Speech-to-Text + Gemini v9.5
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
exports.voiceHandler = voiceHandler;
const multer_1 = __importDefault(require("multer"));
const checkPlan_1 = require("../middleware/checkPlan");
const logger_1 = require("../utils/logger");
const firebase_1 = require("src/services/firebase");
const aiClient_1 = require("../utils/aiClient");
// Lazy load — evita timeout no deploy
let speechClient;
async function getSpeechClient() {
    if (!speechClient) {
        const speech = await Promise.resolve().then(() => __importStar(require("@google-cloud/speech")));
        speechClient = new speech.SpeechClient();
    }
    return speechClient;
}
// Upload handler (áudio em memória)
exports.upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// ============================================================
// 🎤  Fala → Texto com pontuação natural (Gemini refinement)
// ============================================================
async function voiceHandler(req, res) {
    try {
        const uid = req.user?.uid;
        if (!uid)
            throw new Error("Usuário não autenticado.");
        const file = req.file;
        if (!file)
            throw new Error("Nenhum áudio enviado.");
        // 💳 Controle de cota
        await (0, checkPlan_1.checkPlanLimit)(uid, 150, "voiceAI");
        const client = await getSpeechClient();
        const audioBytes = file.buffer.toString("base64");
        const [sttResponse] = await client.recognize({
            audio: { content: audioBytes },
            config: {
                encoding: "WEBM_OPUS",
                languageCode: "pt-BR",
                enableAutomaticPunctuation: true,
            },
        });
        const rawText = sttResponse.results
            ?.map((r) => r.alternatives?.[0]?.transcript)
            .join(" ")
            .trim() || "";
        if (!rawText)
            throw new Error("Falha na transcrição do áudio.");
        // ✨ Reescreve a fala com pontuação natural via Gemini
        const refinement = await (0, aiClient_1.aiClient)(`Reescreva naturalmente esta frase com pontuação correta e entonação humana: "${rawText}"`, {
            tenantId: "voice",
            userId: uid,
            model: "gemini",
            promptKind: "speech-refine",
            locale: "pt-BR",
        });
        const finalText = refinement.text?.trim() || rawText;
        // 📊 Log Firestore
        await firebase_1.db.collection("ai_voice_logs").add({
            uid,
            transcript: rawText,
            refined: finalText,
            timestamp: Date.now(),
        });
        logger_1.logger.info("🎧 Transcrição de voz concluída", { uid });
        res.json({ ok: true, text: finalText });
    }
    catch (err) {
        logger_1.logger.error("❌ Erro no voiceHandler", { error: err.message });
        res.status(500).json({
            ok: false,
            error: err.message || "Erro interno no processamento de voz.",
        });
    }
}
