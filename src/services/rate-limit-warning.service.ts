import { getRedisClient } from "../config/redis";
import * as userRepository from "../repositories/user.repository";
import { enqueueTransactionalEmail } from "./email.service";
import { AuthContext } from "../types/auth";

const WARNING_THRESHOLD_PERCENT = 80;
const WARNING_COOLDOWN_SECONDS = 60 * 60;
const GLOBAL_LIMIT = 1000;

export async function maybeQueueRateLimitWarning(auth: AuthContext, currentCount: number) {
  const usagePercent = Math.floor((currentCount / GLOBAL_LIMIT) * 100);

  if (usagePercent < WARNING_THRESHOLD_PERCENT) {
    return;
  }

  const redis = await getRedisClient();
  const cooldownKey = "rl:tenant:warning:" + auth.tenantId;
  const setResult = await redis.set(cooldownKey, String(Date.now()), "EX", WARNING_COOLDOWN_SECONDS, "NX");

  if (setResult !== "OK") {
    return;
  }

  const owners = await userRepository.findOwnerUsersByTenant(auth.tenantId);

  await Promise.all(
    owners.map((owner) =>
      enqueueTransactionalEmail({
        tenantId: auth.tenantId,
        recipient: owner.email,
        template: "RATE_LIMIT_WARNING",
        context: {
          tenantName: auth.tenantName,
          usagePercent,
          currentCount,
          limit: GLOBAL_LIMIT
        }
      })
    )
  );
}
