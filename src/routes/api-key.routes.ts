import { Router } from "express";
import { createApiKey, rotateApiKey } from "../controllers/api-key.controller";
import { requireApiKeyAuth, requireTenantRole } from "../middleware/api-key-auth.middleware";

const router = Router();

router.use(requireApiKeyAuth);
router.post("/", requireTenantRole(["OWNER"]), createApiKey);
router.post("/rotate", requireTenantRole(["OWNER"]), rotateApiKey);

export default router;
