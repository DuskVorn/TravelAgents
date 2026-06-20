import { NextFunction, Request, Response } from "express";
import { getOrCreateUser, UserRecord } from "../lib/userStore";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user: UserRecord;
    }
  }
}

/**
 * Demo-grade identity: reads `x-user-id` from the header, defaulting to a
 * shared "demo-user" so the API is usable immediately with zero setup.
 * Swap this for real session/JWT auth in production — every downstream
 * route only reads `req.user`, so the swap is isolated to this file.
 */
export function identifyUser(req: Request, _res: Response, next: NextFunction): void {
  const userId = (req.header("x-user-id") || "demo-user").trim();
  req.user = getOrCreateUser(userId);
  next();
}
