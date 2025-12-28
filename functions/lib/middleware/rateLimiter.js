"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = rateLimiter;
/**
 * Placeholder de limitador de requisições — substituível por uma versão avançada.
 */
function rateLimiter(req, res, next) {
    try {
        // Exemplo básico: limitar payloads maiores que 2MB
        const length = Number(req.headers["content-length"] || 0);
        if (length > 2 * 1024 * 1024) {
            return res.status(413).json({ error: "Payload too large" });
        }
        // Aqui futuramente: integração com Redis ou Firestore p/ limitar IP/tenant
        next();
    }
    catch (e) {
        console.error("Rate limiter error:", e);
        next();
    }
}
