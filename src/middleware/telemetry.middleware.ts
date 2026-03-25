import { NextFunction, Request, Response } from "express";
import * as telemetryService from "../services/telemetry.service";

function getEndpointLabel(req: Request) {
  if (req.baseUrl && req.route?.path) {
    return req.baseUrl + String(req.route.path);
  }

  return req.originalUrl;
}

export function telemetryMiddleware(req: Request, res: Response, next: NextFunction) {
  res.on("finish", () => {
    const responseTimeMs = Date.now() - req.startedAt;

    void telemetryService.recordResponseTimeSample(responseTimeMs);

    if (!req.auth) {
      return;
    }

    void telemetryService.recordTenantRequestMetric({
      auth: req.auth,
      method: req.method,
      endpoint: getEndpointLabel(req),
      statusCode: res.statusCode,
      responseTimeMs,
      breached: req.rateLimit?.breached || false,
      tier: req.rateLimit?.tier
    });
  });

  next();
}
