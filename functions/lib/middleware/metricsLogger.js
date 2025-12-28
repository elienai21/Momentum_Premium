"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsLogger = metricsLogger;
const metrics_1 = require("../utils/metrics");
function metricsLogger(req, res, next) {
    const start = Date.now();
    res.on("finish", () => {
        const latency = Date.now() - start;
        (0, metrics_1.recordLatency)(req.path, latency, req.user?.tenantId);
    });
    next();
}
