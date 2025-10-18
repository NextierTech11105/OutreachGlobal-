import { z } from "../zod";

export const upsertBusinessListSettingsSchema = z.object({
  businessListApiToken: z.nullish(z.string()),
});

export type UpsertBusinessListSettingsDto = z.infer<
  typeof upsertBusinessListSettingsSchema
>;
