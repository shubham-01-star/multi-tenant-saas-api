import { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { ApiError } from "../lib/api-error";

export function requireInternalApiKey(req: Request, _res: Response, next: NextFunction) {
  if (!env.internalApiKey) {
    next(new ApiError(503, "INTERNAL_KEY_NOT_CONFIGURED", "Internal API key is not configured"));
    return;
  }

  const providedKey = req.header("x-internal-api-key")?.trim();

  if (!providedKey || providedKey !== env.internalApiKey) {
    next(new ApiError(401, "INVALID_INTERNAL_API_KEY", "A valid internal API key is required"));
    return;
  }

  next();
}
