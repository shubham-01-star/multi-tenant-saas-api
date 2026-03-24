import { ApiError } from "../lib/api-error";
import * as projectRepository from "../repositories/project.repository";
import { AuthContext } from "../types/auth";

interface CreateProjectInput {
  name: string;
  description?: string;
}

interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: "ACTIVE" | "ARCHIVED";
}

export async function createProject(auth: AuthContext, input: CreateProjectInput) {
  return projectRepository.createProject({
    tenantId: auth.tenantId,
    createdById: auth.userId,
    name: input.name,
    description: input.description
  });
}

export async function listProjects(auth: AuthContext) {
  return projectRepository.listProjects({
    tenantId: auth.tenantId
  });
}

export async function getProjectById(auth: AuthContext, projectId: string) {
  const project = await projectRepository.findProjectById({ tenantId: auth.tenantId }, projectId);

  if (!project) {
    throw new ApiError(404, "PROJECT_NOT_FOUND", "The requested project was not found");
  }

  return project;
}

export async function updateProject(auth: AuthContext, projectId: string, input: UpdateProjectInput) {
  if (auth.role === "OWNER") {
    const result = await projectRepository.updateProjectAsOwner({
      tenantId: auth.tenantId,
      projectId,
      name: input.name,
      description: input.description,
      status: input.status
    });

    if (result.count === 0) {
      throw new ApiError(404, "PROJECT_NOT_FOUND", "The requested project was not found");
    }
  } else {
    const result = await projectRepository.updateProjectAsMember({
      tenantId: auth.tenantId,
      projectId,
      createdById: auth.userId,
      description: input.description
    });

    if (result.count === 0) {
      throw new ApiError(404, "PROJECT_NOT_FOUND", "The requested project was not found");
    }
  }

  return getProjectById(auth, projectId);
}

export async function deleteProject(auth: AuthContext, projectId: string) {
  const result = await projectRepository.deleteProject({ tenantId: auth.tenantId }, projectId);

  if (result.count === 0) {
    throw new ApiError(404, "PROJECT_NOT_FOUND", "The requested project was not found");
  }
}
