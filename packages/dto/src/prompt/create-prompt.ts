import { PromptCategory, PromptType } from "@nextier/common";
import { z } from "../zod";

export const createPromptSchema = z.object({
  name: z.string().nonempty().max(255),
  type: z.enum(PromptType),
  category: z.enum(PromptCategory),
  description: z.nullish(z.string().max(500)),
  content: z.string().nonempty(),
  tags: z.array(z.string().nonempty()),
});

export type CreatePromptDto = z.infer<typeof createPromptSchema>;
