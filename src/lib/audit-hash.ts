import { createHash } from "crypto";
import { stableStringify } from "./stable-json";

interface AuditHashInput {
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
  createdAt: string;
}

export function computeAuditHash(input: AuditHashInput) {
  return createHash("sha256").update(stableStringify(input)).digest("hex");
}
