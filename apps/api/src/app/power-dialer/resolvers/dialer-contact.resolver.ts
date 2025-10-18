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
  DialerContact,
  DialerContactConnection,
  DialerContactInsert,
} from "../models/dialer-contact.model";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { TeamService } from "@/app/team/services/team.service";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { PowerDialerService } from "../services/power-dialer.service";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { DatabaseService } from "@/database/services/database.service";
import { User } from "@/app/user/models/user.model";
import {
  DialerContactConnectionArgs,
  UpsertDialerContactArgs,
} from "../args/dialer-contact.args";
import { dialerContactsTable } from "@/database/schema-alias";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { getCursorOrder } from "@haorama/drizzle-postgres-extra";
import { UpsertDialerContactsPayload } from "../objects/dialer-contact.object";
import { BadRequestException } from "@nestjs/common";
import { Lead } from "@/app/lead/models/lead.model";
import { Dataloaders } from "@/app/apollo/types/dataloader.type";

@Resolver(() => DialerContact)
@UseAuthGuard()
export class DialerContactResolver extends BaseResolver(DialerContact) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    private powerDialerService: PowerDialerService,
    @InjectDB() private db: DrizzleClient,
    private dbService: DatabaseService,
  ) {
    super();
  }

  @Query(() => DialerContactConnection)
  async dialerContacts(
    @Auth() user: User,
    @Args() args: DialerContactConnectionArgs,
  ) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    const powerDialer = await this.powerDialerService.findOneOrFail({
      teamId: team.id,
      id: args.powerDialerId,
    });

    const query = this.db
      .select()
      .from(dialerContactsTable)
      .where((t) =>
        and(eq(t.powerDialerId, powerDialer.id), ne(t.status, "COMPLETED")),
      )
      .$dynamic();

    return this.dbService.withCursorPagination(query, {
      ...args,
      cursors: (t) => [getCursorOrder(t.id, true)],
    });
  }

  @Mutation(() => UpsertDialerContactsPayload)
  async upsertDialerContact(
    @Auth() user: User,
    @Args() args: UpsertDialerContactArgs,
  ) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    const powerDialer = await this.powerDialerService.findOneOrFail({
      teamId: team.id,
      id: args.powerDialerId,
    });

    const leads = await this.db.query.leads.findMany({
      where: (t) => and(inArray(t.id, args.leadIds), eq(t.teamId, team.id)),
    });

    if (!leads.length) {
      throw new BadRequestException("no leads found");
    }

    const dialerContactValues: DialerContactInsert[] = leads.map(
      (lead, index) => ({
        powerDialerId: powerDialer.id,
        leadId: lead.id,
        position: index + 1,
      }),
    );

    await this.db
      .insert(dialerContactsTable)
      .values(dialerContactValues)
      .onConflictDoUpdate({
        target: [dialerContactsTable.powerDialerId, dialerContactsTable.leadId],
        set: {
          position: sql`excluded.position`,
          status: "PENDING",
        },
      });

    return {
      newLeadsCount: leads.length,
    };
  }

  @ResolveField(() => Lead)
  lead(
    @Parent() dialerContact: DialerContact,
    @Context("loaders") loaders: Dataloaders,
  ) {
    return loaders.lead.load(dialerContact.leadId);
  }
}
