"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrSetCache = getOrSetCache;
const firebase_1 = require("../services/firebase");
const logger_1 = require("../utils/logger");
/**
 * Retrieves a cached value or executes a function to generate and cache it.
 * @param key A unique key for the cache entry.
 * @param fn An async function that generates the value to be cached.
 * @param ttlHours The time-to-live for the cache entry in hours.
 * @returns The result of the function, either from cache or newly generated.
 */
async function getOrSetCache(key, fn, ttlHours = 6) {
    const ref = firebase_1.db.collection('ai_cache').doc(key);
    try {
        const doc = await ref.get();
        if (doc.exists) {
            const data = doc.data();
            const ageInMillis = Date.now() - data.createdAt;
            const ageInHours = ageInMillis / (1000 * 60 * 60);
            if (ageInHours < ttlHours) {
                logger_1.logger.info(`Cache hit for key: ${key}`);
                return data.result;
            }
        }
    }
    catch (err) {
        logger_1.logger.error('Failed to read from AI cache', { key, err });
    }
    logger_1.logger.info(`Cache miss for key: ${key}. Executing function.`);
    const result = await fn();
    try {
        await ref.set({ result, createdAt: Date.now() });
    }
    catch (err) {
        logger_1.logger.error('Failed to write to AI cache', { key, err });
    }
    return result;
}
