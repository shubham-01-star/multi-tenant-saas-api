import { Router } from "express";
import { listAuditLogs, verifyAuditLogs } from "../controllers/audit.controller";
import { requireApiKeyAuth, requireTenantRole } from "../middleware/api-key-auth.middleware";
import { createRateLimitMiddleware } from "../middleware/rate-limit.middleware";

const router = Router();

router.use(requireApiKeyAuth);
router.get(
  "/",
  createRateLimitMiddleware({ endpointKey: "audit:list", endpointLimit: 120 }),
  requireTenantRole(["OWNER"]),
  listAuditLogs
);
router.get(
  "/verify",
  createRateLimitMiddleware({ endpointKey: "audit:verify", endpointLimit: 30 }),
  requireTenantRole(["OWNER"]),
  verifyAuditLogs
);

export default router;
