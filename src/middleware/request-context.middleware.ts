import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction) {
  req.requestId = randomUUID();
  req.startedAt = Date.now();

  const originalEnd = res.end.bind(res);

  res.setHeader("X-Request-Id", req.requestId);

  res.end = ((chunk?: unknown, encoding?: unknown, callback?: unknown) => {
    const durationMs = Date.now() - req.startedAt;
    res.setHeader("X-Response-Time", String(durationMs) + "ms");

    return originalEnd(chunk as never, encoding as never, callback as never);
  }) as Response["end"];

  next();
}
