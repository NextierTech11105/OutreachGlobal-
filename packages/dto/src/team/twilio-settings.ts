import { z } from "../zod";

export const twilioSettingsSchema = z.object({
  twilioAccountSid: z.nullish(z.string()),
  twilioAuthToken: z.nullish(z.string()),
  twilioApiKey: z.nullish(z.string()),
  twilioApiSecret: z.nullish(z.string()),
  twilioDefaultPhoneNumber: z.nullish(z.string()),
  twiMLAppSid: z.nullish(z.string()),
  twilioEnableVoiceCalls: z.optional(z.boolean()),
  twilioEnableRecordCalls: z.optional(z.boolean()),
  twilioTranscribeVoicemail: z.optional(z.boolean()),
  twilioCallTimeout: z.optional(z.number()),
  twilioDefaultVoiceMessage: z.nullish(z.string()),
  twilioEnableSms: z.optional(z.boolean()),
});

export type TwilioSettings = z.infer<typeof twilioSettingsSchema>;
