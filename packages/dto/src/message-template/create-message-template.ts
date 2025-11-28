import { z } from "../zod";

export const messageTemplateSchema = z.object({
  name: z.string().min(3).max(60),
});

export const createEmailTemplateSchema = z.object({
  ...messageTemplateSchema.shape,
  data: z.object({
    subject: z.string().nonempty().max(255),
    body: z.string().nonempty(),
  }),
});

export const createSmsTemplateSchema = z.object({
  ...messageTemplateSchema.shape,
  data: z.object({
    text: z.string().nonempty(),
  }),
});

export const createVoiceTemplateSchema = z.object({
  ...messageTemplateSchema.shape,
  data: z.object({
    text: z.string().nonempty(),
  }),
});

export type CreateEmailTemplateDto = z.infer<typeof createEmailTemplateSchema>;
export type CreateSmsTemplateDto = z.infer<typeof createSmsTemplateSchema>;
export type CreateVoiceTemplateDto = z.infer<typeof createVoiceTemplateSchema>;
