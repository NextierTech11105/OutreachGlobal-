import { z } from "../zod";

export const saveLeadPresetSchema = z.object({
  name: z.string().min(1),
  config: z.object({
    respectTitles: z.boolean(),
    priorityPrefixes: z.array(z.string()).optional(),
    onePerTitle: z.boolean(),
    strategy: z.string(),
    selectedTitles: z.nullish(z.array(z.string())),
    excludedDomains: z.nullish(z.array(z.string())),
    emailsPerDomain: z.number().min(1).max(10),
  }),
});

export type SaveLeadPresetDto = z.infer<typeof saveLeadPresetSchema>;
