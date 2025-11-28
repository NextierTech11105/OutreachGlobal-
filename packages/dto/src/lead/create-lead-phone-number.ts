import { z } from "../zod";

export const createLeadPhoneNumberSchema = z.object({
  phone: z
    .string()
    .nonempty()
    .regex(/^\+1\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/),
  label: z.string().nonempty(),
});

export type CreateLeadPhoneNumberDto = z.infer<
  typeof createLeadPhoneNumberSchema
>;
