import { Request, Response } from "express";
import { z } from "zod";
import { ApiError } from "../lib/api-error";
import { asyncHandler } from "../lib/async-handler";
import * as userService from "../services/user.service";

const inviteUserSchema = z.object({
  email: z.email(),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  role: z.enum(["OWNER", "MEMBER"])
});

function ensureAuth(req: Request) {
  if (!req.auth) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication is required");
  }

  return req.auth;
}

export const inviteUser = asyncHandler(async (req: Request, res: Response) => {
  const auth = ensureAuth(req);
  const payload = inviteUserSchema.parse(req.body);
  const user = await userService.inviteUser(auth, payload);

  res.status(201).json(user);
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const auth = ensureAuth(req);
  const users = await userService.listUsers(auth);

  res.json(users);
});
