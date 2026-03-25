import prisma from "../config/db";
import { getRedisClient } from "../config/redis";
import { AuthContext } from "../types/auth";
import { RateLimitTier } from "../types/rate-limit";

const RESPONSE_TIMES_KEY = "obs:response-times";
const RESPONSE_TIME_WINDOW_MS = 60 * 1000;

interface RequestMetricInput {
  auth: AuthContext;
  method: string;
  endpoint: string;
  statusCode: number;
  responseTimeMs: number;
  breached: boolean;
  tier?: RateLimitTier;
}

export async function recordResponseTimeSample(responseTimeMs: number) {
  const redis = await getRedisClient();
  const now = Date.now();
  const member = String(now) + ":" + String(responseTimeMs);

  await redis.zadd(RESPONSE_TIMES_KEY, String(now), member);
  await redis.zremrangebyscore(RESPONSE_TIMES_KEY, 0, now - RESPONSE_TIME_WINDOW_MS);
  await redis.pexpire(RESPONSE_TIMES_KEY, RESPONSE_TIME_WINDOW_MS);
}

export async function getAverageResponseTimeLastMinute() {
  const redis = await getRedisClient();
  const now = Date.now();
  const samples = await redis.zrangebyscore(RESPONSE_TIMES_KEY, now - RESPONSE_TIME_WINDOW_MS, now);

  if (samples.length === 0) {
    return 0;
  }

  const total = samples.reduce((sum, sample) => {
    const segments = sample.split(":");
    const responseTime = Number(segments[segments.length - 1] || 0);
    return sum + responseTime;
  }, 0);

  return Math.round(total / samples.length);
}

export async function recordTenantRequestMetric(input: RequestMetricInput) {
  await prisma.requestMetric.create({
    data: {
      tenantId: input.auth.tenantId,
      apiKeyId: input.auth.apiKeyId,
      method: input.method,
      endpoint: input.endpoint,
      statusCode: input.statusCode,
      responseTimeMs: input.responseTimeMs,
      rateLimitBreached: input.breached,
      breachedTier: input.tier || null
    }
  });
}
