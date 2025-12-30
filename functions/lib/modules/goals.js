"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.goalsRouter = void 0;
const firebase_1 = require("src/services/firebase");
const express_1 = require("express");
// FIX: Add import for type augmentations
require("../types");
const requireAuth_1 = require("../middleware/requireAuth");
const withTenant_1 = require("../middleware/withTenant");
const requireFeature_1 = require("../middleware/requireFeature");
const zod_1 = require("zod");
const logger_1 = require("../utils/logger");
exports.goalsRouter = (0, express_1.Router)();
exports.goalsRouter.use(requireAuth_1.requireAuth, withTenant_1.withTenant, (0, requireFeature_1.requireFeature)("goals"));
const goalSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    targetAmount: zod_1.z.number().positive(),
    currentAmount: zod_1.z.number().nonnegative(),
    targetDate: zod_1.z.string().datetime(),
});
const getCollection = (userId) => firebase_1.db.collection(`users/${userId}/goals`);
// Get all goals for the user
exports.goalsRouter.get("/", async (req, res, next) => {
    try {
        const snapshot = await getCollection(req.user.uid).orderBy("targetDate").get();
        const goals = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        res.json({ status: "success", data: goals });
    }
    catch (err) {
        logger_1.logger.error("Failed to get goals", { traceId: req.traceId, error: err }, req);
        next(err);
    }
});
// Add a new goal
exports.goalsRouter.post("/", async (req, res, next) => {
    try {
        const data = goalSchema.parse(req.body);
        const ref = await getCollection(req.user.uid).add(data);
        res.status(201).json({ status: "success", data: { id: ref.id, ...data } });
    }
    catch (err) {
        logger_1.logger.error("Failed to create goal", { traceId: req.traceId, error: err }, req);
        next(err);
    }
});
