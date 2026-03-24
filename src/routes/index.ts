import { Router } from "express";
import tenantRoutes from "./tenant.routes";

const router = Router();

router.use("/tenants", tenantRoutes);

router.get("/", (req, res) => {
  res.json({ message: "API running" });
});

export default router;