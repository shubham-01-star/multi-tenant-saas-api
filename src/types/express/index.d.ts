import type { AuthContext } from "../auth";

export {};

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startedAt: number;
      auth?: AuthContext;
    }
  }
}
