import { z } from "../zod";

export const createTeamAccountSchema = z.object({
  name: z.string().nonempty().max(255),
  password: z.string().nonempty().min(8),
});

export type CreateTeamAccountDto = z.infer<typeof createTeamAccountSchema>;
