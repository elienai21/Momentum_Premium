"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireHttps = requireHttps;
function requireHttps(req, res, next) {
    const proto = (req.headers["x-forwarded-proto"] || "").toString();
    if (proto && proto !== "https") {
        const url = `https://${req.headers.host}${req.originalUrl}`;
        return res.redirect(301, url);
    }
    next();
}
