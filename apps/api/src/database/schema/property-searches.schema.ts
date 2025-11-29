import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "../columns/timestamps";
import { primaryUlid, ulidColumn } from "../columns/ulid";

export const propertySearches = pgTable(
  "property_searches",
  {
    id: primaryUlid("psrch"),
    source: varchar().notNull(),
    endpoint: varchar().notNull(),
    filters: jsonb().$type<Record<string, any>>(),
    filterHash: varchar({ length: 64 }).notNull(),
    total: integer().notNull().default(0),
    fetchedCount: integer().notNull().default(0),
    blockKeys: text().array(),
    status: varchar().notNull().default("pending"),
    metadata: jsonb(),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex().on(t.source, t.endpoint, t.filterHash),
    index().on(t.createdAt),
  ],
);

export const propertySearchBlocks = pgTable(
  "property_search_blocks",
  {
    id: primaryUlid("psb"),
    searchId: ulidColumn()
      .references(() => propertySearches.id, { onDelete: "cascade" })
      .notNull(),
    blockIndex: integer().notNull(),
    key: varchar().notNull(),
    recordCount: integer().notNull().default(0),
    checksum: varchar(),
    metadata: jsonb(),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex().on(t.searchId, t.blockIndex),
    index().on(t.searchId),
  ],
);
