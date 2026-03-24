import { EmailDeliveryStatus } from "@prisma/client";
import prisma from "../config/db";

interface CreateEmailDeliveryInput {
  tenantId: string;
  recipient: string;
  template: string;
}

interface UpdateEmailDeliveryInput {
  status: EmailDeliveryStatus;
  attemptCount: number;
  previewUrl?: string | null;
  failureReason?: string | null;
  sentAt?: Date | null;
  lastAttemptAt: Date;
}

export async function createEmailDelivery(data: CreateEmailDeliveryInput) {
  return prisma.emailDelivery.create({
    data
  });
}

export async function updateEmailDelivery(deliveryId: string, data: UpdateEmailDeliveryInput) {
  return prisma.emailDelivery.update({
    where: {
      id: deliveryId
    },
    data
  });
}
