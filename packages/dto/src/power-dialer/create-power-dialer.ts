import { z } from "../zod";

export const createPowerDialerSchema = z.object({
  title: z.string().nonempty().max(255),
});

export type CreatePowerDialerDto = z.infer<typeof createPowerDialerSchema>;
