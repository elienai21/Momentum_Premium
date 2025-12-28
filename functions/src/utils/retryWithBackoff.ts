// ============================
// 🔄 Retry with Backoff Utility
// ============================

/**
 * Retry a function with exponential backoff
 * Only retries on transient errors (429, 5xx)
 */

interface RetryOptions {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    shouldRetry?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxRetries: 2,
    initialDelayMs: 1000,
    maxDelayMs: 4000,
    shouldRetry: (error: any) => {
        // Retry on rate limiting or server errors
        const status = error.status || error.statusCode || error.code;
        return (
            status === 429 ||
            status === 500 ||
            status === 502 ||
            status === 503 ||
            status === 504 ||
            error.message?.includes("ECONNRESET") ||
            error.message?.includes("ETIMEDOUT")
        );
    },
};

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic
 * @param fn - Async function to execute
 * @param options - Retry options
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError: any;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;

            // Don't retry if we've exhausted attempts
            if (attempt === opts.maxRetries) {
                throw error;
            }

            // Check if we should retry this error
            if (!opts.shouldRetry(error)) {
                throw error;
            }

            // Calculate delay with exponential backoff
            const delay = Math.min(
                opts.initialDelayMs * Math.pow(2, attempt),
                opts.maxDelayMs
            );

            console.warn(`Retry attempt ${attempt + 1}/${opts.maxRetries} after ${delay}ms`, {
                error: error.message,
                status: error.status || error.statusCode,
            });

            await sleep(delay);
        }
    }

    throw lastError;
}

/**
 * Create an AbortController that times out after specified ms
 * @param timeoutMs - Timeout in milliseconds
 */
export function createTimeout(timeoutMs: number): {
    signal: AbortSignal;
    clear: () => void;
} {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    return {
        signal: controller.signal,
        clear: () => clearTimeout(timeoutId),
    };
}
