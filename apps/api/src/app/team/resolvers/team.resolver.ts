import { Args, Query, Resolver } from "@nestjs/graphql";
import { Team } from "../models/team.model";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { TeamService } from "../services/team.service";
import { User } from "@/app/user/models/user.model";
import { FindOneTeamArgs, TeamReportArgs } from "../args/team.args";
import { TeamPolicy } from "../policies/team.policy";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { TeamReport } from "../objects/team-report.object";
import { leadsTable, propertiesTable } from "@/database/schema-alias";
import { count, eq, sql } from "drizzle-orm";

@Resolver(() => Team)
@UseAuthGuard()
export class TeamResolver extends BaseResolver(Team) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    @InjectDB() private db: DrizzleClient,
  ) {
    super();
  }

  @Query(() => Team)
  async team(@Auth() user: User, @Args() args: FindOneTeamArgs) {
    const team = await this.teamService.findById(args.id);
    await this.teamPolicy.can().read(user, team);
    return team;
  }

  @Query(() => Team, { nullable: true })
  firstTeam(@Auth() user: User) {
    return this.teamService.findByUserId(user.id);
  }

  @Query(() => TeamReport)
  async teamReport(@Auth() user: User, @Args() args: TeamReportArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);

    const propertiesCount = await this.db.$count(propertiesTable);

    const [leadResult] = await this.db
      .select({
        verifiedLeadsCount: count(
          sql`CASE WHEN ${leadsTable.score} > 0 THEN 1 END`,
        ).as("verifiedLeadsCount"),
        highScoreLeadsCount: count(
          sql`CASE WHEN ${leadsTable.score} >= 30 THEN 1 END`,
        ).as("highScoreLeadsCount"),
      })
      .from(leadsTable)
      .where(eq(leadsTable.teamId, team.id));

    return { propertiesCount, ...leadResult };
  }
}
