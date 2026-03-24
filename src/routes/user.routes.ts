import { Router } from "express";
import { inviteUser, listUsers } from "../controllers/user.controller";
import { requireApiKeyAuth, requireTenantRole } from "../middleware/api-key-auth.middleware";
import { createRateLimitMiddleware } from "../middleware/rate-limit.middleware";

const router = Router();

router.use(requireApiKeyAuth);
router.get(
  "/",
  createRateLimitMiddleware({ endpointKey: "users:list", endpointLimit: 120 }),
  requireTenantRole(["OWNER"]),
  listUsers
);
router.post(
  "/invite",
  createRateLimitMiddleware({ endpointKey: "users:invite", endpointLimit: 24 }),
  requireTenantRole(["OWNER"]),
  inviteUser
);

export default router;
