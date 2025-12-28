"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.voiceController = void 0;
// ============================
// 🗣️ Voice Controller — Momentum Voice AI (v7.9 Fix Final)
// ============================
const express_1 = require("express");
const requireAuth_1 = require("../middleware/requireAuth");
const busboy_1 = __importDefault(require("busboy"));
const logger_1 = require("../utils/logger");
// ⚠️ Placeholder seguro até o módulo ai/voice ser implementado
async function handleVoiceCommand(payload, _req) {
    if (payload.text) {
        return {
            message: `Comando de voz recebido: "${payload.text}"`,
            actions: [{ name: "echo", args: { text: payload.text } }],
        };
    }
    if (payload.audio) {
        return {
            message: `Áudio recebido (${payload.filename}), processamento simulado.`,
            transcript: "Simulação de transcrição (stub).",
        };
    }
    return { message: "Nenhum dado válido recebido." };
}
exports.voiceController = (0, express_1.Router)();
/**
 * Aceita:
 *  - JSON: { text }
 *  - multipart/form-data: "audio" (audio/webm)
 */
exports.voiceController.post("/voice/command", requireAuth_1.requireAuth, async (req, res, next) => {
    try {
        if (req.is("application/json")) {
            const { text } = req.body || {};
            if (!text)
                return res.status(400).json({ ok: false, error: "Missing text" });
            const out = await handleVoiceCommand({ uid: req.user.uid, text }, req);
            return res.json({ ok: true, ...out });
        }
        if (req.is("multipart/form-data")) {
            const bb = (0, busboy_1.default)({ headers: req.headers });
            let audioBuffer = null;
            let filename = "voice.webm";
            await new Promise((resolve, reject) => {
                bb.on("file", (_name, file, info) => {
                    filename = info.filename || filename;
                    const chunks = [];
                    file.on("data", (d) => chunks.push(d));
                    file.on("end", () => {
                        audioBuffer = Buffer.concat(chunks);
                    });
                });
                bb.on("error", reject);
                bb.on("finish", resolve);
                req.pipe(bb);
            });
            if (!audioBuffer)
                return res.status(400).json({ ok: false, error: "Missing audio" });
            const out = await handleVoiceCommand({ uid: req.user.uid, audio: audioBuffer, filename }, req);
            return res.json({ ok: true, ...out });
        }
        return res.status(415).json({ ok: false, error: "Unsupported content type" });
    }
    catch (err) {
        logger_1.logger.error("Voice command failed", { error: err.message });
        next(err);
    }
});
