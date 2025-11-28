import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../schema";

export type DrizzleClient = NodePgDatabase<typeof schema>;
