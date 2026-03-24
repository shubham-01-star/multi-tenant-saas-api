import { consumeSlidingWindow } from "../lib/rate-limit";
import { maybeQueueRateLimitWarning } from "./rate-limit-warning.service";
import { AuthContext } from "../types/auth";
import { RateLimitDecision, RateLimitTier, RateLimitWindowResult } from "../types/rate-limit";

interface EndpointRateLimitInput {
  auth: AuthContext;
  endpointKey: string;
  endpointLimit: number;
}

const GLOBAL_LIMIT = 1000;
const GLOBAL_WINDOW_MS = 60 * 1000;
const ENDPOINT_WINDOW_MS = 60 * 1000;
const BURST_LIMIT = 50;
const BURST_WINDOW_MS = 5 * 1000;

function buildDecision(tier: RateLimitTier, result: RateLimitWindowResult): RateLimitDecision {
  return {
    allowed: result.allowed,
    tier,
    result
  };
}

function pickHeaderWindow(decisions: RateLimitDecision[]) {
  return decisions.reduce((selected, current) => {
    if (current.result.remaining < selected.result.remaining) {
      return current;
    }

    if (current.result.remaining === selected.result.remaining && current.result.resetAfterSeconds < selected.result.resetAfterSeconds) {
      return current;
    }

    return selected;
  });
}

export async function evaluateRateLimit(input: EndpointRateLimitInput) {
  const globalDecision = buildDecision(
    "GLOBAL",
    await consumeSlidingWindow({
      key: "rl:tenant:global:" + input.auth.tenantId,
      limit: GLOBAL_LIMIT,
      windowMs: GLOBAL_WINDOW_MS
    })
  );

  await maybeQueueRateLimitWarning(input.auth, globalDecision.result.count);

  if (!globalDecision.allowed) {
    return {
      allowed: false,
      denied: globalDecision,
      headerWindow: globalDecision,
      decisions: [globalDecision]
    };
  }

  const endpointDecision = buildDecision(
    "ENDPOINT",
    await consumeSlidingWindow({
      key: "rl:tenant:endpoint:" + input.auth.tenantId + ":" + input.endpointKey,
      limit: input.endpointLimit,
      windowMs: ENDPOINT_WINDOW_MS
    })
  );

  if (!endpointDecision.allowed) {
    return {
      allowed: false,
      denied: endpointDecision,
      headerWindow: pickHeaderWindow([globalDecision, endpointDecision]),
      decisions: [globalDecision, endpointDecision]
    };
  }

  const burstDecision = buildDecision(
    "BURST",
    await consumeSlidingWindow({
      key: "rl:key:burst:" + input.auth.apiKeyId,
      limit: BURST_LIMIT,
      windowMs: BURST_WINDOW_MS
    })
  );

  const decisions = [globalDecision, endpointDecision, burstDecision];

  if (!burstDecision.allowed) {
    return {
      allowed: false,
      denied: burstDecision,
      headerWindow: pickHeaderWindow(decisions),
      decisions
    };
  }

  return {
    allowed: true,
    denied: null,
    headerWindow: pickHeaderWindow(decisions),
    decisions,
    globalDecision
  };
}
