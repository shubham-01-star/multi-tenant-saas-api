import argon2 from "argon2";
import { randomBytes } from "crypto";

const API_KEY_PREFIX = "mtk";

export interface GeneratedApiKey {
  rawKey: string;
  keyPrefix: string;
  lastFour: string;
}

export function generateApiKey(): GeneratedApiKey {
  const publicPrefix = randomBytes(5).toString("hex");
  const secret = randomBytes(24).toString("base64url");
  const rawKey = API_KEY_PREFIX + "_" + publicPrefix + "_" + secret;

  return {
    rawKey,
    keyPrefix: publicPrefix,
    lastFour: rawKey.slice(-4)
  };
}

export async function hashApiKey(rawKey: string) {
  return argon2.hash(rawKey);
}

export async function verifyApiKeyHash(hash: string, rawKey: string) {
  return argon2.verify(hash, rawKey);
}

export function extractKeyPrefix(rawKey: string) {
  const [scheme, keyPrefix] = rawKey.split("_");

  if (scheme !== API_KEY_PREFIX || !keyPrefix) {
    return null;
  }

  return keyPrefix;
}
