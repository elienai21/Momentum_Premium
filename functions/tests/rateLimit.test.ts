
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { createRateLimit } from "../src/middleware/rateLimit"; // Adjust import path
import { Request, Response } from "express";

type RunTransaction = <T>(fn: (tx: any) => Promise<T>) => Promise<T>;
const runTransactionMock = jest.fn() as unknown as jest.MockedFunction<RunTransaction>;
runTransactionMock.mockImplementation(async (fn: any) => fn({
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
}));

const firestoreMock: { runTransaction: jest.MockedFunction<RunTransaction>; collection: jest.Mock } = {
    runTransaction: runTransactionMock,
    collection: jest.fn(() => ({
        doc: jest.fn(() => ({
            get: jest.fn(),
            set: jest.fn(),
        })),
    })),
};

jest.mock("firebase-admin", () => ({
    apps: [],
    initializeApp: jest.fn(),
    firestore: () => firestoreMock,
}));

describe("Rate Limit Middleware (Memory Fallback)", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: jest.Mock;

    beforeEach(() => {
        firestoreMock.runTransaction.mockReset();
        jest.clearAllMocks();
        req = {
            ip: "127.0.0.1",
            path: "/api/test",
            headers: {},
        };
        res = {
            status: jest.fn().mockReturnThis() as any,
            json: jest.fn().mockReturnThis() as any,
            setHeader: jest.fn() as any,
        };
        next = jest.fn();

        // Reset Process Env
        process.env.RATE_LIMIT_MAX = "10";
    });

    // Since we cannot easily export/import private functions from the module without changing code to export them just for testing,
    // we will test the behavior through the public API (createRateLimit middleware) and mock scenarios.

    // NOTE: Testing private memory cache eviction directly is hard without exporting it. 
    // We rely on the code review for the implementation correctness of:
    // - MAX_CACHE_SIZE = 10000
    // - CLEANUP_INTERVAL_MS = 60000

    it("should block critical routes when Firestore fails (fail-closed)", async () => {
        // Mock Firestore transaction failure
        (firestoreMock.runTransaction as jest.Mock).mockImplementationOnce(async () => {
            throw new Error("Firestore unavailable");
        });

        const limiter = createRateLimit({ enabled: true });
        (req as any).path = "/api/billing/charge"; // Critical route

        await limiter(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(503);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            code: "RATE_LIMIT_UNAVAILABLE"
        }));
        expect(next).not.toHaveBeenCalled();
    });

    it("should allow non-critical routes when Firestore fails (fail-open / memory fallback)", async () => {
        // Mock Firestore transaction failure
        (firestoreMock.runTransaction as jest.Mock).mockImplementationOnce(async () => {
            throw new Error("Firestore unavailable");
        });

        const limiter = createRateLimit({ enabled: true });
        (req as any).path = "/api/public/status"; // Non-critical route

        await limiter(req as Request, res as Response, next);

        // Should fall back to memory or fail-open.
        // If memory works, it calls next(). If memory fails, it calls next() (fail-open).
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalledWith(503);
    });
});
