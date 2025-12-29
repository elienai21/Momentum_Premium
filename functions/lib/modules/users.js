"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
const firebase_1 = require("../services/firebase");
const express_1 = require("express");
const requireAuth_1 = require("../middleware/requireAuth");
const logger_1 = require("../utils/logger");
exports.usersRouter = (0, express_1.Router)();
exports.usersRouter.post("/users/preferences", requireAuth_1.requireAuth, async (req, res, next) => {
    try {
        const uid = req.user.uid;
        const { name, agent, tone } = req.body;
        await firebase_1.db.collection("users").doc(uid).set({ preferences: { name, agent, tone } }, { merge: true });
        logger_1.logger.info("User preferences updated", { uid, name, agent, tone });
        res.json({ ok: true });
    }
    catch (error) {
        logger_1.logger.error("Failed to save user preferences", { error }, req);
        next(error);
    }
});
