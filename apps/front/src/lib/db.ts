import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// Create a mock database implementation for when no connection string is available
const createMockDb = () => {
  console.warn("Using mock database - no connection string provided");

  // Return a mock implementation that won't throw errors
  return {
    execute: async (query: any) => {
      console.log("Mock DB query:", query);
      return [];
    },
    select: () => ({
      from: () => ({
        where: () => ({
          execute: async () => [],
        }),
      }),
    }),
    insert: () => ({
      values: () => ({
        returning: () => ({
          execute: async () => [],
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: () => ({
            execute: async () => [],
          }),
        }),
      }),
    }),
    delete: () => ({
      where: () => ({
        returning: () => ({
          execute: async () => [],
        }),
      }),
    }),
  };
};

// Use a default connection string for development if none is provided
const connectionString = process.env.DATABASE_URL || "";

// Create the database client with proper error handling
let dbClient;
try {
  if (!connectionString) {
    // If no connection string, use mock implementation
    dbClient = createMockDb();
  } else {
    // Otherwise use real Neon client
    const sql = neon(connectionString);
    dbClient = drizzle(sql);
  }
} catch (error) {
  console.error("Failed to initialize database client:", error);
  // Fallback to mock implementation
  dbClient = createMockDb();
}

export const db = dbClient;
