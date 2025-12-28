// src/utils/fetchWithTimeout.ts
// ============================================
// ⏱️ Safe Fetch with AbortController Timeout
// ============================================

import { ApiError } from "./errors";

/**
 * Options for safe fetch
 */
export interface SafeFetchOptions extends RequestInit {
    timeoutMs?: number;
    traceId?: string;
    errorMessage?: string;
}

/**
 * Wrapper around global fetch with AbortController timeout support
 * Ensures requests are actually cancelled (aborted) on timeout
 */
export async function fetchWithTimeout(
    url: string,
    options: SafeFetchOptions = {}
): Promise<Response> {
    const {
        timeoutMs = 30000,
        traceId,
        errorMessage = "External API timeout",
        ...fetchOptions
    } = options;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal,
        });
        return response;
    } catch (error: any) {
        if (error.name === "AbortError") {
            throw new ApiError(504, errorMessage, traceId);
        }
        // Re-throw other errors
        throw error;
    } finally {
        clearTimeout(id);
    }
}
