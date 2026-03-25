import type { AuthContext } from "../auth";
import type { RateLimitRequestState } from "../observability";

export {};

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startedAt: number;
      auth?: AuthContext;
      rateLimit?: RateLimitRequestState;
    }
  }
}
