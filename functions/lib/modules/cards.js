"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cardsRouter = void 0;
const express_1 = require("express");
// FIX: Add import for type augmentations
require("../types");
const requireAuth_1 = require("../middleware/requireAuth");
const zod_1 = require("zod");
const cards_1 = require("../core/logic/cards");
const errors_1 = require("../utils/errors");
const withTenant_1 = require("../middleware/withTenant");
const audit_1 = require("../core/audit");
exports.cardsRouter = (0, express_1.Router)();
exports.cardsRouter.use(requireAuth_1.requireAuth, withTenant_1.withTenant);
const cardSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    closingDay: zod_1.z.number().int().min(1).max(31),
    dueDay: zod_1.z.number().int().min(1).max(31),
});
exports.cardsRouter.post("/", async (req, res, next) => {
    try {
        if (!req.tenant)
            throw new errors_1.ApiError(400, "Tenant context required");
        const tenantId = req.tenant.info.id;
        const data = cardSchema.parse(req.body);
        const card = await (0, cards_1.createCard)(req.user.uid, tenantId, data);
        await (0, audit_1.recordAudit)("createCard", req.user.email, `Card '${card.name}' created.`, { tenantId, traceId: req.traceId, cardId: card.id });
        res.status(201).json({ status: "success", data: card });
    }
    catch (err) {
        next(err);
    }
});
exports.cardsRouter.get("/", async (req, res, next) => {
    try {
        const cards = await (0, cards_1.getCards)(req.user.uid);
        res.json({ status: "success", data: cards });
    }
    catch (err) {
        next(err);
    }
});
exports.cardsRouter.put("/:cardId", async (req, res, next) => {
    try {
        if (!req.tenant)
            throw new errors_1.ApiError(400, "Tenant context required");
        const tenantId = req.tenant.info.id;
        const { cardId } = req.params;
        const data = cardSchema.parse(req.body);
        await (0, cards_1.updateCard)(req.user.uid, cardId, data);
        await (0, audit_1.recordAudit)("updateCard", req.user.email, `Card '${data.name}' (ID: ${cardId}) updated.`, { tenantId, traceId: req.traceId, cardId: cardId });
        res.json({ status: "success", message: "Card updated" });
    }
    catch (err) {
        next(err);
    }
});
exports.cardsRouter.delete("/:cardId", async (req, res, next) => {
    try {
        if (!req.tenant)
            throw new errors_1.ApiError(400, "Tenant context required");
        const tenantId = req.tenant.info.id;
        const { cardId } = req.params;
        await (0, cards_1.deleteCard)(req.user.uid, cardId);
        await (0, audit_1.recordAudit)("deleteCard", req.user.email, `Card ID '${cardId}' deleted.`, { tenantId, traceId: req.traceId, cardId: cardId });
        res.json({ status: "success", message: "Card deleted" });
    }
    catch (err) {
        next(err);
    }
});
