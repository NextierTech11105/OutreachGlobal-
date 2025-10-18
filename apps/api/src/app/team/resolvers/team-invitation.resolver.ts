import {
  Args,
  Context,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import {
  TeamInvitation,
  TeamInvitationConnection,
} from "../models/team-invitation.model";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { TeamService } from "../services/team.service";
import { TeamPolicy } from "../policies/team.policy";
import { TeamMemberService } from "../services/team-member.service";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import {
  CreateTeamAccountPayload,
  InviteTeamPayload,
  RemoveTeamInvitationPayload,
  ResendTeamInvitationPayload,
} from "../objects/team-invitation.object";
import { User } from "@/app/user/models/user.model";
import {
  CreateTeamAccountArgs,
  InviteTeamMemberArgs,
  RemoveInvitationArgs,
  ResendTeamInvitationArgs,
  TeamInvitationByCodeArgs,
  TeamInvitationConnectionArgs,
} from "../args/team-invitation.args";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { DatabaseService } from "@/database/services/database.service";
import {
  teamInvitationsTable,
  teamMembersTable,
} from "@/database/schema-alias";
import { and, eq } from "drizzle-orm";
import { getCursorOrder, tryRollback } from "@haorama/drizzle-postgres-extra";
import { Dataloaders } from "@/app/apollo/types/dataloader.type";
import { CacheService } from "@/lib/cache/cache.service";
import { createTeamAccountSchema, inviteTeamMemberSchema } from "@nextier/dto";
import { orFail } from "@/database/exceptions";
import { UserService } from "@/app/user/services/user.service";
import { InternalServerErrorException } from "@nestjs/common";
import { hashMake } from "@/common/utils/hash";
import { AuthService } from "@/app/auth/services/auth.service";
import { TeamMemberStatus } from "@nextier/common";

@Resolver(() => TeamInvitation)
export class TeamInvitationResolver extends BaseResolver(TeamInvitation) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    private teamMemberService: TeamMemberService,
    @InjectDB() private db: DrizzleClient,
    private dbService: DatabaseService,
    private cacheService: CacheService,
    private userService: UserService,
    private authService: AuthService,
  ) {
    super();
  }

  @Query(() => TeamInvitationConnection)
  @UseAuthGuard()
  async teamInvitations(
    @Auth() user: User,
    @Args() args: TeamInvitationConnectionArgs,
  ) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    const query = this.db
      .select()
      .from(teamInvitationsTable)
      .where((t) => and(eq(t.teamId, team.id)))
      .$dynamic();

    return this.dbService.withCursorPagination(query, {
      ...args,
      cursors: (t) => [getCursorOrder(t.id, true)],
    });
  }

  @Query(() => TeamInvitation, { nullable: true })
  async teamInvitationByCode(@Args() args: TeamInvitationByCodeArgs) {
    const cache = await this.cacheService.get(`team_invitation_${args.code}`);
    if (!cache) {
      return null;
    }

    const invitation = await this.db.query.teamInvitations.findFirst({
      where: (t) => eq(t.id, cache.invitationId),
    });

    if (!invitation) {
      return null;
    }

    return invitation;
  }

  @Mutation(() => InviteTeamPayload)
  @UseAuthGuard()
  async inviteTeamMember(
    @Auth() user: User,
    @Args() args: InviteTeamMemberArgs,
  ) {
    const input = this.validate(inviteTeamMemberSchema, args.input);
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().manage(user, team);
    return this.teamMemberService.invite({
      input,
      teamId: team.id,
      userId: user.id,
    });
  }

  @Mutation(() => ResendTeamInvitationPayload)
  @UseAuthGuard()
  async resendTeamInvitation(
    @Auth() user: User,
    @Args() args: ResendTeamInvitationArgs,
  ) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().manage(user, team);
    const invitation = await this.db.query.teamInvitations
      .findFirst({
        where: (t) => eq(t.id, args.id),
      })
      .then(orFail("invitation"));
    const updatedTeamInvitation = await this.teamMemberService.sendInvitation(
      invitation,
      true,
    );
    return { teamInvitation: updatedTeamInvitation };
  }

  @Mutation(() => RemoveTeamInvitationPayload)
  @UseAuthGuard()
  async removeTeamInvitation(
    @Auth() user: User,
    @Args() args: RemoveInvitationArgs,
  ) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().manage(user, team);
    await this.db
      .delete(teamInvitationsTable)
      .where(
        and(
          eq(teamInvitationsTable.id, args.id),
          eq(teamInvitationsTable.teamId, team.id),
        ),
      );
    return { removedId: args.id };
  }

  @Mutation(() => CreateTeamAccountPayload)
  async createTeamAccount(@Args() args: CreateTeamAccountArgs) {
    const input = this.validate(createTeamAccountSchema, args.input);
    const cache = await this.cacheService.get(`team_invitation_${args.code}`);
    if (!cache) {
      return null;
    }

    const invitation = await this.db.query.teamInvitations
      .findFirst({
        where: (t) => eq(t.id, cache.invitationId),
      })
      .then(orFail("invitation"));

    const team = await this.teamService.findById(invitation.teamId);

    const result = await this.db.transaction(async (tx) => {
      try {
        const [user] = await this.userService.create(
          {
            email: invitation.email,
            password: await hashMake(input.password),
            name: input.name,
            emailVerifiedAt: new Date(),
          },
          tx,
        );

        await tx.insert(teamMembersTable).values({
          teamId: team.id,
          userId: user.id,
          role: invitation.role,
          status: TeamMemberStatus.APPROVED,
        });

        await tx
          .delete(teamInvitationsTable)
          .where(eq(teamInvitationsTable.id, invitation.id));

        const { token } = await this.authService.accessToken(user, {
          session: tx,
        });

        await this.cacheService.del(`team_invitation_${args.code}`);

        return { team, token };
      } catch (error) {
        tryRollback(tx);
        throw new InternalServerErrorException(error);
      }
    });

    return result;
  }

  @ResolveField(() => User, { nullable: true })
  invitedBy(
    @Parent() invitation: TeamInvitation,
    @Context("loaders") loaders: Dataloaders,
  ) {
    if (invitation.invitedBy) {
      return loaders.user.load(invitation.invitedBy);
    }

    return null;
  }
}
