import { Prisma } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { ApiError, createErrorResponse } from "../lib/api-error";

export function errorMiddleware(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (res.headersSent) {
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.statusCode).json(
      createErrorResponse({
        code: error.code,
        message: error.message,
        details: error.details
      })
    );
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    res.status(400).json(
      createErrorResponse({
        code: "DATABASE_ERROR",
        message: "Database request failed",
        details: {
          requestId: req.requestId,
          prismaCode: error.code
        }
      })
    );
    return;
  }

  const message = error instanceof Error ? error.message : "Unexpected server error";

  res.status(500).json(
    createErrorResponse({
      code: "INTERNAL_SERVER_ERROR",
      message,
      details: {
        requestId: req.requestId
      }
    })
  );
}
