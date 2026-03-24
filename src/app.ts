import express from "express";
import routes from "./routes";

const app = express();

app.use(express.json());

// register routes
app.use("/", routes);

export default app;