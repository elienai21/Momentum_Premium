import { db } from "src/services/firebase";





import { Request, Response, NextFunction, Router } from "express";
// FIX: Add import for type augmentations
import "../types";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import { withTenant } from "../middleware/withTenant";
import { runAdvisor } from "../ai/advisor";
import { ApiError } from "../utils/errors";


export const chatRouter = Router();

const chatSchema = z.object({
    message: z.string().min(1).max(2000),
});

// Endpoint to send a new message and get a response
chatRouter.post("/session", requireAuth, withTenant, runAdvisor);

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


