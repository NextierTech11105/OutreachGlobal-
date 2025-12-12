import { neon } from "@neondatabase/serverless";
import { drizzle, NeonHttpDatabase } from "drizzle-orm/neon-http";

// Use a default connection string for development if none is provided
const connectionString = process.env.DATABASE_URL || "";

// Create the database client with proper error handling
let dbClient: NeonHttpDatabase | null = null;

try {
  if (connectionString) {
    const sql = neon(connectionString);
    dbClient = drizzle(sql);
  } else {
    console.warn("DATABASE_URL not set - database operations will fail");
  }
} catch (error) {
  console.error("Failed to initialize database client:", error);
}

// Export a typed database instance

export const db = dbClient as any;
