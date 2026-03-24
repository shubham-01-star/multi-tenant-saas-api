import "dotenv/config";
import { startEmailWorker } from "./jobs/email.worker";

const worker = startEmailWorker();

worker.on("completed", (job) => {
  console.log("Email job completed", job.id);
});

worker.on("failed", (job, error) => {
  console.error("Email job failed", job?.id, error.message);
});
