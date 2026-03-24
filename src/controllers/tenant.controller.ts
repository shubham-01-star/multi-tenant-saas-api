import { Request, Response } from "express";
import { ApiError } from "../lib/api-error";
import { asyncHandler } from "../lib/async-handler";
import * as tenantService from "../services/tenant.service";

export const createTenant = asyncHandler(async (req: Request, res: Response) => {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";

  if (name.length === 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "Tenant name is required", {
      field: "name"
    });
  }

  const tenant = await tenantService.createTenant(name);

  res.status(201).json(tenant);
});

export const getTenants = asyncHandler(async (_req: Request, res: Response) => {
  const tenants = await tenantService.getTenants();

  res.json(tenants);
});
