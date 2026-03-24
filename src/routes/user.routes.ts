import { Router } from "express";
import { inviteUser, listUsers } from "../controllers/user.controller";
import { requireApiKeyAuth, requireTenantRole } from "../middleware/api-key-auth.middleware";

const router = Router();

router.use(requireApiKeyAuth);
router.get("/", requireTenantRole(["OWNER"]), listUsers);
router.post("/invite", requireTenantRole(["OWNER"]), inviteUser);

export default router;
