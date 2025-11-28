import { z } from "../zod";

export const aiSdrAvatarSchema = z.object({
  name: z.string().nonempty().max(60),
  description: z.nullish(z.string().max(500)),
  personality: z.string().nonempty(),
  voiceType: z.string().nonempty(),
  avatarUri: z.nullish(z.string()),
  active: z.boolean().default(true),
  industry: z.string().nonempty(),
  mission: z.string().nonempty(),
  goal: z.string().nonempty(),
  roles: z.array(z.string()).nonempty(),
  faqs: z.array(
    z.object({
      question: z.string().nonempty(),
      answer: z.string().nonempty(),
    })
  ),
  tags: z.array(z.string().nonempty()),
});

export type AiSdrAvatarDto = z.infer<typeof aiSdrAvatarSchema>;
