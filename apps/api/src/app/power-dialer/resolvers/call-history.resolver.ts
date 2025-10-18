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
  CallHistory,
  CallHistoryConnection,
  CallHistoryInsert,
} from "../models/call-history.model";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { TeamService } from "@/app/team/services/team.service";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { PowerDialerService } from "../services/power-dialer.service";
import { User } from "@/app/user/models/user.model";
import {
  CallHistoryConnectionArgs,
  CreateCallHistoryArgs,
} from "../args/call-history.args";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { DatabaseService } from "@/database/services/database.service";
import {
  callHistoriesTable,
  dialerContactsTable,
  powerDialersTable,
} from "@/database/schema-alias";
import { and, eq, getTableColumns, SQLWrapper } from "drizzle-orm";
import { getCursorOrder } from "@haorama/drizzle-postgres-extra";
import { DialerContact } from "../models/dialer-contact.model";
import { Dataloaders } from "@/app/apollo/types/dataloader.type";
import { CreateCallHistoryPayload } from "../objects/call-history.object";
import { orFail } from "@/database/exceptions";
import { DialerMode } from "@nextier/common";
import { BadRequestException } from "@nestjs/common";

@Resolver(() => CallHistory)
@UseAuthGuard()
export class CallHistoryResolver extends BaseResolver(CallHistory) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    private powerDialerService: PowerDialerService,
    @InjectDB() private db: DrizzleClient,
    private dbService: DatabaseService,
  ) {
    super();
  }

  @Query(() => CallHistoryConnection)
  async callHistories(
    @Auth() user: User,
    @Args() args: CallHistoryConnectionArgs,
  ) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    const wrappers: SQLWrapper[] = [];

    const query = this.db
      .select({
        ...getTableColumns(callHistoriesTable),
      })
      .from(callHistoriesTable)
      .$dynamic();

    if (args.powerDialerId) {
      const powerDialer = await this.powerDialerService.findOneOrFail({
        id: args.powerDialerId,
        teamId: team.id,
      });
      wrappers.push(eq(callHistoriesTable.powerDialerId, powerDialer.id));
    } else {
      query.leftJoin(
        powerDialersTable,
        eq(callHistoriesTable.powerDialerId, powerDialersTable.id),
      );

      wrappers.push(eq(powerDialersTable.teamId, team.id));
    }

    query.where(and(...wrappers));

    return this.dbService.withCursorPagination(query, {
      ...args,
      cursors: (t) => [getCursorOrder(t.id, true)],
    });
  }

  @Mutation(() => CreateCallHistoryPayload)
  async createCallHistory(
    @Auth() user: User,
    @Args() args: CreateCallHistoryArgs,
  ) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    const powerDialer = await this.powerDialerService.findOneOrFail({
      id: args.powerDialerId,
      teamId: team.id,
    });

    const dialerContact = await this.db.query.dialerContacts
      .findFirst({
        where: (t) =>
          and(
            eq(t.powerDialerId, powerDialer.id),
            eq(t.id, args.dialerContactId),
          ),
      })
      .then(orFail("dialer contact"));

    const input: CallHistoryInsert = {
      ...args.input,
      powerDialerId: powerDialer.id,
      dialerContactId: dialerContact.id,
    };

    if (input.dialerMode === DialerMode.AI_SDR) {
      if (!input.aiSdrAvatarId) {
        throw new BadRequestException("AI SDR avatar ID is required");
      }

      await this.db.query.aiSdrAvatars
        .findFirst({
          where: (t) =>
            and(eq(t.teamId, team.id), eq(t.id, input.aiSdrAvatarId as string)),
        })
        .then(orFail("ai sdr avatar"));
    } else {
      input.teamMemberId = user.id;
    }

    const [callHistory] = await this.db
      .insert(callHistoriesTable)
      .values({
        ...input,
        powerDialerId: powerDialer.id,
        dialerContactId: dialerContact.id,
      })
      .returning();

    if (args.markAsCompleted) {
      await this.db
        .update(dialerContactsTable)
        .set({ status: "COMPLETED" })
        .where(eq(dialerContactsTable.id, dialerContact.id));
    }

    return {
      callHistory,
    };
  }

  @ResolveField(() => DialerContact)
  contact(
    @Parent() callHistory: CallHistory,
    @Context("loaders") loaders: Dataloaders,
  ) {
    return loaders.dialerContact.load(callHistory.dialerContactId);
  }
}
