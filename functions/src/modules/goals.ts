import { db } from "src/services/firebase";





import { Request, Response, NextFunction, Router } from "express";
// FIX: Add import for type augmentations
import "../types";

import { requireAuth } from "../middleware/requireAuth";
import { withTenant } from "../middleware/withTenant";
import { requireFeature } from "../middleware/requireFeature";
import { z } from "zod";
import { logger } from "../utils/logger";

export const goalsRouter = Router();
goalsRouter.use(requireAuth, withTenant, requireFeature("goals"));

const goalSchema = z.object({
  name: z.string().min(1).max(100),
  targetAmount: z.number().positive(),
  currentAmount: z.number().nonnegative(),
  targetDate: z.string().datetime(),
});

const getCollection = (userId: string) => db.collection(`users/${userId}/goals`);

// Get all goals for the user
goalsRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const snapshot = await getCollection(req.user!.uid).orderBy("targetDate").get();
    const goals = snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() }));
    res.json({ status: "success", data: goals });
  } catch (err) {
    logger.error("Failed to get goals", { traceId: req.traceId, error: err }, req);
    next(err);
  }
});

// Add a new goal
goalsRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = goalSchema.parse(req.body);
    const ref = await getCollection(req.user!.uid).add(data);
    res.status(201).json({ status: "success", data: { id: ref.id, ...data } });
  } catch (err) {
    logger.error("Failed to create goal", { traceId: req.traceId, error: err }, req);
    next(err);
  }
});


