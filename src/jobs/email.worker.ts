import nodemailer from "nodemailer";
import { EmailDeliveryStatus } from "@prisma/client";
import { Job, Worker } from "bullmq";
import { env } from "../config/env";
import { renderEmailTemplate } from "../lib/email-templates";
import { emailDeadLetterQueue, EMAIL_QUEUE_NAME, bullMqConnection } from "./email.queue";
import * as emailDeliveryRepository from "../repositories/email-delivery.repository";
import { EmailTemplateName, QueueEmailJob } from "../types/email";

interface EmailWorkerJob extends QueueEmailJob<EmailTemplateName> {
  deliveryId: string;
}

let cachedTransporter: nodemailer.Transporter | null = null;

async function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const testAccount = await nodemailer.createTestAccount();
  cachedTransporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });

  return cachedTransporter;
}

async function processEmailJob(job: Job<EmailWorkerJob>) {
  const transporter = await getTransporter();
  const compiled = renderEmailTemplate(job.data.template, job.data.context as never);

  try {
    const info = await transporter.sendMail({
      from: "no-reply@" + env.nodeEnv + ".multitenant.local",
      to: job.data.recipient,
      subject: compiled.subject,
      text: compiled.text,
      html: compiled.html
    });
    const rawPreviewUrl = nodemailer.getTestMessageUrl(info);
    const previewUrl = typeof rawPreviewUrl === "string" ? rawPreviewUrl : null;

    await emailDeliveryRepository.updateEmailDelivery(job.data.deliveryId, {
      status: EmailDeliveryStatus.SENT,
      attemptCount: job.attemptsMade + 1,
      previewUrl,
      failureReason: null,
      sentAt: new Date(),
      lastAttemptAt: new Date()
    });

    if (previewUrl) {
      console.log("Email preview:", previewUrl);
    }
  } catch (error) {
    const failureReason = error instanceof Error ? error.message : "Unknown email failure";
    const isFinalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);

    await emailDeliveryRepository.updateEmailDelivery(job.data.deliveryId, {
      status: isFinalAttempt ? EmailDeliveryStatus.DEAD_LETTER : EmailDeliveryStatus.FAILED,
      attemptCount: job.attemptsMade + 1,
      previewUrl: null,
      failureReason,
      sentAt: null,
      lastAttemptAt: new Date()
    });

    if (isFinalAttempt) {
      await emailDeadLetterQueue.add("dead-letter-email", {
        tenantId: job.data.tenantId,
        recipient: job.data.recipient,
        template: job.data.template,
        context: job.data.context,
        failureReason
      });
    }

    throw error;
  }
}

export function startEmailWorker() {
  return new Worker<EmailWorkerJob>(EMAIL_QUEUE_NAME, processEmailJob, {
    connection: bullMqConnection
  });
}
