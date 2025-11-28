import { InjectDB } from "@/database/decorators";
import { DatabaseService } from "@/database/services/database.service";
import { DrizzleClient } from "@/database/types";
import { Injectable } from "@nestjs/common";
import {
  CreatePowerDialerArgs,
  FindOnePowerDialerArgs,
  PowerDialerConnectionArgs,
} from "../args/power-dialer.args";
import { powerDialersTable } from "@/database/schema-alias";
import { and, eq } from "drizzle-orm";
import { getCursorOrder } from "@haorama/drizzle-postgres-extra";
import { orFail } from "@/database/exceptions";

@Injectable()
export class PowerDialerService {
  constructor(
    @InjectDB() private db: DrizzleClient,
    private dbService: DatabaseService,
  ) {}

  paginate(options: PowerDialerConnectionArgs) {
    const query = this.db
      .select()
      .from(powerDialersTable)
      .where((t) => and(eq(t.teamId, options.teamId)))
      .$dynamic();

    return this.dbService.withCursorPagination(query, {
      ...options,
      cursors: (t) => [getCursorOrder(t.id, true)],
    });
  }

  async findOneOrFail(options: FindOnePowerDialerArgs) {
    const powerDialer = await this.db.query.powerDialers
      .findFirst({
        where: (t) => and(eq(t.id, options.id), eq(t.teamId, options.teamId)),
      })
      .then(orFail("power dialer"));
    return powerDialer;
  }

  async create({ teamId, input }: CreatePowerDialerArgs) {
    const [powerDialer] = await this.db
      .insert(powerDialersTable)
      .values({
        ...input,
        teamId,
      })
      .returning();

    return { powerDialer };
  }
}
