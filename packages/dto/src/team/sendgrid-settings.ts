import { z } from "../zod";

export const sendgridSettingsSchema = z.object({
  sendgridApiKey: z.nullish(z.string()),
  sendgridFromName: z.nullish(z.string()),
  sendgridFromEmail: z.nullish(z.string()),
  sendgridReplyToEmail: z.nullish(z.string()),
  sendgridEventTypes: z.optional(z.array(z.string())),
  sendgridDailyLimit: z.optional(z.number()),
  sendgridBatchSize: z.optional(z.number()),
  sendgridIpPool: z.nullish(z.string()),
  sendgridEmailCategory: z.nullish(z.string()),
  sendgridEnableClickTracking: z.optional(z.boolean()),
  sendgridEnableOpenTracking: z.optional(z.boolean()),
  sendgridEnableSubscriptionTracking: z.optional(z.boolean()),
  sendgridDefaultFooter: z.nullish(z.string()),
});

export type SendgridSettings = z.infer<typeof sendgridSettingsSchema>;
