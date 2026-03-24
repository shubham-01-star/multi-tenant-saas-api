import { Router } from "express";
import { createProject, deleteProject, getProject, listProjects, updateProject } from "../controllers/project.controller";
import { requireApiKeyAuth, requireTenantRole } from "../middleware/api-key-auth.middleware";
import { createRateLimitMiddleware } from "../middleware/rate-limit.middleware";

const router = Router();

router.use(requireApiKeyAuth);
router.get(
  "/",
  createRateLimitMiddleware({ endpointKey: "projects:list", endpointLimit: 300 }),
  requireTenantRole(["OWNER", "MEMBER"]),
  listProjects
);
router.post(
  "/",
  createRateLimitMiddleware({ endpointKey: "projects:create", endpointLimit: 120 }),
  requireTenantRole(["OWNER", "MEMBER"]),
  createProject
);
router.get(
  "/:projectId",
  createRateLimitMiddleware({ endpointKey: "projects:get", endpointLimit: 400 }),
  requireTenantRole(["OWNER", "MEMBER"]),
  getProject
);
router.patch(
  "/:projectId",
  createRateLimitMiddleware({ endpointKey: "projects:update", endpointLimit: 180 }),
  requireTenantRole(["OWNER", "MEMBER"]),
  updateProject
);
router.delete(
  "/:projectId",
  createRateLimitMiddleware({ endpointKey: "projects:delete", endpointLimit: 60 }),
  requireTenantRole(["OWNER"]),
  deleteProject
);

export default router;
