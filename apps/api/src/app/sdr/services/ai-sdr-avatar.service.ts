import { InjectDB } from "@/database/decorators";
import { DatabaseService } from "@/database/services/database.service";
import { DrizzleClient } from "@/database/types";
import { Injectable } from "@nestjs/common";
import {
  AiSdrAvatarConnectionArgs,
  CreateAiSdrAvatarArgs,
  FindAiSdrAvatarArgs,
  UpdateAiSdrAvatarArgs,
} from "../args/ai-sdr-avatar.args";
import { aiSdrAvatars } from "@/database/schema/ai-sdr-avatars.schema";
import { and, eq, ilike, or } from "drizzle-orm";
import { getCursorOrder } from "@haorama/drizzle-postgres-extra";
import { AiSdrAvatarSelect } from "../models/ai-sdr-avatar.model";
import { orFail } from "@/database/exceptions";

@Injectable()
export class AiSdrAvatarService {
  constructor(
    @InjectDB() private db: DrizzleClient,
    private dbService: DatabaseService,
  ) {}

  paginate(options: AiSdrAvatarConnectionArgs) {
    const searchQuery = !options?.searchQuery
      ? undefined
      : `%${options.searchQuery}%`;
    const query = this.db
      .select()
      .from(aiSdrAvatars)
      .where((t) =>
        and(
          eq(t.teamId, options.teamId),
          !searchQuery
            ? undefined
            : or(
                ilike(t.name, searchQuery),
                ilike(t.description, searchQuery),
                ilike(t.industry, searchQuery),
              ),
        ),
      )
      .$dynamic();

    return this.dbService.withCursorPagination(query, {
      ...options,
      cursors: (t) => [getCursorOrder(t.id, true)],
    });
  }

  async findOneOrFail(
    options: FindAiSdrAvatarArgs,
  ): Promise<AiSdrAvatarSelect> {
    const avatar = await this.db.query.aiSdrAvatars
      .findFirst({
        where: (t) => and(eq(t.teamId, options.teamId), eq(t.id, options.id)),
      })
      .then(orFail("avatar"));
    return avatar;
  }

  async create(options: CreateAiSdrAvatarArgs) {
    const [avatar] = await this.db
      .insert(aiSdrAvatars)
      .values({
        ...options.input,
        teamId: options.teamId,
      })
      .returning();

    return { avatar };
  }

  async update(args: UpdateAiSdrAvatarArgs) {
    // First check if the avatar exists
    await this.findOneOrFail(args);

    const [avatar] = await this.db
      .update(aiSdrAvatars)
      .set(args.input)
      .where(
        and(eq(aiSdrAvatars.id, args.id), eq(aiSdrAvatars.teamId, args.teamId)),
      )
      .returning();

    return { avatar };
  }

  async remove(args: FindAiSdrAvatarArgs) {
    // First check if the avatar exists
    await this.findOneOrFail(args);

    await this.db
      .delete(aiSdrAvatars)
      .where(
        and(eq(aiSdrAvatars.id, args.id), eq(aiSdrAvatars.teamId, args.teamId)),
      );

    return {
      id: args.id,
    };
  }
}
