import { db } from "src/services/firebase";





import { Request, Response, NextFunction, Router } from "express";
// FIX: Add import for type augmentations
import "../types";
import { requireAuth } from "../middleware/requireAuth";
import { z } from "zod";
import { createCard, getCards, updateCard, deleteCard } from "../core/logic/cards";
import { ApiError } from "../utils/errors";
import { withTenant } from "../middleware/withTenant";
import { recordAudit } from "../core/audit";

export const cardsRouter = Router();
cardsRouter.use(requireAuth, withTenant);

const cardSchema = z.object({
    name: z.string().min(2),
    closingDay: z.number().int().min(1).max(31),
    dueDay: z.number().int().min(1).max(31),
});

cardsRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.tenant) throw new ApiError(400, "Tenant context required");
        const tenantId = req.tenant.info.id;
        const data = cardSchema.parse(req.body);
        const card = await createCard(req.user!.uid, tenantId, data);

        await recordAudit(
            "createCard",
            req.user!.email!,
            `Card '${card.name}' created.`,
            { tenantId, traceId: req.traceId, cardId: card.id }
        );

        res.status(201).json({ status: "success", data: card });
    } catch (err) {
        next(err);
    }
});

cardsRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const cards = await getCards(req.user!.uid);
        res.json({ status: "success", data: cards });
    } catch (err) {
        next(err);
    }
});

cardsRouter.put("/:cardId", async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.tenant) throw new ApiError(400, "Tenant context required");
        const tenantId = req.tenant.info.id;
        const { cardId } = req.params;
        const data = cardSchema.parse(req.body);
        await updateCard(req.user!.uid, cardId, data);

        await recordAudit(
            "updateCard",
            req.user!.email!,
            `Card '${data.name}' (ID: ${cardId}) updated.`,
            { tenantId, traceId: req.traceId, cardId: cardId }
        );

        res.json({ status: "success", message: "Card updated" });
    } catch (err) {
        next(err);
    }
});

cardsRouter.delete("/:cardId", async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.tenant) throw new ApiError(400, "Tenant context required");
        const tenantId = req.tenant.info.id;
        const { cardId } = req.params;
        await deleteCard(req.user!.uid, cardId);

        await recordAudit(
            "deleteCard",
            req.user!.email!,
            `Card ID '${cardId}' deleted.`,
            { tenantId, traceId: req.traceId, cardId: cardId }
        );

        res.json({ status: "success", message: "Card deleted" });
    } catch (err) {
        next(err);
    }
});


