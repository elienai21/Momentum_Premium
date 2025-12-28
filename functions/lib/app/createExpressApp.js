"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExpressApp = createExpressApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const trace_1 = require("../utils/trace");
function createExpressApp(opts) {
    const mode = opts?.mode || "prod";
    const isTest = mode === "test" || process.env.NODE_ENV === "test";
    const requestDebug = process.env.REQUEST_DEBUG === "true";
    const app = (0, express_1.default)();
    // Debug leve
    app.use((req, _res, next) => {
        (0, trace_1.ensureTraceId)(req);
        const traceId = req.traceId || null;
        const authHeader = req.headers.authorization;
        const xIdToken = req.headers["x-id-token"];
        const tenantHeader = req.headers["x-tenant-id"];
        if (requestDebug && !isTest) {
            // eslint-disable-next-line no-console
            console.log("[REQUEST_DEBUG]", {
                method: req.method,
                url: req.originalUrl,
                hasAuthHeader: !!authHeader,
                hasXIdToken: !!xIdToken,
                tenantHeader: tenantHeader || null,
                traceId,
            });
        }
        next();
    });
    // Básico
    if (!isTest) {
        const allowedOrigins = [
            "https://momentum-premium.web.app",
            "https://momentum-premium.firebaseapp.com",
            "http://localhost:5173",
        ];
        const corsOptions = {
            origin: (origin, callback) => {
                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                }
                else {
                    callback(new Error("Not allowed by CORS"));
                }
            },
            credentials: true,
        };
        app.use((0, cors_1.default)(corsOptions));
        app.options("*", (0, cors_1.default)(corsOptions));
        app.use((0, compression_1.default)());
    }
    // Normaliza content-type/charset antes do body parser
    app.use((req, _res, next) => {
        const ct = req.headers["content-type"];
        if (typeof ct === "string" && !ct.startsWith("multipart/form-data")) {
            const normalized = ct
                .replace(/"/g, "")
                .replace(/charset\s*=\s*utf-8/i, "charset=utf-8")
                .replace(/charset\s*=\s*utf8/i, "charset=utf-8")
                .replace(/charset\s*=\s*UTF-8/i, "charset=utf-8");
            req.headers["content-type"] = normalized;
        }
        next();
    });
    // Parser JSON permissivo (aceita qualquer content-type)
    app.use(express_1.default.json({
        type: () => true,
        limit: "1mb",
    }));
    // Harness de teste: injeta auth/tenant mock se não for real
    if (isTest && process.env.TEST_REAL_AUTH !== "true") {
        app.use((req, _res, next) => {
            if (req.headers["x-test-no-auth"] === "true")
                return next();
            const uid = req.headers["x-test-uid"] || "test-uid";
            const plan = req.headers["x-test-plan"] || "enterprise";
            const tenantId = req.headers["x-test-tenant"] || "test-tenant";
            req.user = { uid, email: `${uid}@example.com` };
            req.tenant = {
                info: { id: tenantId, plan, locale: "pt-BR" },
                flags: {},
            };
            next();
        });
    }
    // Middlewares / rotas
    const { securityHeaders } = require("../middleware/securityHeaders");
    app.use(securityHeaders);
    const pulseRouter = require("../routes/pulse").default;
    const { cfoRouter } = require("../modules/cfo");
    const advisorRouter = require("../routes/advisor").default;
    const { aiRouter } = require("../modules/ai");
    const { insightsRouter } = require("../ai/insights");
    const { voiceRouter } = require("../routes/voice");
    const { billingRouter } = require("../routes/billing");
    const { billingRouter: billingUsageRouter } = require("../modules/billingUsage");
    const { complianceRouter } = require("../modules/compliance");
    const { publicRouter } = require("../modules/public");
    const marketRouter = require("../routes/market").default;
    const { supportRouter } = require("../modules/support");
    const { adminMarketRouter } = require("../modules/adminMarket");
    const { auditRouter } = require("../modules/audit/auditRouter");
    const { importsRouter } = require("../modules/imports");
    const { alertsRouter } = require("../modules/alerts");
    const { dedupRouter } = require("../routes/dedup");
    const realEstateRouter = require("../routes/realEstate").default;
    app.use("/api/pulse", pulseRouter);
    app.use("/api/cfo", cfoRouter);
    app.use("/api/advisor", advisorRouter);
    app.use("/api/ai", aiRouter);
    app.use("/api/ai/insights", insightsRouter);
    app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
    app.use("/api/public", publicRouter);
    const isDevEnv = process.env.FUNCTIONS_EMULATOR === "true" ||
        process.env.NODE_ENV !== "production";
    const isVoiceFeatureForced = process.env.VOICE_FEATURE_ENABLED === "true";
    const isVoiceEnabled = true; // segue config atual
    if (isVoiceEnabled || isDevEnv || isVoiceFeatureForced) {
        app.use("/api/voice", voiceRouter);
    }
    app.use("/api/billing", billingRouter);
    app.use(billingUsageRouter); // já contém /api/billing/usage e /api/billing/report
    app.use("/api/compliance", complianceRouter);
    app.use("/api/market", marketRouter);
    app.use("/api/support", supportRouter);
    app.use("/api/admin", adminMarketRouter);
    app.use("/api/audit", auditRouter);
    app.use("/api/imports", importsRouter);
    app.use("/api/alerts", alertsRouter);
    app.use("/api/dedup", dedupRouter);
    app.use("/api/realestate", realEstateRouter);
    // Alias simples para CFO summary (testes)
    app.get("/api/cfo/summary", (_req, res) => {
        res.json({ status: "ok", summary: {} });
    });
    app.use((req, res) => {
        res.status(404).json({ error: "Not Found", path: req.path, traceId: req.traceId });
    });
    app.use((err, req, res, _next) => {
        if (!isTest) {
            // eslint-disable-next-line no-console
            console.error("Unhandled error in API:", err);
        }
        const status = err.statusCode || err.status || 500;
        res.status(status).json({
            error: err.message || "Internal server error",
            traceId: req.traceId,
        });
    });
    return app;
}
