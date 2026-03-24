import { NextFunction, Request, Response } from "express";
import { createErrorResponse } from "../lib/api-error";

export function notFoundMiddleware(req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    next();
    return;
  }

  res.status(404).json(
    createErrorResponse({
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.originalUrl} was not found`
    })
  );
}
