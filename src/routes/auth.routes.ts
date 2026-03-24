import { Router } from "express";
import { getCurrentAuthContext } from "../controllers/auth.controller";
import { requireApiKeyAuth } from "../middleware/api-key-auth.middleware";
import { createRateLimitMiddleware } from "../middleware/rate-limit.middleware";

const router = Router();

router.get(
  "/me",
  requireApiKeyAuth,
  createRateLimitMiddleware({ endpointKey: "auth:me", endpointLimit: 600 }),
  getCurrentAuthContext
);

export default router;
