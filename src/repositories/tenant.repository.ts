import prisma from "../config/db";

export async function createTenant(name: string) {
  return prisma.tenant.create({
    data: { name }
  });
}

export async function getTenants() {
  return prisma.tenant.findMany();
}