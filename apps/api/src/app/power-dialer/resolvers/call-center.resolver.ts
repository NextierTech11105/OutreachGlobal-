import { Args, Query, Resolver } from "@nestjs/graphql";
import { CallCenterReport } from "../objects/call-center-report.object";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { TeamService } from "@/app/team/services/team.service";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { User } from "@/app/user/models/user.model";
import { CallCenterReportArgs } from "../args/call-center.args";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { and, avg, count, eq, sql } from "drizzle-orm";
import { callHistoriesTable, powerDialersTable } from "@/database/schema-alias";
import { DialerMode } from "@nextier/common";

@Resolver(() => CallCenterReport)
@UseAuthGuard()
export class CallCenterReportResolver extends BaseResolver(CallCenterReport) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    @InjectDB() private db: DrizzleClient,
  ) {
    super();
  }

  @Query(() => CallCenterReport)
  async callCenterReport(
    @Auth() user: User,
    @Args() args: CallCenterReportArgs,
  ) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);

    const [result] = await this.db
      .select({
        totalCalls: count(callHistoriesTable.id),
        successRate: avg(
          sql`CASE WHEN ${callHistoriesTable.disposition} IN ('interested', 'meeting-scheduled') THEN 1 ELSE 0 END`,
        ).mapWith(Number),
        averageCallDuration: avg(callHistoriesTable.duration).mapWith(Number),
        aiSdrCalls: count(
          sql`CASE WHEN ${callHistoriesTable.dialerMode} = ${DialerMode.AI_SDR} THEN 1 END`,
        ).mapWith(Number),
      })
      .from(callHistoriesTable)
      .leftJoin(
        powerDialersTable,
        eq(callHistoriesTable.powerDialerId, powerDialersTable.id),
      )
      .where(and(eq(powerDialersTable.teamId, team.id)));

    return {
      ...result,
      teamId: team.id,
      successRate: result.successRate * 100,
    };
  }
}
