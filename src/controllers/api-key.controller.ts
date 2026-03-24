import { Request, Response } from "express";
import { z } from "zod";
import { ApiError } from "../lib/api-error";
import { asyncHandler } from "../lib/async-handler";
import * as auditService from "../services/audit.service";
import * as apiKeyService from "../services/api-key.service";

const createApiKeySchema = z.object({
  name: z.string().trim().min(1),
  userId: z.string().uuid().optional(),
  expiresAt: z.iso.datetime().optional()
});

const rotateApiKeySchema = z.object({
  name: z.string().trim().min(1).optional(),
  expiresAt: z.iso.datetime().optional()
});

function ensureAuth(req: Request) {
  if (!req.auth) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication is required");
  }

  return req.auth;
}

function readIpAddress(req: Request) {
  return req.ip || "unknown";
}

function serializeApiKey(apiKey: Awaited<ReturnType<typeof apiKeyService.createTenantApiKey>>["apiKey"]) {
  return {
    id: apiKey.id,
    tenantId: apiKey.tenantId,
    userId: apiKey.userId,
    name: apiKey.name,
    keyPrefix: apiKey.keyPrefix,
    lastFour: apiKey.lastFour,
    active: apiKey.active,
    expiresAt: apiKey.expiresAt,
    revokedAt: apiKey.revokedAt,
    graceExpiresAt: apiKey.graceExpiresAt,
    createdAt: apiKey.createdAt
  };
}

export const createApiKey = asyncHandler(async (req: Request, res: Response) => {
  const auth = ensureAuth(req);
  const payload = createApiKeySchema.parse(req.body);
  const result = await apiKeyService.createTenantApiKey(auth, {
    name: payload.name,
    userId: payload.userId,
    expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null
  });
  const apiKeySnapshot = serializeApiKey(result.apiKey);

  await auditService.writeAuditLog({
    auth,
    action: "API_KEY_CREATED",
    resourceType: "api_key",
    resourceId: result.apiKey.id,
    ipAddress: readIpAddress(req),
    previousValue: null,
    newValue: auditService.snapshotResource(apiKeySnapshot)
  });

  res.status(201).json({
    rawKey: result.rawKey,
    apiKey: apiKeySnapshot
  });
});

export const rotateApiKey = asyncHandler(async (req: Request, res: Response) => {
  const auth = ensureAuth(req);
  const payload = rotateApiKeySchema.parse(req.body ?? {});
  const previousApiKey = {
    id: auth.apiKeyId,
    name: auth.apiKeyName,
    keyPrefix: auth.apiKeyPrefix,
    gracePeriodActive: auth.gracePeriodActive
  };
  const result = await apiKeyService.rotateCurrentApiKey(auth, {
    name: payload.name,
    expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null
  });
  const apiKeySnapshot = serializeApiKey(result.apiKey);

  await auditService.writeAuditLog({
    auth,
    action: "API_KEY_ROTATED",
    resourceType: "api_key",
    resourceId: result.apiKey.id,
    ipAddress: readIpAddress(req),
    previousValue: auditService.snapshotResource(previousApiKey),
    newValue: auditService.snapshotResource({
      ...apiKeySnapshot,
      graceExpiresAt: result.graceExpiresAt
    })
  });

  res.status(201).json({
    rawKey: result.rawKey,
    graceExpiresAt: result.graceExpiresAt,
    apiKey: apiKeySnapshot
  });
});
