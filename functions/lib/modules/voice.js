"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voiceRouter = void 0;
// ============================
// 🎙️ Voice Commands Module — Momentum (v7.9.2)
// ============================
const express_1 = require("express");
const requireAuth_1 = require("../middleware/requireAuth");
const logger_1 = require("../utils/logger");
exports.voiceRouter = (0, express_1.Router)();
async function executeVoiceCommand(cmd, userId, tenantId) {
    logger_1.logger.info("Executing voice command", { cmd, userId, tenantId });
    return { ok: true, message: `Comando de voz recebido: ${cmd.text}` };
}
exports.voiceRouter.post("/command", requireAuth_1.requireAuth, async (req, res, next) => {
    try {
        const command = req.body;
        const userId = req.user?.uid ?? "anonymous";
        const tenantId = req.tenant?.info?.id ?? "none";
        const result = await executeVoiceCommand(command, userId, tenantId);
        res.json(result);
    }
    catch (err) {
        logger_1.logger.error("Voice command failed", { error: err.message });
        next(err);
    }
});
