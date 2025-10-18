import { TeamMemberRole } from "@nextier/common";
import { z } from "../zod";

export const inviteTeamMemberSchema = z.object({
  email: z.email(),
  role: z.enum(TeamMemberRole),
});

export type InviteTeamMemberDto = z.infer<typeof inviteTeamMemberSchema>;
