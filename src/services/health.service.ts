import prisma from "../config/db";
import { getRedisClient } from "../config/redis";
import { emailDeadLetterQueue, emailQueue } from "../jobs/email.queue";
import * as telemetryService from "./telemetry.service";

export async function getSystemHealth() {
  const databaseHealthy = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);
  const redisHealthy = await getRedisClient().then((client) => client.ping()).then((value) => value === "PONG").catch(() => false);
  const emailQueueCounts = await emailQueue.getJobCounts("waiting", "failed");
  const deadLetterCounts = await emailDeadLetterQueue.getJobCounts("waiting", "failed");
  const averageResponseTimeMs = await telemetryService.getAverageResponseTimeLastMinute();

  return {
    status: databaseHealthy && redisHealthy ? "ok" : "degraded",
    database: {
      connected: databaseHealthy
    },
    redis: {
      connected: redisHealthy
    },
    queue: {
      pending: (emailQueueCounts.waiting || 0) + (deadLetterCounts.waiting || 0),
      failed: (emailQueueCounts.failed || 0) + (deadLetterCounts.failed || 0)
    },
    averageResponseTimeMs
  };
}
