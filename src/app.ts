import express from "express";

const app = express();

// middleware
app.use(express.json());

// basic route
app.get("/", (req, res) => {
  res.json({ message: "API running" });
});

export default app;