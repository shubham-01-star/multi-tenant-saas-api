import prisma from "../config/db";

export async function findUserByTenantAndId(tenantId: string, userId: string) {
  return prisma.user.findFirst({
    where: {
      id: userId,
      tenantId
    }
  });
}

export async function findUserById(userId: string) {
  return prisma.user.findUnique({
    where: {
      id: userId
    },
    include: {
      tenant: true
    }
  });
}
