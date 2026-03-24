import { Request, Response } from "express";
import { ApiError } from "../lib/api-error";

export function getCurrentAuthContext(req: Request, res: Response) {
  if (!req.auth) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication is required");
  }

  res.json({
    tenant: {
      id: req.auth.tenantId,
      name: req.auth.tenantName,
      slug: req.auth.tenantSlug
    },
    user: {
      id: req.auth.userId,
      email: req.auth.email,
      role: req.auth.role
    },
    apiKey: {
      id: req.auth.apiKeyId,
      name: req.auth.apiKeyName,
      prefix: req.auth.apiKeyPrefix,
      gracePeriodActive: req.auth.gracePeriodActive
    }
  });
}
