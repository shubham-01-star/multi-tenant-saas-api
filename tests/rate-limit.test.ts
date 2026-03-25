import { beforeEach, describe, expect, it, vi } from "vitest";

class FakeRedis {
  private readonly store = new Map<string, Array<{ score: number; member: string }>>();

  clear() {
    this.store.clear();
  }

  async eval(
    _script: string,
    _numKeys: number,
    key: string,
    nowRaw: string,
    windowRaw: string,
    limitRaw: string,
    member: string
  ) {
    const now = Number(nowRaw);
    const windowMs = Number(windowRaw);
    const limit = Number(limitRaw);
    const windowStart = now - windowMs;
    const values = (this.store.get(key) || []).filter((entry) => entry.score > windowStart).sort((left, right) => left.score - right.score);

    this.store.set(key, values);

    if (values.length >= limit) {
      const oldestScore = values[0]?.score ?? now;
      const resetAfterMs = Math.max(0, oldestScore + windowMs - now);
      return [0, values.length, 0, resetAfterMs];
    }

    values.push({ score: now, member });
    values.sort((left, right) => left.score - right.score);
    this.store.set(key, values);

    const oldestScore = values[0]?.score ?? now;
    const resetAfterMs = Math.max(0, oldestScore + windowMs - now);
    const count = values.length;
    const remaining = Math.max(0, limit - count);

    return [1, count, remaining, resetAfterMs];
  }

  async set() {
    return "OK";
  }
}

const fakeRedis = new FakeRedis();

vi.mock("../src/config/redis", () => ({
  getRedisClient: vi.fn(async () => fakeRedis)
}));

vi.mock("../src/services/rate-limit-warning.service", () => ({
  maybeQueueRateLimitWarning: vi.fn(async () => undefined)
}));

import express from "express";
import request from "supertest";
import { createRateLimitMiddleware } from "../src/middleware/rate-limit.middleware";

function buildApp(endpointLimit = 2) {
  const app = express();

  app.get(
    "/limited",
    (req, _res, next) => {
      (req as any).auth = {
        tenantId: "tenant-1",
        tenantName: "Tenant One",
        tenantSlug: "tenant-one",
        userId: "user-1",
        email: "owner@tenant-one.test",
        role: "OWNER",
        apiKeyId: "api-key-1",
        apiKeyName: "Primary Key",
        apiKeyPrefix: "prefix-1",
        gracePeriodActive: false
      };
      next();
    },
    createRateLimitMiddleware({ endpointKey: "limited", endpointLimit }),
    (_req, res) => {
      res.json({ ok: true });
    }
  );

  return app;
}

describe("rate limit middleware", () => {
  beforeEach(() => {
    fakeRedis.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-25T10:00:00.000Z"));
  });

  it("returns a structured 429 response with headers when the endpoint window is exceeded", async () => {
    const app = buildApp(2);

    await request(app).get("/limited").expect(200);
    await request(app).get("/limited").expect(200);
    const response = await request(app).get("/limited").expect(429);

    expect(response.headers["x-ratelimit-limit"]).toBe("2");
    expect(response.headers["x-ratelimit-remaining"]).toBe("0");
    expect(response.headers["x-ratelimit-reset"]).toBe("60");
    expect(response.headers["retry-after"]).toBe("60");
    expect(response.body).toEqual({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Rate limit exceeded",
        details: {
          tier: "ENDPOINT",
          limit: 2,
          currentCount: 2,
          resetAfterSeconds: 60
        }
      }
    });
  });

  it("allows requests again after the sliding boundary and returns the exact reset header", async () => {
    const app = buildApp(2);

    const first = await request(app).get("/limited").expect(200);
    expect(first.headers["x-ratelimit-reset"]).toBe("60");

    vi.advanceTimersByTime(30_000);
    const second = await request(app).get("/limited").expect(200);
    expect(second.headers["x-ratelimit-reset"]).toBe("30");

    vi.advanceTimersByTime(30_001);
    const third = await request(app).get("/limited").expect(200);

    expect(third.headers["x-ratelimit-limit"]).toBe("2");
    expect(third.headers["x-ratelimit-remaining"]).toBe("0");
    expect(third.headers["x-ratelimit-reset"]).toBe("30");
    expect(third.body).toEqual({ ok: true });
  });
});
