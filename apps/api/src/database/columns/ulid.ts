import { varchar } from "drizzle-orm/pg-core";
import { monotonicFactory } from "ulidx";

export const ulid = monotonicFactory();

export function generateUlid(prefix?: string) {
  const prefixValue = !prefix
    ? undefined
    : prefix.length > 9
      ? prefix.slice(0, 9)
      : prefix;

  const id = ulid();

  return !prefixValue ? id : `${prefixValue}_${id}`;
}

/**
 * ulid for database
 */
export const ulidColumn = (name?: string) => {
  if (!name) {
    return varchar({ length: 36 });
  }

  return varchar(name, { length: 36 });
};

/**
 * generate primary key for database
 * noted that the first argument is prefix not column name as most primary key are defined with "id"
 */
export const primaryUlid = (prefix?: string, name?: string) =>
  ulidColumn(!name ? "id" : name)
    .notNull()
    .primaryKey()
    .$defaultFn(() => {
      return generateUlid(prefix);
    });
