import { z } from "@nextier/dto";
export const messageEditorSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["EMAIL", "SMS", "VOICE"]),
  content: z.string().nonempty(),
  subject: z.optional(z.string()),
});

export type MessageEditorDto = z.infer<typeof messageEditorSchema>;
