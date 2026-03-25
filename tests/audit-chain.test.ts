import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { verifyAuditLogs } from "../src/controllers/audit.controller";
import { computeAuditHash } from "../src/lib/audit-hash";

let auditRows: Array<Record<string, unknown>> = [];

vi.mock("../src/repositories/audit.repository", () => ({
  listAllAuditLogsForTenant: vi.fn(async () => auditRows)
}));

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

function buildApp() {
  const app = express();

  app.get("/audit/verify", (req, _res, next) => {
    (req as any).auth = {
      tenantId: "tenant-1",
      tenantName: "Tenant One",
      tenantSlug: "tenant-one",
      userId: "user-1",
      email: "owner@tenant-one.test",
      role: "OWNER",
      apiKeyId: "api-key-1",
      apiKeyName: "Primary Key",
      apiKeyPrefix: "prefix-1",
      gracePeriodActive: false
    };
    next();
  }, verifyAuditLogs);

  return app;
}

describe("GET /audit/verify", () => {
  it("returns a valid response for an intact chain", async () => {
    const first = buildEntry(1, null);
    const second = buildEntry(2, first.chainHash);
    const third = buildEntry(3, second.chainHash);
    auditRows = [first, second, third];

    const response = await request(buildApp()).get("/audit/verify").expect(200);

    expect(response.body).toEqual({
      valid: true,
      brokenEntryId: null
    });
  });

  it("returns the broken entry id when a chain has been tampered with", async () => {
    const first = buildEntry(1, null);
    const second = buildEntry(2, first.chainHash);
    const third = buildEntry(3, second.chainHash);
    third.newValue = { version: 999 };
    auditRows = [first, second, third];

    const response = await request(buildApp()).get("/audit/verify").expect(200);

    expect(response.body.valid).toBe(false);
    expect(response.body.brokenEntryId).toBe("audit-3");
    expect(response.body.expectedHash).toBeTypeOf("string");
    expect(response.body.actualHash).toBeTypeOf("string");
  });
});
