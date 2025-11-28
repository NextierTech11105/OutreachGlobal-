import { preNullish, z } from "../zod";

export const createLeadSchema = z.object({
  firstName: z.optional(z.string().nonempty().max(100)),
  lastName: z.optional(z.string().nonempty().max(100)),
  score: z.optional(z.number().min(0).max(100)),
  email: preNullish(z.email()),
  phone: preNullish(z.string()),
  title: preNullish(z.string()),
  company: preNullish(z.string()),
  zipCode: preNullish(z.string()),
  country: preNullish(z.string()),
  state: preNullish(z.string()),
  city: preNullish(z.string()),
  address: preNullish(z.string()),
  source: preNullish(z.string()),
  notes: preNullish(z.string()),
  status: preNullish(z.string()),
  tags: z.optional(z.array(z.string().max(50))),
});

export type CreateLeadDto = z.infer<typeof createLeadSchema>;
