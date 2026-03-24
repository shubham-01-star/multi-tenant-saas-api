import { Router } from "express";
import { getCurrentAuthContext } from "../controllers/auth.controller";
import { requireApiKeyAuth } from "../middleware/api-key-auth.middleware";

const router = Router();

router.get("/me", requireApiKeyAuth, getCurrentAuthContext);

export default router;
