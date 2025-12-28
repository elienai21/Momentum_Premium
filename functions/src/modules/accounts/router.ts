import { db } from "src/services/firebase";
import { Router } from "express";
import { accountsRouter } from "./index";
import { accountRouter as complianceRouter } from "./compliance";

export const router = Router();

router.use("/", accountsRouter);
router.use("/compliance", complianceRouter);

export default router;


