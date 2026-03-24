import { randomUUID } from "crypto";
import { getRedisClient } from "../config/redis";
import { RateLimitWindowResult } from "../types/rate-limit";

interface SlidingWindowInput {
  key: string;
  limit: number;
  windowMs: number;
}

function toSeconds(valueMs: number) {
  return Math.max(1, Math.ceil(valueMs / 1000));
}

export async function consumeSlidingWindow(input: SlidingWindowInput): Promise<RateLimitWindowResult> {
  const redis = await getRedisClient();
  const now = Date.now();
  const windowStart = now - input.windowMs;
  const member = String(now) + ":" + randomUUID();

  await redis.zremrangebyscore(input.key, 0, windowStart);

  const currentCount = await redis.zcard(input.key);

  if (currentCount >= input.limit) {
    const oldestEntry = await redis.zrange(input.key, 0, 0, "WITHSCORES");
    const oldestScore = oldestEntry.length >= 2 ? Number(oldestEntry[1]) : now;
    const resetAfterSeconds = toSeconds(Math.max(0, oldestScore + input.windowMs - now));

    await redis.pexpire(input.key, input.windowMs);

    return {
      key: input.key,
      limit: input.limit,
      count: currentCount,
      remaining: 0,
      resetAfterSeconds,
      allowed: false
    };
  }

  await redis.zadd(input.key, String(now), member);
  await redis.pexpire(input.key, input.windowMs);

  const count = currentCount + 1;

  return {
    key: input.key,
    limit: input.limit,
    count,
    remaining: Math.max(0, input.limit - count),
    resetAfterSeconds: toSeconds(input.windowMs),
    allowed: true
  };
}
