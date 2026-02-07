"use strict";
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
exports.uploadsRouter = void 0;
const express_1 = require("express");
const admin = __importStar(require("firebase-admin"));
const requireAuth_1 = require("../middleware/requireAuth");
const withTenant_1 = require("../middleware/withTenant");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
// Ensure admin is initialized (usually done in index.ts, but safe to check)
if (admin.apps.length === 0) {
    admin.initializeApp();
}
/**
 * POST /api/uploads/signed-url
 * Generates a signed URL for direct file upload to Storage.
 * Body: { filename: string, contentType: string }
 */
router.post("/signed-url", requireAuth_1.requireAuth, withTenant_1.withTenant, async (req, res) => {
    try {
        const { filename, contentType } = req.body;
        if (!filename || !contentType) {
            return res.status(400).json({ status: "error", message: "Missing filename or contentType" });
        }
        const tenantId = req.tenant.info.id;
        const timestamp = Date.now();
        // Sanitize filename
        const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filePath = `tenants/${tenantId}/uploads/${timestamp}_${safeFilename}`;
        const bucket = admin.storage().bucket();
        const file = bucket.file(filePath);
        const [url] = await file.getSignedUrl({
            version: 'v4',
            action: 'write',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
            contentType,
        });
        res.json({
            status: "success",
            data: {
                url,
                filePath,
                expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
            }
        });
    }
    catch (error) {
        logger_1.logger.error("Failed to generate signed URL", { error: error.message, tenantId: req.tenant?.info.id });
        res.status(500).json({ status: "error", message: "Internal server error" });
    }
});
exports.uploadsRouter = router;
