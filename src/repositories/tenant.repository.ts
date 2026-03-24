import prisma from "../config/db";

interface CreateTenantInput {
  name: string;
  slug: string;
}

export async function createTenant(data: CreateTenantInput) {
  return prisma.tenant.create({
    data
  });
}

export async function getTenants() {
  return prisma.tenant.findMany({
    orderBy: {
      createdAt: "desc"
    }
  });
}
