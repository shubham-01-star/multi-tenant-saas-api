import { Router } from "express";
import { getHealth, getMetrics } from "../controllers/internal.controller";
import { requireInternalApiKey } from "../middleware/internal-api-key.middleware";

const router = Router();

router.use(requireInternalApiKey);
router.get("/health", getHealth);
router.get("/metrics", getMetrics);

export default router;
