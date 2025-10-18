import { Args, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import { Property, PropertyConnection } from "../models/property.model";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { TeamService } from "@/app/team/services/team.service";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { DatabaseService } from "@/database/services/database.service";
import { User } from "@/app/user/models/user.model";
import { PropertyConnectionArgs } from "../args/property.args";
import { propertiesTable } from "@/database/schema-alias";
import { getCursorOrder } from "@haorama/drizzle-postgres-extra";

@Resolver(() => Property)
@UseAuthGuard()
export class PropertyResolver extends BaseResolver(Property) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    @InjectDB() private db: DrizzleClient,
    private dbService: DatabaseService,
  ) {
    super();
  }

  @Query(() => PropertyConnection)
  async properties(@Auth() user: User, @Args() args: PropertyConnectionArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    const query = this.db.select().from(propertiesTable).$dynamic();
    return this.dbService.withCursorPagination(query, {
      ...args,
      cursors: (t) => [getCursorOrder(t.id, true)],
    });
  }

  @ResolveField(() => String, { nullable: true })
  ownerName(@Parent() property: Property) {
    if (!property.ownerFirstName || !property.ownerLastName) {
      return null;
    }

    return [property.ownerFirstName, property.ownerLastName]
      .filter(Boolean)
      .join(" ");
  }
}
