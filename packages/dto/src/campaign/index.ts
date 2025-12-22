import { z } from "../zod";

// Campaign Types map to AI Worker personalities
// INITIAL = GIANNA (Opener) - First touch, captures email
// RETARGET = CATHY (Nudger) - Re-engage non-responders  
// NURTURE = SABRINA (Closer) - Long-term relationship building, booking
export const campaignTypeEnum = z.enum(["INITIAL", "RETARGET", "NURTURE"]);
export type CampaignType = z.infer<typeof campaignTypeEnum>;

// AI Worker assignments by campaign type
export const CAMPAIGN_TYPE_CONFIG = {
  INITIAL: {
    label: "Initial Outreach",
    description: "First touch SMS to new leads. GIANNA captures emails and builds curiosity.",
    aiWorker: "GIANNA",
    aiWorkerId: "gianna",
    role: "Opener",
    goals: ["Capture email address", "Build rapport", "Position Value X offer"],
    color: "purple",
  },
  RETARGET: {
    label: "Retarget / Nudger",
    description: "Re-engage non-responders with gentle reminders. CATHY keeps it light and persistent.",
    aiWorker: "CATHY",
    aiWorkerId: "cathy",
    role: "Nudger",
    goals: ["Re-engage cold leads", "Soft follow-up", "Surface objections"],
    color: "amber",
  },
  NURTURE: {
    label: "Nurture / Closer",
    description: "Long-term nurture and booking focus. SABRINA closes the deal.",
    aiWorker: "SABRINA",
    aiWorkerId: "sabrina",
    role: "Closer",
    goals: ["Book appointments", "Handle objections", "Close deals"],
    color: "emerald",
  },
} as const;

export const campaignSchema = z
  .object({
    campaignType: campaignTypeEnum.default("INITIAL").meta({
      description: "Campaign type determines AI Worker assignment and messaging style",
    }),
    sdrId: z
      .string({
        error: "AI SDR Avatar is required",
      })
      .nonempty({
        error: "AI SDR Avatar is required",
      }),
    name: z.string().nonempty().max(255),
    description: z.nullish(z.string()),
    minScore: z.number().min(0),
    maxScore: z.number().min(0),
    sequences: z
      .array(
        z.object({
          id: z
            .nullish(z.string())
            .meta({ description: "for updating sequence in update campaign" }),
          name: z.string().nonempty().max(255),
          type: z.enum(["EMAIL", "SMS", "VOICE"]),
          content: z.string().nonempty(),
          position: z.number().min(1),
          subject: z.nullish(z.string()),
          voiceType: z.nullish(z.string()),
          delayDays: z.number().min(0),
          delayHours: z.number().min(0),
        })
      )
      .min(1)
      .max(100),
  })
  .refine((v) => v.minScore <= v.maxScore, {
    message: "minimum score must be less than or equal to maximum score",
    path: ["minScore"],
  });

export type CampaignDto = z.infer<typeof campaignSchema>;
