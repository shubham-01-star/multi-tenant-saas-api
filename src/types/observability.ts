import { RateLimitTier } from "./rate-limit";

export interface RateLimitRequestState {
  breached: boolean;
  tier?: RateLimitTier;
}
