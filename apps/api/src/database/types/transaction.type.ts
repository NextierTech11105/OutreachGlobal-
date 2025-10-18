import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import * as schema from "../schema";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { ExtractTablesWithRelations } from "drizzle-orm";

type DatabaseSchema = typeof schema;
export type PostgresTransaction = PgTransaction<
  NodePgQueryResultHKT,
  DatabaseSchema,
  ExtractTablesWithRelations<DatabaseSchema>
>;

export interface WithSessionOptions {
  session?: PostgresTransaction;
}
