// src/cron/cleanupExpiredLogs.ts
// ============================
// 🧹 TTL Cleanup — Remove expired logs (LGPD Compliance)
// ============================

import { db } from "src/services/firebase";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import { logger } from "../utils/logger";

// Configuration
const BATCH_SIZE = 500;
const MAX_DOCS_PER_RUN = 5000;
const MAX_RUNTIME_MS = 8 * 60 * 1000; // 8 minutes (leave buffer for 540s timeout)

// Collections with expiresAt field to clean up
const COLLECTIONS_TO_CLEAN = [
    { path: "advisor_logs", isSubcollection: true, parent: "tenants" },
    // Add more collections here as needed
];

interface CleanupResult {
    collection: string;
    deleted: number;
    dryRun: boolean;
}

/**
 * Delete expired documents from a collection
 */
async function cleanupCollection(
    collectionPath: string,
    isSubcollection: boolean,
    parentCollection: string,
    dryRun: boolean,
    startTime: number
): Promise<CleanupResult> {
    const now = new Date();
    let totalDeleted = 0;

    try {
        if (isSubcollection) {
            // For subcollections like tenants/{tenantId}/advisor_logs
            // Use collectionGroup query
            const expiredQuery = db
                .collectionGroup(collectionPath)
                .where("expiresAt", "<", now)
                .limit(BATCH_SIZE);

            let hasMore = true;
            while (hasMore && totalDeleted < MAX_DOCS_PER_RUN) {
                // Check runtime limit
                if (Date.now() - startTime > MAX_RUNTIME_MS) {
                    logger.warn("Cleanup: runtime limit reached", {
                        collection: collectionPath,
                        deleted: totalDeleted,
                    });
                    break;
                }

                const snapshot = await expiredQuery.get();

                if (snapshot.empty) {
                    hasMore = false;
                    break;
                }

                if (dryRun) {
                    totalDeleted += snapshot.size;
                    logger.info(`[DRY RUN] Would delete ${snapshot.size} docs from ${collectionPath}`);
                    hasMore = false; // In dry run, just count first batch
                } else {
                    // Delete in batch
                    const batch = db.batch();
                    snapshot.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
                        batch.delete(doc.ref);
                    });
                    await batch.commit();
                    totalDeleted += snapshot.size;

                    // If we got fewer docs than limit, we're done
                    hasMore = snapshot.size === BATCH_SIZE;
                }
            }
        } else {
            // For top-level collections
            const expiredQuery = db
                .collection(collectionPath)
                .where("expiresAt", "<", now)
                .limit(BATCH_SIZE);

            let hasMore = true;
            while (hasMore && totalDeleted < MAX_DOCS_PER_RUN) {
                if (Date.now() - startTime > MAX_RUNTIME_MS) {
                    logger.warn("Cleanup: runtime limit reached", {
                        collection: collectionPath,
                        deleted: totalDeleted,
                    });
                    break;
                }

                const snapshot = await expiredQuery.get();

                if (snapshot.empty) {
                    hasMore = false;
                    break;
                }

                if (dryRun) {
                    totalDeleted += snapshot.size;
                    logger.info(`[DRY RUN] Would delete ${snapshot.size} docs from ${collectionPath}`);
                    hasMore = false;
                } else {
                    const batch = db.batch();
                    snapshot.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
                        batch.delete(doc.ref);
                    });
                    await batch.commit();
                    totalDeleted += snapshot.size;
                    hasMore = snapshot.size === BATCH_SIZE;
                }
            }
        }
    } catch (err: any) {
        logger.error("Cleanup error", {
            collection: collectionPath,
            error: err.message,
        });
    }

    return {
        collection: collectionPath,
        deleted: totalDeleted,
        dryRun,
    };
}

/**
 * Main cleanup function (shared by scheduled and HTTP triggers)
 */
async function runCleanup(dryRun: boolean): Promise<{
    results: CleanupResult[];
    totalDeleted: number;
    durationMs: number;
}> {
    const startTime = Date.now();
    const results: CleanupResult[] = [];
    let totalDeleted = 0;

    logger.info("Starting expired logs cleanup", {
        dryRun,
        collections: COLLECTIONS_TO_CLEAN.map((c) => c.path),
    });

    for (const config of COLLECTIONS_TO_CLEAN) {
        const result = await cleanupCollection(
            config.path,
            config.isSubcollection,
            config.parent,
            dryRun,
            startTime
        );
        results.push(result);
        totalDeleted += result.deleted;
    }

    const durationMs = Date.now() - startTime;

    logger.info("Expired logs cleanup completed", {
        dryRun,
        totalDeleted,
        durationMs,
        results: results.map((r) => ({ collection: r.collection, deleted: r.deleted })),
    });

    return { results, totalDeleted, durationMs };
}

/**
 * Scheduled cleanup - runs daily at 3 AM São Paulo time
 */
export const cleanupExpiredLogs = onSchedule(
    {
        schedule: "0 3 * * *", // Every day at 3 AM
        timeZone: "America/Sao_Paulo",
        region: "southamerica-east1",
        timeoutSeconds: 540, // 9 minutes max
        memory: "512MiB",
    },
    async () => {
        await runCleanup(false); // Production run, actually delete
    }
);

/**
 * HTTP trigger for manual/testing - supports dryRun parameter
 * Usage: POST /cleanupExpiredLogsHttp?dryRun=true
 */
export const cleanupExpiredLogsHttp = onRequest(
    {
        region: "southamerica-east1",
        timeoutSeconds: 540,
        memory: "512MiB",
    },
    async (req, res) => {
        const dryRun = req.query.dryRun === "true";

        try {
            const result = await runCleanup(dryRun);
            res.status(200).json({
                ok: true,
                ...result,
            });
        } catch (err: any) {
            logger.error("Cleanup HTTP error", { error: err.message });
            res.status(500).json({
                ok: false,
                error: "Cleanup failed",
            });
        }
    }
);
