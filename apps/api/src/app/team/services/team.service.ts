import { InjectDB } from "@/database/decorators";
import { orFail } from "@/database/exceptions";
import { DrizzleClient } from "@/database/types";
import { Injectable } from "@nestjs/common";
import { and, eq, or } from "drizzle-orm";

@Injectable()
export class TeamService {
  constructor(@InjectDB() private db: DrizzleClient) {}

  async findById(idOrSlug: string) {
    const team = await this.db.query.teams
      .findFirst({
        where: (t) => and(or(eq(t.id, idOrSlug), eq(t.slug, idOrSlug))),
      })
      .then(orFail("team"));

    return team;
  }

  async findByUserId(userId: string) {
    const team = await this.db.query.teams.findFirst({
      where: (t) => eq(t.ownerId, userId),
    });

    return team;
  }
}
