"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.visionUploadRouter = void 0;
// ============================
// 🧾 Vision Upload — Receipt Parser API (v7.9 Final)
// ============================
const express_1 = require("express");
const busboy_1 = __importDefault(require("busboy"));
const requireAuth_1 = require("../middleware/requireAuth");
const logger_1 = require("../utils/logger");
const vision_1 = require("../ai/vision");
exports.visionUploadRouter = (0, express_1.Router)();
exports.visionUploadRouter.post("/vision/parse", requireAuth_1.requireAuth, async (req, res, next) => {
    try {
        const bb = (0, busboy_1.default)({ headers: req.headers });
        let imageBuffer = null;
        let fileName = "receipt.jpg";
        await new Promise((resolve, reject) => {
            bb.on("file", (_name, file, info) => {
                fileName = info.filename || fileName;
                const chunks = [];
                file.on("data", (d) => chunks.push(d));
                file.on("end", () => (imageBuffer = Buffer.concat(chunks)));
            });
            bb.on("error", reject);
            bb.on("finish", resolve);
            req.pipe(bb);
        });
        if (!imageBuffer) {
            return res.status(400).json({ ok: false, error: "Missing image file" });
        }
        const userId = req?.user?.uid ?? "anonymous";
        const result = await (0, vision_1.analyzeReceiptImage)(imageBuffer, { fileName, uid: userId });
        return res.json({ ok: true, ...result });
    }
    catch (err) {
        logger_1.logger.error("Vision parse failed", { error: err.message });
        next(err);
    }
});
