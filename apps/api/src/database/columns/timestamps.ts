import { timestamp } from "drizzle-orm/pg-core";

export const createdAt = timestamp()
  .$defaultFn(() => new Date())
  .notNull();

export const updatedAt = timestamp()
  .$defaultFn(() => new Date())
  .$onUpdateFn(() => {
    return new Date();
  });
