import { Router } from "express";
import { createProject, deleteProject, getProject, listProjects, updateProject } from "../controllers/project.controller";
import { requireApiKeyAuth, requireTenantRole } from "../middleware/api-key-auth.middleware";

const router = Router();

router.use(requireApiKeyAuth);
router.get("/", requireTenantRole(["OWNER", "MEMBER"]), listProjects);
router.post("/", requireTenantRole(["OWNER", "MEMBER"]), createProject);
router.get("/:projectId", requireTenantRole(["OWNER", "MEMBER"]), getProject);
router.patch("/:projectId", requireTenantRole(["OWNER", "MEMBER"]), updateProject);
router.delete("/:projectId", requireTenantRole(["OWNER"]), deleteProject);

export default router;
