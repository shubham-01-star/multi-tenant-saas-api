import { NextFunction, Request, Response } from "express";
import { createErrorResponse } from "../lib/api-error";
import { evaluateRateLimit } from "../services/rate-limit.service";

interface EndpointRateLimitConfig {
  endpointKey: string;
  endpointLimit: number;
}

function applyRateLimitHeaders(res: Response, limit: number, remaining: number, resetAfterSeconds: number) {
  res.setHeader("X-RateLimit-Limit", String(limit));
  res.setHeader("X-RateLimit-Remaining", String(remaining));
  res.setHeader("X-RateLimit-Reset", String(resetAfterSeconds));
}

export function createRateLimitMiddleware(config: EndpointRateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.rateLimit = {
        breached: false
      };

      if (!req.auth) {
        next();
        return;
      }

      const evaluation = await evaluateRateLimit({
        auth: req.auth,
        endpointKey: config.endpointKey,
        endpointLimit: config.endpointLimit
      });

      applyRateLimitHeaders(
        res,
        evaluation.headerWindow.result.limit,
        evaluation.headerWindow.result.remaining,
        evaluation.headerWindow.result.resetAfterSeconds
      );

      if (evaluation.allowed) {
        next();
        return;
      }

      const denied = evaluation.denied;

      if (!denied) {
        next();
        return;
      }

      req.rateLimit = {
        breached: true,
        tier: denied.tier
      };

      res.setHeader("Retry-After", String(denied.result.resetAfterSeconds));
      res.status(429).json(
        createErrorResponse({
          code: "RATE_LIMIT_EXCEEDED",
          message: "Rate limit exceeded",
          details: {
            tier: denied.tier,
            limit: denied.result.limit,
            currentCount: denied.result.count,
            resetAfterSeconds: denied.result.resetAfterSeconds
          }
        })
      );
    } catch (error) {
      next(error);
    }
  };
}
