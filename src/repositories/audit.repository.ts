import { Prisma } from "@prisma/client";
import prisma from "../config/db";

interface CreateAuditLogInput {
  tenantId: string;
  actorUserId: string | null;
  apiKeyId: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  ipAddress: string;
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
  previousHash: string | null;
  chainHash: string;
  createdAt: Date;
}

interface AuditQueryFilters {
  tenantId: string;
  actorUserId?: string;
  action?: string;
  resourceType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit: number;
  cursor?: {
    createdAt: Date;
    id: string;
  };
}

function buildCursorWhere(cursor: NonNullable<AuditQueryFilters["cursor"]>) {
  return {
    OR: [
      {
        createdAt: {
          lt: cursor.createdAt
        }
      },
      {
        createdAt: cursor.createdAt,
        id: {
          lt: cursor.id
        }
      }
    ]
  };
}

function toJsonValue(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

export async function getLatestAuditLogForTenant(tenantId: string) {
  return prisma.auditLog.findFirst({
    where: {
      tenantId
    },
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" }
    ]
  });
}

export async function createAuditLog(data: CreateAuditLogInput) {
  return prisma.auditLog.create({
    data: {
      ...data,
      previousValue: toJsonValue(data.previousValue),
      newValue: toJsonValue(data.newValue),
      metadata: toJsonValue(data.metadata)
    }
  });
}

export async function listAuditLogs(filters: AuditQueryFilters) {
  return prisma.auditLog.findMany({
    where: {
      tenantId: filters.tenantId,
      actorUserId: filters.actorUserId,
      action: filters.action,
      resourceType: filters.resourceType,
      createdAt:
        filters.dateFrom || filters.dateTo
          ? {
              gte: filters.dateFrom,
              lte: filters.dateTo
            }
          : undefined,
      ...(filters.cursor ? buildCursorWhere(filters.cursor) : {})
    },
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" }
    ],
    take: filters.limit
  });
}

export async function listAllAuditLogsForTenant(tenantId: string) {
  return prisma.auditLog.findMany({
    where: {
      tenantId
    },
    orderBy: [
      { createdAt: "asc" },
      { id: "asc" }
    ]
  });
}
