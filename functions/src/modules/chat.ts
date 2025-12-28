import { db } from "src/services/firebase";





import { Request, Response, NextFunction, Router } from "express";
// FIX: Add import for type augmentations
import "../types";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import { withTenant } from "../middleware/withTenant";
import { processChatMessage } from "../ai/chatAgent";
import { ApiError } from "../utils/errors";


export const chatRouter = Router();

const chatSchema = z.object({
    message: z.string().min(1).max(2000),
});

// Endpoint to send a new message and get a response
chatRouter.post("/session", requireAuth, withTenant, async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.tenant) throw new ApiError(400, "Tenant context is required.");
        
        const { message } = chatSchema.parse(req.body);
        // Pass the full request object for context (locale, traceId)
        const responseText = await processChatMessage(req.user!.uid, req.tenant.info, message, req);
        
        res.json({ status: "success", data: { text: responseText } });
    } catch (error) {
        next(error);
    }
});

// Endpoint to retrieve chat history
chatRouter.get("/history", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const sessionRef = db.collection("chat_sessions").doc(req.user!.uid);
        const sessionSnap = await sessionRef.get();

        if (!sessionSnap.exists) {
            return res.json({ status: "success", data: { history: [] } });
        }

        const history = sessionSnap.data()?.history || [];
        res.json({ status: "success", data: { history } });
    } catch (error) {
        next(error);
    }
});


