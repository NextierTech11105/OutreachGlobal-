import { z } from "../zod";

export const createMessageSchema = z.object({
  toName: z.nullish(z.string()),
  toAddress: z.string().nonempty(),
  subject: z.nullish(z.string()),
  body: z.string().nonempty(),
});

export type CreateMessageDto = z.infer<typeof createMessageSchema>;
