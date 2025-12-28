import { db } from "src/services/firebase";
import { Router } from "express";

import { requireAuth } from "../middleware/requireAuth";
import { logger } from "../utils/logger";

export const usersRouter = Router();

usersRouter.post("/users/preferences", requireAuth, async (req, res, next) => {
  try {
    const uid = req.user!.uid;
    const { name, agent, tone } = req.body;
    await db.collection("users").doc(uid).set(
      { preferences: { name, agent, tone } },
      { merge: true }
    );

    logger.info("User preferences updated", { uid, name, agent, tone });
    res.json({ ok: true });
  } catch (error) {
    logger.error("Failed to save user preferences", { error }, req);
    next(error);
  }
});



