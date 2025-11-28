import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { Injectable } from "@nestjs/common";
import {
  teamInvitationsTable,
  teamMembersTable,
} from "@/database/schema-alias";
import { and, eq } from "drizzle-orm";
import { DatabaseService } from "@/database/services/database.service";
import { getCursorOrder } from "@haorama/drizzle-postgres-extra";
import {
  RemoveTeamMemberArgs,
  TeamMemberConnectionArgs,
} from "../args/team-member.args";
import { InviteTeamMemberArgs } from "../args/team-invitation.args";
import { CacheService } from "@/lib/cache/cache.service";
import { addDays } from "date-fns";
import { ConfigService } from "@nestjs/config";
import { encrypt } from "@/common/utils/encryption";
import { TeamInvitationEmail } from "@/emails/pages/team-invitation-email";
import { render } from "@react-email/render";
import { TeamInvitation } from "../models/team-invitation.model";
import { TeamSettingService } from "./team-setting.service";
import { SendgridSettings } from "../objects/sendgrid-settings.object";
import { SendgridService } from "./sendgrid.service";

@Injectable()
export class TeamMemberService {
  constructor(
    @InjectDB() private db: DrizzleClient,
    private dbService: DatabaseService,
    private cacheService: CacheService,
    private configService: ConfigService,
    private settingService: TeamSettingService,
    private sendgridService: SendgridService,
  ) {}

  paginate(options: TeamMemberConnectionArgs) {
    const query = this.db
      .select()
      .from(teamMembersTable)
      .where((t) => and(eq(t.teamId, options.teamId)))
      .$dynamic();

    return this.dbService.withCursorPagination(query, {
      ...options,
      cursors: (t) => [getCursorOrder(t.id, true)],
    });
  }

  async sendInvitation(teamInvitation: TeamInvitation, update = false) {
    const expiresAt = addDays(new Date(), 1);
    const encryption = await encrypt(
      teamInvitation.id,
      this.configService.get("APP_SECRET") as string,
    );

    const key = `team_invitation_${encryption}`;

    await this.cacheService.set(
      key,
      {
        invitationId: teamInvitation.id,
      },
      expiresAt,
    );

    const FRONTEND_URL = this.configService.get("FRONTEND_URL") as string;
    const settings = await this.settingService.getMapped<SendgridSettings>(
      teamInvitation.teamId,
      "sendgrid",
    );
    await this.sendgridService.send({
      apiKey: settings.sendgridApiKey,
      data: {
        to: teamInvitation.email,
        from: settings.sendgridFromEmail || "",
        subject: "You have been invited to join a team",
        html: await render(
          TeamInvitationEmail({
            link: `${FRONTEND_URL}/invitations/${encryption}`,
          }),
        ),
      },
    });

    if (update) {
      const [updatedTeamInvitation] = await this.db
        .update(teamInvitationsTable)
        .set({
          expiresAt,
        })
        .where(eq(teamInvitationsTable.id, teamInvitation.id))
        .returning();
      if (updatedTeamInvitation) {
        return updatedTeamInvitation;
      }
    }

    return teamInvitation;
  }

  async invite(options: InviteTeamMemberArgs & { userId: string }) {
    const existingInvitation = await this.db.query.teamInvitations.findFirst({
      where: (t) =>
        and(eq(t.teamId, options.teamId), eq(t.email, options.input.email)),
    });

    if (existingInvitation) {
      throw new Error(
        "member already invited, you can resend invitation instead",
      );
    }

    const expiresAt = addDays(new Date(), 1);

    const [teamInvitation] = await this.db
      .insert(teamInvitationsTable)
      .values({
        teamId: options.teamId,
        email: options.input.email,
        role: options.input.role,
        invitedBy: options.userId,
        expiresAt,
      })
      .returning();

    await this.sendInvitation(teamInvitation);

    return { teamInvitation };
  }

  async remove(option: RemoveTeamMemberArgs) {
    await this.db
      .delete(teamMembersTable)
      .where(
        and(
          eq(teamMembersTable.id, option.memberId),
          eq(teamMembersTable.teamId, option.teamId),
        ),
      );
  }
}
