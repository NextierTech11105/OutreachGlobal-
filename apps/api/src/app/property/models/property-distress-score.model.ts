import { propertyDistressScoresTable } from "@/database/schema-alias";

export type PropertyDistressScoreSelect =
  typeof propertyDistressScoresTable.$inferSelect;
export type PropertyDistressScoreInsert =
  typeof propertyDistressScoresTable.$inferInsert;
