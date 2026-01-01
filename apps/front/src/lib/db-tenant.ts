/**
 * Tenant-Aware Database Client
 *
 * This module provides Row Level Security (RLS) support by setting
 * the tenant context before executing queries.
 *
 * IMPORTANT: Uses reserved connections to avoid cross-request contamination
 * in connection pools.
 *
 * Usage in API routes:
 *   import { withTenant } from "@/lib/db-tenant";
 *
 *   export async function GET(request, { params }) {
 *     const { team: teamId } = await params;
 *     return await withTenant(teamId, async (db) => {
 *       const leads = await db.query.leads.findMany();
 *       return NextResponse.json(leads);
 *     });
 *   }
 */

import postgres from "postgres";
import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./db/schema";

const connectionString = process.env.DATABASE_URL || "";

// Create a base SQL client for raw queries
const sql = connectionString
  ? postgres(connectionString, {
      ssl: "require",
      max: 20,
      idle_timeout: 20,
      connect_timeout: 30,
    })
  : null;

/**
 * Execute queries with tenant context using a reserved connection.
 * This is the RECOMMENDED way to use tenant-scoped queries.
 *
 * Uses a dedicated connection from the pool to avoid cross-request
 * contamination of the session variable.
 *
 * @example
 * const result = await withTenant(teamId, async (db) => {
 *   return await db.query.leads.findMany();
 * });
 */
export async function withTenant<T>(
  teamId: string,
  queryFn: (db: PostgresJsDatabase<typeof schema>) => Promise<T>,
): Promise<T> {
  if (!sql) {
    throw new Error("Database not configured - DATABASE_URL not set");
  }

  if (!teamId) {
    throw new Error("Team ID is required for tenant-scoped queries");
  }

  // Reserve a dedicated connection from the pool
  const reserved = await sql.reserve();

  try {
    // Set the tenant context on this dedicated connection
    await reserved`SET app.team_id = ${teamId}`;

    // Create a drizzle instance bound to this connection
    const db = drizzle(reserved, { schema });

    // Execute the query function
    return await queryFn(db);
  } finally {
    // Reset tenant context before returning connection to pool
    await reserved`RESET app.team_id`.catch(() => {});
    // Release the connection back to the pool
    reserved.release();
  }
}

/**
 * Transaction with tenant context.
 * All queries within the transaction will be scoped to the tenant.
 * Uses SET LOCAL which is automatically reset when transaction ends.
 *
 * @example
 * await withTenantTransaction(teamId, async (db) => {
 *   await db.insert(leads).values({ ... });
 *   await db.insert(leadActivities).values({ ... });
 * });
 */
export async function withTenantTransaction<T>(
  teamId: string,
  transactionFn: (tx: PostgresJsDatabase<typeof schema>) => Promise<T>,
): Promise<T> {
  if (!sql) {
    throw new Error("Database not configured - DATABASE_URL not set");
  }

  if (!teamId) {
    throw new Error("Team ID is required for tenant-scoped transactions");
  }

  // Use postgres.js transaction with SET LOCAL (auto-reset on commit/rollback)
  return await sql.begin(async (txSql) => {
    // SET LOCAL only affects this transaction
    await txSql`SET LOCAL app.team_id = ${teamId}`;

    // Create drizzle instance for this transaction
    const txDb = drizzle(txSql, { schema });

    return await transactionFn(txDb);
  });
}

/**
 * Service account bypass - for admin operations that need cross-tenant access.
 * USE WITH EXTREME CAUTION - only for super admin operations.
 *
 * @example
 * // Only use for legitimate admin operations
 * const allTeamsData = await withServiceAccount(async (db) => {
 *   return await db.query.teams.findMany();
 * });
 */
export async function withServiceAccount<T>(
  queryFn: (db: PostgresJsDatabase<typeof schema>) => Promise<T>,
): Promise<T> {
  if (!sql) {
    throw new Error("Database not configured - DATABASE_URL not set");
  }

  // Reserve a dedicated connection
  const reserved = await sql.reserve();

  try {
    // Clear tenant context to allow cross-tenant queries
    // RLS policies will use empty string which won't match any team_id
    // For true bypass, the database role needs BYPASSRLS privilege
    await reserved`SET app.team_id = ''`;

    const db = drizzle(reserved, { schema });

    return await queryFn(db);
  } finally {
    await reserved`RESET app.team_id`.catch(() => {});
    reserved.release();
  }
}

/**
 * Execute raw SQL with tenant context.
 * For advanced use cases where you need raw SQL.
 */
export async function withTenantSQL<T extends postgres.Row[]>(
  teamId: string,
  query: postgres.TemplateStringsArray,
  ...params: postgres.ParameterOrJSON<never>[]
): Promise<T> {
  if (!sql) {
    throw new Error("Database not configured - DATABASE_URL not set");
  }

  const reserved = await sql.reserve();

  try {
    await reserved`SET app.team_id = ${teamId}`;
    const result = await reserved(query, ...params);
    return result as T;
  } finally {
    await reserved`RESET app.team_id`.catch(() => {});
    reserved.release();
  }
}

// Export the raw sql client for advanced use cases (use carefully!)
export { sql };

// Re-export schema for convenience
export { schema };
