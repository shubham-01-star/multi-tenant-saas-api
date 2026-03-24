import { Router } from "express";

const router = Router();

// health check route
router.get("/", (req, res) => {
  res.json({ message: "API running" });
});

export default router;