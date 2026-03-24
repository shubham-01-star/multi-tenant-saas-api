export type RateLimitTier = "GLOBAL" | "ENDPOINT" | "BURST";

export interface RateLimitWindowResult {
  key: string;
  limit: number;
  count: number;
  remaining: number;
  resetAfterSeconds: number;
  allowed: boolean;
}

export interface RateLimitDecision {
  allowed: boolean;
  tier: RateLimitTier;
  result: RateLimitWindowResult;
}
