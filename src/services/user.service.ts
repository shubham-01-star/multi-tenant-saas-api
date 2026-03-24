import { UserRole } from "@prisma/client";
import { ApiError } from "../lib/api-error";
import prisma from "../config/db";
import { AuthContext } from "../types/auth";

interface InviteUserInput {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export async function inviteUser(auth: AuthContext, input: InviteUserInput) {
  try {
    return await prisma.user.create({
      data: {
        tenantId: auth.tenantId,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        status: "INVITED",
        invitedAt: new Date()
      }
    });
  } catch (error) {
    throw new ApiError(409, "USER_ALREADY_EXISTS", "A user with this email already exists for the tenant", {
      cause: error instanceof Error ? error.message : "unknown"
    });
  }
}

export async function listUsers(auth: AuthContext) {
  return prisma.user.findMany({
    where: {
      tenantId: auth.tenantId
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}
