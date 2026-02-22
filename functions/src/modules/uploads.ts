
import { Router } from "express";
import * as admin from "firebase-admin";
import { requireAuth } from "../middleware/requireAuth";
import { withTenant } from "../middleware/withTenant";
import { logger } from "../utils/logger";

const router = Router();

// Ensure admin is initialized (usually done in index.ts, but safe to check)
if (admin.apps.length === 0) {
    admin.initializeApp();
}

/**
 * POST /api/uploads/signed-url
 * Generates a signed URL for direct file upload to Storage.
 * Body: { filename: string, contentType: string }
 */
router.post("/signed-url", requireAuth, withTenant, async (req, res) => {
    try {
        const { filename, contentType } = req.body;

        if (!filename || !contentType) {
            return res.status(400).json({ status: "error", message: "Missing filename or contentType" });
        }

        const tenantId = req.tenant!.info.id;
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

    } catch (error: any) {
        logger.error("Failed to generate signed URL", { error: error.message, tenantId: req.tenant?.info.id });
        res.status(500).json({ status: "error", message: "Internal server error" });
    }
});

export const uploadsRouter = router;
