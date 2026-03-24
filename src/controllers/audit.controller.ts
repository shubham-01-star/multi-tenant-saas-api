import { Request, Response } from "express";
import { z } from "zod";
import { ApiError } from "../lib/api-error";
import { asyncHandler } from "../lib/async-handler";
import * as auditService from "../services/audit.service";

const auditQuerySchema = z.object({
  actorUserId: z.string().uuid().optional(),
  action: z.string().trim().min(1).optional(),
  resourceType: z.string().trim().min(1).optional(),
  dateFrom: z.iso.datetime().optional(),
  dateTo: z.iso.datetime().optional(),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25)
});

function ensureAuth(req: Request) {
  if (!req.auth) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication is required");
  }

  return req.auth;
}

export const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const auth = ensureAuth(req);
  const query = auditQuerySchema.parse(req.query);
  const result = await auditService.listAuditLogs({
    auth,
    actorUserId: query.actorUserId,
    action: query.action,
    resourceType: query.resourceType,
    dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
    dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
    cursor: query.cursor,
    limit: query.limit
  });

  res.json(result);
});

export const verifyAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const auth = ensureAuth(req);
  const result = await auditService.verifyAuditChain(auth);

  res.json(result);
});
