import { describe, expect, it } from "vitest";
import { computeAuditHash } from "../src/lib/audit-hash";
import { verifyAuditChainEntries } from "../src/lib/audit-chain";

function buildEntry(index: number, previousHash: string | null) {
  const createdAt = new Date("2026-03-25T10:00:00.000Z");
  createdAt.setMinutes(createdAt.getMinutes() + index);
  const chainHash = computeAuditHash({
    tenantId: "tenant-1",
    actorUserId: "user-1",
    apiKeyId: "key-1",
    action: "UPDATED",
    resourceType: "project",
    resourceId: "project-" + index,
    ipAddress: "127.0.0.1",
    previousValue: { version: index },
    newValue: { version: index + 1 },
    metadata: { index },
    previousHash,
    createdAt: createdAt.toISOString()
  });

  return {
    id: "audit-" + index,
    tenantId: "tenant-1",
    actorUserId: "user-1",
    apiKeyId: "key-1",
    action: "UPDATED",
    resourceType: "project",
    resourceId: "project-" + index,
    ipAddress: "127.0.0.1",
    previousValue: { version: index },
    newValue: { version: index + 1 },
    metadata: { index },
    previousHash,
    chainHash,
    createdAt
  };
}

describe("verifyAuditChainEntries", () => {
  it("accepts an intact audit chain", () => {
    const first = buildEntry(1, null);
    const second = buildEntry(2, first.chainHash);
    const third = buildEntry(3, second.chainHash);

    const result = verifyAuditChainEntries([first, second, third]);

    expect(result.valid).toBe(true);
    expect(result.brokenEntryId).toBeNull();
  });

  it("detects tampering and reports the broken entry id", () => {
    const first = buildEntry(1, null);
    const second = buildEntry(2, first.chainHash);
    const third = buildEntry(3, second.chainHash);
    third.newValue = { version: 999 };

    const result = verifyAuditChainEntries([first, second, third]);

    expect(result.valid).toBe(false);
    expect(result.brokenEntryId).toBe("audit-3");
  });
});
