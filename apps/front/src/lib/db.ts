import postgres from "postgres";
import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";

// Use a default connection string for development if none is provided
const connectionString = process.env.DATABASE_URL || "";

// Create the database client with proper error handling
let dbClient: PostgresJsDatabase | null = null;

try {
  if (connectionString) {
    // Use postgres.js driver which works with DigitalOcean managed PostgreSQL
    const sql = postgres(connectionString, {
      ssl: "require",
      max: 10,
      idle_timeout: 20,
      connect_timeout: 30,
    });
    dbClient = drizzle(sql);
  } else {
    console.warn("DATABASE_URL not set - database operations will fail");
  }
} catch (error) {
  console.error("Failed to initialize database client:", error);
}

// Export a typed database instance
export const db = dbClient as PostgresJsDatabase;
