import { BasePolicy } from "@/app/auth/base-policy";
import { UserSelect } from "@/app/user/models/user.model";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { Injectable } from "@nestjs/common";
import { TeamSelect } from "../models/team.model";
import { and, eq } from "drizzle-orm";
import { TeamMemberRole, TeamMemberStatus } from "@nextier/common";

@Injectable()
export class TeamPolicy extends BasePolicy {
  constructor(@InjectDB() private db: DrizzleClient) {
    super();
  }

  private async getMember(user: UserSelect, team: TeamSelect) {
    const member = await this.db.query.teamMembers.findFirst({
      where: (t) =>
        and(
          eq(t.teamId, team.id),
          eq(t.userId, user.id),
          eq(t.status, TeamMemberStatus.APPROVED),
        ),
    });

    return member;
  }

  async read(user: UserSelect, team: TeamSelect) {
    const member = await this.getMember(user, team);
    return this.authorize(member);
  }

  async manage(user: UserSelect, team: TeamSelect) {
    const member = await this.getMember(user, team);
    if (!member) {
      return this.authorize(false);
    }

    return this.authorize(
      member.role === TeamMemberRole.ADMIN ||
        member.role === TeamMemberRole.OWNER,
    );
  }
}
