import express from "express";
import { errorMiddleware } from "./middleware/error.middleware";
import { notFoundMiddleware } from "./middleware/not-found.middleware";
import { requestContextMiddleware } from "./middleware/request-context.middleware";
import { telemetryMiddleware } from "./middleware/telemetry.middleware";
import routes from "./routes";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());
  app.use(requestContextMiddleware);
  app.use(telemetryMiddleware);

  app.use("/", routes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
