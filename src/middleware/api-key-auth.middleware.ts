import { NextFunction, Request, Response } from "express";
import { ApiError } from "../lib/api-error";
import { authenticateTenantApiKey } from "../services/api-key.service";
import { TenantRole } from "../types/auth";

function readApiKeyFromRequest(req: Request) {
  const headerKey = req.header("x-api-key")?.trim();

  if (headerKey) {
    return headerKey;
  }

  const authorizationHeader = req.header("authorization")?.trim();

  if (!authorizationHeader) {
    return null;
  }

  const [scheme, value] = authorizationHeader.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !value) {
    return null;
  }

  return value;
}

export async function requireApiKeyAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const rawKey = readApiKeyFromRequest(req);

    if (!rawKey) {
      throw new ApiError(401, "MISSING_API_KEY", "A tenant API key is required");
    }

    req.auth = await authenticateTenantApiKey(rawKey);
    next();
  } catch (error) {
    next(error);
  }
}

export function requireTenantRole(allowedRoles: TenantRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      next(new ApiError(401, "UNAUTHORIZED", "Authentication is required"));
      return;
    }

    if (!allowedRoles.includes(req.auth.role)) {
      next(new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action"));
      return;
    }

    next();
  };
}
