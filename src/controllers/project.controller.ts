import { Request, Response } from "express";
import { z } from "zod";
import { ApiError } from "../lib/api-error";
import { asyncHandler } from "../lib/async-handler";
import * as auditService from "../services/audit.service";
import * as projectService from "../services/project.service";

const createProjectSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).optional()
});

const ownerUpdateProjectSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional()
});

const memberUpdateProjectSchema = z.object({
  description: z.string().trim().min(1).optional()
});

function ensureAuth(req: Request) {
  if (!req.auth) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication is required");
  }

  return req.auth;
}

function readProjectId(req: Request) {
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;

  if (!projectId) {
    throw new ApiError(400, "VALIDATION_ERROR", "Project id is required");
  }

  return projectId;
}

function readIpAddress(req: Request) {
  return req.ip || "unknown";
}

export const createProject = asyncHandler(async (req: Request, res: Response) => {
  const auth = ensureAuth(req);
  const payload = createProjectSchema.parse(req.body);
  const project = await projectService.createProject(auth, payload);

  await auditService.writeAuditLog({
    auth,
    action: "PROJECT_CREATED",
    resourceType: "project",
    resourceId: project.id,
    ipAddress: readIpAddress(req),
    previousValue: null,
    newValue: auditService.snapshotResource(project)
  });

  res.status(201).json(project);
});

export const listProjects = asyncHandler(async (req: Request, res: Response) => {
  const auth = ensureAuth(req);
  const projects = await projectService.listProjects(auth);

  res.json(projects);
});

export const getProject = asyncHandler(async (req: Request, res: Response) => {
  const auth = ensureAuth(req);
  const project = await projectService.getProjectById(auth, readProjectId(req));

  res.json(project);
});

export const updateProject = asyncHandler(async (req: Request, res: Response) => {
  const auth = ensureAuth(req);
  const projectId = readProjectId(req);
  const previousProject = await projectService.getProjectById(auth, projectId);
  const payload = auth.role === "OWNER"
    ? ownerUpdateProjectSchema.parse(req.body)
    : memberUpdateProjectSchema.parse(req.body);
  const project = await projectService.updateProject(auth, projectId, payload);

  await auditService.writeAuditLog({
    auth,
    action: "PROJECT_UPDATED",
    resourceType: "project",
    resourceId: project.id,
    ipAddress: readIpAddress(req),
    previousValue: auditService.snapshotResource(previousProject),
    newValue: auditService.snapshotResource(project)
  });

  res.json(project);
});

export const deleteProject = asyncHandler(async (req: Request, res: Response) => {
  const auth = ensureAuth(req);
  const projectId = readProjectId(req);
  const previousProject = await projectService.getProjectById(auth, projectId);
  await projectService.deleteProject(auth, projectId);

  await auditService.writeAuditLog({
    auth,
    action: "PROJECT_DELETED",
    resourceType: "project",
    resourceId: previousProject.id,
    ipAddress: readIpAddress(req),
    previousValue: auditService.snapshotResource(previousProject),
    newValue: null
  });

  res.status(204).send();
});
