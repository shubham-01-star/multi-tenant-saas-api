const DEFAULT_PORT = 3000;

function readRequiredEnv(name: "DATABASE_URL"): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readPort(value: string | undefined): number {
  if (!value) {
    return DEFAULT_PORT;
  }

  const port = Number.parseInt(value, 10);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error("PORT must be a positive integer");
  }

  return port;
}

export const env = {
  nodeEnv: process.env.NODE_ENV?.trim() || "development",
  port: readPort(process.env.PORT),
  databaseUrl: readRequiredEnv("DATABASE_URL"),
  internalApiKey: process.env.INTERNAL_API_KEY?.trim() || null
} as const;
