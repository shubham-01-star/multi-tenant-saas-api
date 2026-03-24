import { Router } from "express";
import { createApiKey, rotateApiKey } from "../controllers/api-key.controller";
import { requireApiKeyAuth, requireTenantRole } from "../middleware/api-key-auth.middleware";
import { createRateLimitMiddleware } from "../middleware/rate-limit.middleware";

const router = Router();

router.use(requireApiKeyAuth);
router.post(
  "/",
  createRateLimitMiddleware({ endpointKey: "api-keys:create", endpointLimit: 30 }),
  requireTenantRole(["OWNER"]),
  createApiKey
);
router.post(
  "/rotate",
  createRateLimitMiddleware({ endpointKey: "api-keys:rotate", endpointLimit: 12 }),
  requireTenantRole(["OWNER"]),
  rotateApiKey
);

export default router;
