import prisma from "../config/db";

interface TenantScope {
  tenantId: string;
}

interface CreateProjectInput extends TenantScope {
  createdById: string;
  name: string;
  description?: string;
}

interface OwnerProjectUpdateInput extends TenantScope {
  projectId: string;
  name?: string;
  description?: string;
  status?: "ACTIVE" | "ARCHIVED";
}

interface MemberProjectUpdateInput extends TenantScope {
  projectId: string;
  createdById: string;
  description?: string;
}

export async function createProject(data: CreateProjectInput) {
  return prisma.project.create({
    data
  });
}

export async function listProjects(scope: TenantScope) {
  return prisma.project.findMany({
    where: {
      tenantId: scope.tenantId
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function findProjectById(scope: TenantScope, projectId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      tenantId: scope.tenantId
    }
  });
}

export async function updateProjectAsOwner(data: OwnerProjectUpdateInput) {
  const { tenantId, projectId, ...projectData } = data;

  return prisma.project.updateMany({
    where: {
      id: projectId,
      tenantId
    },
    data: projectData
  });
}

export async function updateProjectAsMember(data: MemberProjectUpdateInput) {
  const { tenantId, projectId, createdById, description } = data;

  return prisma.project.updateMany({
    where: {
      id: projectId,
      tenantId,
      createdById
    },
    data: {
      description
    }
  });
}

export async function deleteProject(scope: TenantScope, projectId: string) {
  return prisma.project.deleteMany({
    where: {
      id: projectId,
      tenantId: scope.tenantId
    }
  });
}
