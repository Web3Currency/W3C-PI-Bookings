import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let poolInstance: pg.Pool | null = null;
let dbInstance: any;

if (process.env.DATABASE_URL) {
  try {
    poolInstance = new Pool({ connectionString: process.env.DATABASE_URL });
    dbInstance = drizzle(poolInstance, { schema });
  } catch (err) {
    console.warn("[AI Studio] DATABASE_URL invalid or connection failed:", err);
    dbInstance = new Proxy({}, {
      get: () => async () => [],
    });
  }
} else {
  console.warn("[AI Studio] DATABASE_URL not set — using dummy database connection");
  dbInstance = new Proxy({}, {
    get: () => async () => [],
  });
}

export const pool = poolInstance;
export const db = dbInstance;

export * from "./schema";
