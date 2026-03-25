import { Request, Response } from "express";
import { asyncHandler } from "../lib/async-handler";
import * as healthService from "../services/health.service";
import * as metricsService from "../services/metrics.service";

export const getHealth = asyncHandler(async (_req: Request, res: Response) => {
  const health = await healthService.getSystemHealth();

  res.json(health);
});

export const getMetrics = asyncHandler(async (_req: Request, res: Response) => {
  const metrics = await metricsService.getTenantUsageMetrics();

  res.json({
    tenants: metrics
  });
});
