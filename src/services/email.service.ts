import { emailQueue } from "../jobs/email.queue";
import * as emailDeliveryRepository from "../repositories/email-delivery.repository";
import { EmailTemplateName, QueueEmailJob } from "../types/email";

export async function enqueueTransactionalEmail<TTemplate extends EmailTemplateName>(job: QueueEmailJob<TTemplate>) {
  const delivery = await emailDeliveryRepository.createEmailDelivery({
    tenantId: job.tenantId,
    recipient: job.recipient,
    template: job.template
  });

  await emailQueue.add("send-email", {
    ...job,
    deliveryId: delivery.id
  } as QueueEmailJob<TTemplate> & { deliveryId: string });

  return delivery;
}
