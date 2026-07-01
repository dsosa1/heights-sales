import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  var __heightsSalesSql: ReturnType<typeof postgres> | undefined;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
}

const client =
  global.__heightsSalesSql ??
  postgres(connectionString, { max: process.env.NODE_ENV === "production" ? 5 : 1 });

if (process.env.NODE_ENV !== "production") {
  global.__heightsSalesSql = client;
}

export const db = drizzle(client, { schema });
