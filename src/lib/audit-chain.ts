import { computeAuditHash } from "./audit-hash";

interface AuditChainEntry {
  id: string;
  tenantId: string;
  actorUserId: string | null;
  apiKeyId: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  ipAddress: string;
  previousValue: unknown;
  newValue: unknown;
  metadata: unknown;
  previousHash: string | null;
  chainHash: string;
  createdAt: Date;
}

export function verifyAuditChainEntries(entries: AuditChainEntry[]) {
  let previousHash: string | null = null;

  for (const entry of entries) {
    const expectedHash = computeAuditHash({
      tenantId: entry.tenantId,
      actorUserId: entry.actorUserId,
      apiKeyId: entry.apiKeyId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      ipAddress: entry.ipAddress,
      previousValue: entry.previousValue,
      newValue: entry.newValue,
      metadata: entry.metadata,
      previousHash,
      createdAt: entry.createdAt.toISOString()
    });

    if (entry.previousHash !== previousHash || entry.chainHash !== expectedHash) {
      return {
        valid: false,
        brokenEntryId: entry.id,
        expectedHash,
        actualHash: entry.chainHash,
        previousHash,
        storedPreviousHash: entry.previousHash
      };
    }

    previousHash = entry.chainHash;
  }

  return {
    valid: true,
    brokenEntryId: null
  };
}
