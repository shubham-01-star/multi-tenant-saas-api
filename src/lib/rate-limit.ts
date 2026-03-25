import { randomUUID } from "crypto";
import { getRedisClient } from "../config/redis";
import { RateLimitWindowResult } from "../types/rate-limit";

interface SlidingWindowInput {
  key: string;
  limit: number;
  windowMs: number;
}

const CONSUME_SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
local windowStart = now - window

redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)

local currentCount = redis.call('ZCARD', key)

if currentCount >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local oldestScore = tonumber(oldest[2]) or now
  local resetAfterMs = math.max(0, oldestScore + window - now)

  redis.call('PEXPIRE', key, window)

  return {0, currentCount, 0, resetAfterMs}
end

redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, window)

local count = currentCount + 1
local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
local oldestScore = tonumber(oldest[2]) or now
local resetAfterMs = math.max(0, oldestScore + window - now)
local remaining = math.max(0, limit - count)

return {1, count, remaining, resetAfterMs}
`;

function toSeconds(valueMs: number) {
  return Math.max(1, Math.ceil(valueMs / 1000));
}

export async function consumeSlidingWindow(input: SlidingWindowInput): Promise<RateLimitWindowResult> {
  const redis = await getRedisClient();
  const now = Date.now();
  const member = String(now) + ":" + randomUUID();
  const result = (await redis.eval(
    CONSUME_SLIDING_WINDOW_SCRIPT,
    1,
    input.key,
    String(now),
    String(input.windowMs),
    String(input.limit),
    member
  )) as [number, number, number, number];

  const allowed = Number(result[0]) === 1;
  const count = Number(result[1]);
  const remaining = Number(result[2]);
  const resetAfterSeconds = toSeconds(Number(result[3]));

  return {
    key: input.key,
    limit: input.limit,
    count,
    remaining,
    resetAfterSeconds,
    allowed
  };
}
