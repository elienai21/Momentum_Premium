"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRouter = void 0;
const firebase_1 = require("../services/firebase");
const express_1 = require("express");
// FIX: Add import for type augmentations
require("../types");
const zod_1 = require("zod");
const requireAuth_1 = require("../middleware/requireAuth");
const withTenant_1 = require("../middleware/withTenant");
const chatAgent_1 = require("../ai/chatAgent");
const errors_1 = require("../utils/errors");
exports.chatRouter = (0, express_1.Router)();
const chatSchema = zod_1.z.object({
    message: zod_1.z.string().min(1).max(2000),
});
// Endpoint to send a new message and get a response
exports.chatRouter.post("/session", requireAuth_1.requireAuth, withTenant_1.withTenant, async (req, res, next) => {
    try {
        if (!req.tenant)
            throw new errors_1.ApiError(400, "Tenant context is required.");
        const { message } = chatSchema.parse(req.body);
        // Pass the full request object for context (locale, traceId)
        const responseText = await (0, chatAgent_1.processChatMessage)(req.user.uid, req.tenant.info, message, req);
        res.json({ status: "success", data: { text: responseText } });
    }
    catch (error) {
        next(error);
    }
});
// Endpoint to retrieve chat history
exports.chatRouter.get("/history", requireAuth_1.requireAuth, async (req, res, next) => {
    try {
        const sessionRef = firebase_1.db.collection("chat_sessions").doc(req.user.uid);
        const sessionSnap = await sessionRef.get();
        if (!sessionSnap.exists) {
            return res.json({ status: "success", data: { history: [] } });
        }
        const history = sessionSnap.data()?.history || [];
        res.json({ status: "success", data: { history } });
    }
    catch (error) {
        next(error);
    }
});
