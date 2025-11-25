import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/database/schema",
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
    ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? {
      rejectUnauthorized: false,
      checkServerIdentity: () => undefined
    } : false
  },
  out: "./src/database/migrations",
  casing: "snake_case",
});
