import Redis from "ioredis";
import { env } from "./env";

const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 1,
  lazyConnect: true,
  enableOfflineQueue: false
});

let hasConnected = false;

export async function getRedisClient() {
  if (!hasConnected) {
    await redis.connect();
    hasConnected = true;
  }

  return redis;
}

export default redis;
