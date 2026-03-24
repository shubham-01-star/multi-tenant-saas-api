import { Router } from "express";
import apiKeyRoutes from "./api-key.routes";
import auditRoutes from "./audit.routes";
import authRoutes from "./auth.routes";
import projectRoutes from "./project.routes";
import userRoutes from "./user.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/api-keys", apiKeyRoutes);
router.use("/audit", auditRoutes);
router.use("/projects", projectRoutes);
router.use("/users", userRoutes);

router.get("/", (_req, res) => {
  res.json({
    message: "Multi-tenant SaaS API running"
  });
});

export default router;
