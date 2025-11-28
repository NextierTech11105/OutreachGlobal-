import { z } from "@nextier/dto";

export const leadImportSchema = z.object({
  values: z.array(
    z.object({
      teamId: z.string(),
      integrationId: z.string(),
      externalId: z.string(),
      firstName: z.nullish(z.string()).catch(null),
      lastName: z.nullish(z.string()).catch(null),
      email: z.nullish(z.string()).catch(null),
      phone: z.nullish(z.string()).catch(null),
      title: z.nullish(z.string()).catch(null),
      company: z.nullish(z.string()).catch(null),
      zipCode: z.nullish(z.string()).catch(null),
      country: z.nullish(z.string()).catch(null),
      state: z.nullish(z.string()).catch(null),
      city: z.nullish(z.string()).catch(null),
      address: z.nullish(z.string()).catch(null),
      source: z.nullish(z.string()).catch(null),
      notes: z.nullish(z.string()).catch(null),
      status: z.nullish(z.string()).catch(null),
      tags: z.array(z.string()).catch([]),
    }),
  ),
});

export type LeadImportDto = z.infer<typeof leadImportSchema>;
