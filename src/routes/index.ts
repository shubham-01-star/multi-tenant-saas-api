import { Router } from "express";
import { getHealth, getMetrics } from "../controllers/internal.controller";
import { requireInternalApiKey } from "../middleware/internal-api-key.middleware";
import apiKeyRoutes from "./api-key.routes";
import auditRoutes from "./audit.routes";
import authRoutes from "./auth.routes";
import internalRoutes from "./internal.routes";
import projectRoutes from "./project.routes";
import userRoutes from "./user.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/api-keys", apiKeyRoutes);
router.use("/audit", auditRoutes);
router.use("/internal", internalRoutes);
router.use("/projects", projectRoutes);
router.use("/users", userRoutes);

router.get("/health", requireInternalApiKey, getHealth);
router.get("/metrics", requireInternalApiKey, getMetrics);

router.get("/", (_req, res) => {
  res.json({
    message: "Multi-tenant SaaS API running"
  });
});

export default router;
