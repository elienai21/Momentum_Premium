"use strict";
// src/utils/fetchWithTimeout.ts
// ============================================
// ⏱️ Safe Fetch with AbortController Timeout
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchWithTimeout = fetchWithTimeout;
const errors_1 = require("./errors");
/**
 * Wrapper around global fetch with AbortController timeout support
 * Ensures requests are actually cancelled (aborted) on timeout
 */
async function fetchWithTimeout(url, options = {}) {
    const { timeoutMs = 30000, traceId, errorMessage = "External API timeout", ...fetchOptions } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal,
        });
        return response;
    }
    catch (error) {
        if (error.name === "AbortError") {
            throw new errors_1.ApiError(504, errorMessage, traceId);
        }
        // Re-throw other errors
        throw error;
    }
    finally {
        clearTimeout(id);
    }
}
