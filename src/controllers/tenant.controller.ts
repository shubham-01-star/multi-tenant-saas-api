import { Request, Response } from "express";
import * as tenantService from "../services/tenant.service";

export async function createTenant(req: Request, res: Response) {
  const { name } = req.body;

  const tenant = await tenantService.createTenant(name);

  res.json(tenant);
}

export async function getTenants(req: Request, res: Response) {
  const tenants = await tenantService.getTenants();

  res.json(tenants);
}