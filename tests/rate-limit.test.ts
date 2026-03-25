import { beforeEach, describe, expect, it, vi } from "vitest";
import { consumeSlidingWindow } from "../src/lib/rate-limit";

class FakeRedis {
  private readonly store = new Map<string, Array<{ score: number; member: string }>>();

  async zremrangebyscore(key: string, min: number, max: number) {
    const values = this.store.get(key) || [];
    this.store.set(
      key,
      values.filter((entry) => !(entry.score >= min && entry.score <= max))
    );
  }

  async zcard(key: string) {
    return (this.store.get(key) || []).length;
  }

  async zrange(key: string, start: number, stop: number, withScores?: string) {
    const values = (this.store.get(key) || []).slice().sort((left, right) => left.score - right.score);
    const slice = values.slice(start, stop + 1);

    if (withScores === "WITHSCORES") {
      return slice.flatMap((entry) => [entry.member, String(entry.score)]);
    }

    return slice.map((entry) => entry.member);
  }

  async zadd(key: string, score: string, member: string) {
    const values = this.store.get(key) || [];
    values.push({ score: Number(score), member });
    this.store.set(key, values);
  }

  async pexpire() {
    return 1;
  }
}

const fakeRedis = new FakeRedis();

vi.mock("../src/config/redis", () => ({
  getRedisClient: vi.fn(async () => fakeRedis)
}));

describe("consumeSlidingWindow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-25T10:00:00.000Z"));
  });

  it("blocks the request that crosses the sliding-window limit", async () => {
    const key = "rl:test:block";

    await consumeSlidingWindow({ key, limit: 2, windowMs: 60_000 });
    await consumeSlidingWindow({ key, limit: 2, windowMs: 60_000 });
    const blocked = await consumeSlidingWindow({ key, limit: 2, windowMs: 60_000 });

    expect(blocked.allowed).toBe(false);
    expect(blocked.count).toBe(2);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetAfterSeconds).toBeGreaterThan(0);
  });

  it("allows requests again once the oldest event falls outside the sliding window", async () => {
    const key = "rl:test:boundary";

    await consumeSlidingWindow({ key, limit: 2, windowMs: 5_000 });
    vi.advanceTimersByTime(2_500);
    await consumeSlidingWindow({ key, limit: 2, windowMs: 5_000 });
    vi.advanceTimersByTime(2_600);
    const allowed = await consumeSlidingWindow({ key, limit: 2, windowMs: 5_000 });

    expect(allowed.allowed).toBe(true);
    expect(allowed.count).toBe(2);
    expect(allowed.remaining).toBe(0);
  });
});
