import { z } from "../zod";

export const createWorkflowSchema = z.object({
  name: z.string().nonempty().max(255),
  trigger: z.string().nonempty(),
  description: z.nullish(z.string()),
  active: z.boolean().default(true),
  priority: z.number().min(1).max(10).default(5),
  actions: z.array(
    z.object({
      name: z.string().nonempty(),
      value: z.nullish(z.string()),
    })
  ),
});

export type CreateWorkflowDto = z.infer<typeof createWorkflowSchema>;
