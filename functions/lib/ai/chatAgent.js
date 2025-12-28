"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatAgentRouter = void 0;
exports.processChatMessage = processChatMessage;
const express_1 = require("express");
const requireAuth_1 = require("../middleware/requireAuth");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const advisor_1 = require("./advisor");
exports.chatAgentRouter = (0, express_1.Router)();
async function processChatMessage(...args) {
    const message = String(args[2] ?? args[0] ?? '');
    return (0, advisor_1.advisorReply)(message);
}
exports.chatAgentRouter.post('/chat', requireAuth_1.requireAuth, async (req, res, next) => {
    try {
        const message = String(req.body?.message || '').trim();
        if (!message)
            throw new errors_1.ApiError(400, 'Mensagem vazia', req.traceId);
        const out = await (0, advisor_1.advisorReply)(message);
        logger_1.logger.info('Advisor respondeu');
        res.json(out);
    }
    catch (e) {
        next(e);
    }
});
