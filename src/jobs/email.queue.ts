import { Queue } from "bullmq";
import { env } from "../config/env";
import { QueueEmailJob } from "../types/email";

export const EMAIL_QUEUE_NAME = "email";
export const EMAIL_DEAD_LETTER_QUEUE_NAME = "email-dead-letter";

const queueConnection = {
  url: env.redisUrl,
  maxRetriesPerRequest: null as null
};

export const emailQueue = new Queue<QueueEmailJob>(EMAIL_QUEUE_NAME, {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000
    },
    removeOnComplete: 100,
    removeOnFail: 100
  }
});

export const emailDeadLetterQueue = new Queue<QueueEmailJob & { failureReason: string }>(EMAIL_DEAD_LETTER_QUEUE_NAME, {
  connection: queueConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 100
  }
});

export const bullMqConnection = queueConnection;
