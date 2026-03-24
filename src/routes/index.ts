import { Router } from "express";
import apiKeyRoutes from "./api-key.routes";
import authRoutes from "./auth.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/api-keys", apiKeyRoutes);

router.get("/", (_req, res) => {
  res.json({
    message: "Multi-tenant SaaS API running"
  });
});

export default router;
