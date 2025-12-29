"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityHeaders = securityHeaders;
const ONE_YEAR = 60 * 60 * 24 * 365;
function securityHeaders(req, res, next) {
    // Força HTTPS em proxies (Firebase/Cloud Run) via HSTS
    res.setHeader("Strict-Transport-Security", `max-age=${ONE_YEAR}; includeSubDomains; preload`);
    // Impede sniffing de MIME
    res.setHeader("X-Content-Type-Options", "nosniff");
    // Protege contra clickjacking
    res.setHeader("X-Frame-Options", "DENY");
    // Desabilita referrer completo
    res.setHeader("Referrer-Policy", "no-referrer");
    // Desabilita FLoC / Topics
    res.setHeader("Permissions-Policy", [
        "accelerometer=()",
        "ambient-light-sensor=()",
        "autoplay=()",
        "battery=()",
        "camera=()",
        "display-capture=()",
        "document-domain=()",
        "encrypted-media=()",
        "fullscreen=()",
        "geolocation=()",
        "gyroscope=()",
        "magnetometer=()",
        "microphone=()",
        "midi=()",
        "payment=()",
        "picture-in-picture=()",
        "publickey-credentials-get=()",
        "screen-wake-lock=()",
        "sync-xhr=()",
        "usb=()",
        "xr-spatial-tracking=()",
    ].join(", "));
    // CSP rígida com exceções para seus domínios/SDKs (ajuste se necessário)
    // OBS: se usar inline scripts no HTML, mantemos 'unsafe-inline' mas restringimos por nonce quando possível.
    const csp = [
        "default-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
        "img-src 'self' data: blob:",
        "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
        // 🔽 Aqui estava us-central1
        "connect-src 'self' https://firebasestorage.googleapis.com https://southamerica-east1-*.cloudfunctions.net https://*.googleapis.com",
        "media-src 'self' blob:",
        "object-src 'none'",
        "worker-src 'self' blob:",
        "frame-src 'self'",
        "manifest-src 'self'",
        "permissions-policy accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), xr-spatial-tracking=()",
    ];
    res.setHeader("Content-Security-Policy", csp.join("; "));
    return next();
}
