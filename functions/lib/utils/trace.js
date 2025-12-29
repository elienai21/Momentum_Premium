"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureTraceId = ensureTraceId;
const crypto_1 = require("crypto");
function ensureTraceId(req) {
    // Aceita header apenas para logging cruzado, mas se vier vazio, gera
    const inbound = (req.headers["x-trace-id"] || "").toString().trim();
    const safe = inbound && inbound.length >= 8 && inbound.length <= 64 ? inbound : (0, crypto_1.randomUUID)();
    req.traceId = safe;
}
