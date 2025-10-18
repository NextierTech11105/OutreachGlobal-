import {
  Args,
  Float,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import {
  PowerDialer,
  PowerDialerConnection,
} from "../models/power-dialer.model";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { TeamService } from "@/app/team/services/team.service";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { PowerDialerService } from "../services/power-dialer.service";
import { User } from "@/app/user/models/user.model";
import {
  CreatePowerDialerArgs,
  FindOnePowerDialerArgs,
  PowerDialerConnectionArgs,
} from "../args/power-dialer.args";
import { CreatePowerDialerPayload } from "../objects/power-dialer.object";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { and, eq, or, sum } from "drizzle-orm";
import { callHistoriesTable } from "@/database/schema-alias";

@Resolver(() => PowerDialer)
@UseAuthGuard()
export class PowerDialerResolver extends BaseResolver(PowerDialer) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    private service: PowerDialerService,
    @InjectDB() private db: DrizzleClient,
  ) {
    super();
  }

  @Query(() => PowerDialerConnection)
  async powerDialers(
    @Auth() user: User,
    @Args() args: PowerDialerConnectionArgs,
  ) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.paginate({
      ...args,
      teamId: team.id,
    });
  }

  @Query(() => PowerDialer)
  async powerDialer(@Auth() user: User, @Args() args: FindOnePowerDialerArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.findOneOrFail({
      ...args,
      teamId: team.id,
    });
  }

  @Mutation(() => CreatePowerDialerPayload)
  async createPowerDialer(
    @Auth() user: User,
    @Args() args: CreatePowerDialerArgs,
  ) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.create({
      ...args,
      teamId: team.id,
    });
  }

  @ResolveField(() => Int)
  async totalDuration(@Parent() parent: PowerDialer) {
    const [{ total }] = await this.db
      .select({
        total: sum(callHistoriesTable.duration).mapWith(Number),
      })
      .from(callHistoriesTable)
      .where(eq(callHistoriesTable.powerDialerId, parent.id));

    return total || 0;
  }

  @ResolveField(() => Float)
  async successRate(@Parent() parent: PowerDialer) {
    const total = await this.db.$count(
      callHistoriesTable,
      eq(callHistoriesTable.powerDialerId, parent.id),
    );

    if (!total) {
      return 0;
    }

    const totalSuccess = await this.db.$count(
      callHistoriesTable,
      and(
        eq(callHistoriesTable.powerDialerId, parent.id),
        or(
          eq(callHistoriesTable.disposition, "interested"),
          eq(callHistoriesTable.disposition, "meeting-scheduled"),
        ),
      ),
    );

    return (totalSuccess / total) * 100;
  }
}
