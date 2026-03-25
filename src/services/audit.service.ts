import * as auditRepository from "../repositories/audit.repository";
import { AuthContext } from "../types/auth";
import { stableStringify } from "../lib/stable-json";
import { computeAuditHash } from "../lib/audit-hash";
import { verifyAuditChainEntries } from "../lib/audit-chain";

interface AuditWriteInput {
  auth: AuthContext;
  action: string;
  resourceType: string;
  resourceId: string;
  ipAddress: string;
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
}

interface AuditQueryInput {
  auth: AuthContext;
  actorUserId?: string;
  action?: string;
  resourceType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit: number;
  cursor?: string;
}

function encodeCursor(createdAt: Date, id: string) {
  return Buffer.from(JSON.stringify({ createdAt: createdAt.toISOString(), id }), "utf8").toString("base64url");
}

function decodeCursor(cursor: string) {
  const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
    createdAt: string;
    id: string;
  };

  return {
    createdAt: new Date(parsed.createdAt),
    id: parsed.id
  };
}

export async function writeAuditLog(input: AuditWriteInput) {
  const createdAt = new Date();
  const previousEntry = await auditRepository.getLatestAuditLogForTenant(input.auth.tenantId);
  const previousHash = previousEntry?.chainHash || null;
  const chainHash = computeAuditHash({
    tenantId: input.auth.tenantId,
    actorUserId: input.auth.userId,
    apiKeyId: input.auth.apiKeyId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    ipAddress: input.ipAddress,
    previousValue: input.previousValue ?? null,
    newValue: input.newValue ?? null,
    metadata: input.metadata ?? null,
    previousHash,
    createdAt: createdAt.toISOString()
  });

  return auditRepository.createAuditLog({
    tenantId: input.auth.tenantId,
    actorUserId: input.auth.userId,
    apiKeyId: input.auth.apiKeyId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    ipAddress: input.ipAddress,
    previousValue: input.previousValue,
    newValue: input.newValue,
    metadata: input.metadata,
    previousHash,
    chainHash,
    createdAt
  });
}

export async function listAuditLogs(input: AuditQueryInput) {
  const rows = await auditRepository.listAuditLogs({
    tenantId: input.auth.tenantId,
    actorUserId: input.actorUserId,
    action: input.action,
    resourceType: input.resourceType,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    limit: input.limit + 1,
    cursor: input.cursor ? decodeCursor(input.cursor) : undefined
  });
  const hasMore = rows.length > input.limit;
  const items = hasMore ? rows.slice(0, input.limit) : rows;
  const nextCursor = hasMore ? encodeCursor(items[items.length - 1].createdAt, items[items.length - 1].id) : null;

  return {
    items,
    nextCursor
  };
}

export async function verifyAuditChain(auth: AuthContext) {
  const rows = await auditRepository.listAllAuditLogsForTenant(auth.tenantId);

  return verifyAuditChainEntries(rows);
}

export function snapshotResource(value: unknown) {
  return JSON.parse(stableStringify(value));
}
