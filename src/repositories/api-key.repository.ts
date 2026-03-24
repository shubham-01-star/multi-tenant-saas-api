import { Prisma } from "@prisma/client";
import prisma from "../config/db";

interface CreateApiKeyInput {
  tenantId: string;
  userId: string;
  name: string;
  keyPrefix: string;
  lastFour: string;
  hash: string;
  expiresAt?: Date | null;
  rotatedFromId?: string;
}

interface RotateApiKeyInput {
  apiKeyId: string;
  revokedAt: Date;
  graceExpiresAt: Date;
}

export async function findApiKeyForAuth(keyPrefix: string) {
  return prisma.apiKey.findUnique({
    where: {
      keyPrefix
    },
    include: {
      tenant: true,
      user: true
    }
  });
}

export async function findTenantApiKeyById(tenantId: string, apiKeyId: string) {
  return prisma.apiKey.findFirst({
    where: {
      id: apiKeyId,
      tenantId
    },
    include: {
      tenant: true,
      user: true
    }
  });
}

export async function createApiKey(data: CreateApiKeyInput) {
  return prisma.apiKey.create({
    data,
    include: {
      tenant: true,
      user: true
    }
  });
}

export async function rotateApiKey(oldKey: RotateApiKeyInput, newKey: CreateApiKeyInput) {
  return prisma.$transaction(async (tx) => {
    await tx.apiKey.update({
      where: {
        id: oldKey.apiKeyId
      },
      data: {
        active: false,
        revokedAt: oldKey.revokedAt,
        graceExpiresAt: oldKey.graceExpiresAt
      }
    });

    return tx.apiKey.create({
      data: newKey,
      include: {
        tenant: true,
        user: true
      }
    });
  });
}

export async function touchApiKeyLastUsed(apiKeyId: string, prismaClient: Prisma.TransactionClient | typeof prisma = prisma) {
  return prismaClient.apiKey.update({
    where: {
      id: apiKeyId
    },
    data: {
      lastUsedAt: new Date()
    }
  });
}
