import { teamSettings } from "@/database/schema";

export type TeamSettingSelect = typeof teamSettings.$inferSelect;
export type TeamSettingInsert = typeof teamSettings.$inferInsert;
