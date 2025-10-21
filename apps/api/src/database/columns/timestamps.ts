import { timestamp } from "drizzle-orm/pg-core";

export const createdAt = timestamp("created_at")
  .$defaultFn(() => new Date())
  .notNull();

export const updatedAt = timestamp("updated_at")
  .$defaultFn(() => new Date())
  .$onUpdateFn(() => {
    return new Date();
  });
