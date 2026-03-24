import { UserRole } from "@prisma/client";
import { addMinutes } from "../utils/time";
import { ApiError } from "../lib/api-error";
import { extractKeyPrefix, generateApiKey, hashApiKey, verifyApiKeyHash } from "../lib/api-key";
import * as apiKeyRepository from "../repositories/api-key.repository";
import * as userRepository from "../repositories/user.repository";
import { AuthContext } from "../types/auth";

interface CreateTenantApiKeyInput {
  userId?: string;
  name: string;
  expiresAt?: Date | null;
}

interface RotateTenantApiKeyInput {
  name?: string;
  expiresAt?: Date | null;
}

function mapRole(role: UserRole): AuthContext["role"] {
  return role;
}

function buildAuthContext(apiKeyRecord: Awaited<ReturnType<typeof apiKeyRepository.findApiKeyForAuth>>, gracePeriodActive: boolean): AuthContext {
  if (!apiKeyRecord) {
    throw new ApiError(401, "INVALID_API_KEY", "The API key is invalid");
  }

  return {
    tenantId: apiKeyRecord.tenant.id,
    tenantName: apiKeyRecord.tenant.name,
    tenantSlug: apiKeyRecord.tenant.slug,
    userId: apiKeyRecord.user.id,
    email: apiKeyRecord.user.email,
    role: mapRole(apiKeyRecord.user.role),
    apiKeyId: apiKeyRecord.id,
    apiKeyName: apiKeyRecord.name,
    apiKeyPrefix: apiKeyRecord.keyPrefix,
    gracePeriodActive
  };
}

function getKeyState(apiKey: NonNullable<Awaited<ReturnType<typeof apiKeyRepository.findApiKeyForAuth>>>) {
  const now = Date.now();

  if (apiKey.expiresAt && apiKey.expiresAt.getTime() <= now) {
    return { valid: false, gracePeriodActive: false };
  }

  if (apiKey.active) {
    return { valid: true, gracePeriodActive: false };
  }

  if (apiKey.graceExpiresAt && apiKey.graceExpiresAt.getTime() > now) {
    return { valid: true, gracePeriodActive: true };
  }

  return { valid: false, gracePeriodActive: false };
}

export async function authenticateTenantApiKey(rawKey: string) {
  const keyPrefix = extractKeyPrefix(rawKey);

  if (!keyPrefix) {
    throw new ApiError(401, "INVALID_API_KEY", "The API key is invalid");
  }

  const apiKeyRecord = await apiKeyRepository.findApiKeyForAuth(keyPrefix);

  if (!apiKeyRecord) {
    throw new ApiError(401, "INVALID_API_KEY", "The API key is invalid");
  }

  const hashMatches = await verifyApiKeyHash(apiKeyRecord.hash, rawKey);

  if (!hashMatches) {
    throw new ApiError(401, "INVALID_API_KEY", "The API key is invalid");
  }

  const keyState = getKeyState(apiKeyRecord);

  if (!keyState.valid) {
    throw new ApiError(401, "EXPIRED_API_KEY", "The API key has expired or has been revoked");
  }

  await apiKeyRepository.touchApiKeyLastUsed(apiKeyRecord.id);

  return buildAuthContext(apiKeyRecord, keyState.gracePeriodActive);
}

export async function createTenantApiKey(auth: AuthContext, input: CreateTenantApiKeyInput) {
  const targetUserId = input.userId || auth.userId;
  const targetUser = await userRepository.findUserByTenantAndId(auth.tenantId, targetUserId);

  if (!targetUser) {
    throw new ApiError(404, "USER_NOT_FOUND", "The requested user was not found inside the tenant");
  }

  const generatedKey = generateApiKey();
  const hashedKey = await hashApiKey(generatedKey.rawKey);
  const createdKey = await apiKeyRepository.createApiKey({
    tenantId: auth.tenantId,
    userId: targetUser.id,
    name: input.name,
    keyPrefix: generatedKey.keyPrefix,
    lastFour: generatedKey.lastFour,
    hash: hashedKey,
    expiresAt: input.expiresAt ?? null
  });

  return {
    rawKey: generatedKey.rawKey,
    apiKey: createdKey
  };
}

export async function rotateCurrentApiKey(auth: AuthContext, input: RotateTenantApiKeyInput) {
  const currentApiKey = await apiKeyRepository.findTenantApiKeyById(auth.tenantId, auth.apiKeyId);

  if (!currentApiKey) {
    throw new ApiError(404, "API_KEY_NOT_FOUND", "The current API key could not be found");
  }

  const generatedKey = generateApiKey();
  const hashedKey = await hashApiKey(generatedKey.rawKey);
  const revokedAt = new Date();
  const graceExpiresAt = addMinutes(revokedAt, 15);
  const rotatedKey = await apiKeyRepository.rotateApiKey(
    {
      apiKeyId: currentApiKey.id,
      revokedAt,
      graceExpiresAt
    },
    {
      tenantId: currentApiKey.tenantId,
      userId: currentApiKey.userId,
      name: input.name || currentApiKey.name,
      keyPrefix: generatedKey.keyPrefix,
      lastFour: generatedKey.lastFour,
      hash: hashedKey,
      expiresAt: input.expiresAt ?? currentApiKey.expiresAt,
      rotatedFromId: currentApiKey.id
    }
  );

  return {
    rawKey: generatedKey.rawKey,
    graceExpiresAt,
    apiKey: rotatedKey
  };
}
