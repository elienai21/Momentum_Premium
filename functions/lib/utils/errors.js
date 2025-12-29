"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
class ApiError extends Error {
    status;
    traceId;
    constructor(status, message, traceId) {
        super(message);
        this.status = status;
        this.traceId = traceId;
    }
}
exports.ApiError = ApiError;
