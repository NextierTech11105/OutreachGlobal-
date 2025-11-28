import { inArray } from "drizzle-orm";
import { PgColumn } from "drizzle-orm/pg-core";

export function inArrayIfNotEmpty<TColumn extends PgColumn, T = any>(
  column: TColumn,
  value?: T[] | null,
) {
  return !value?.length ? undefined : inArray(column, value);
}
