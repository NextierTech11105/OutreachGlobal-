import { z } from "../zod";

export const campaignSchema = z
  .object({
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
