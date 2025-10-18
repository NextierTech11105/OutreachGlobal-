import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { ImportLeadPreset } from "../models/import-lead-preset.model";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { TeamService } from "@/app/team/services/team.service";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { CreateImportLeadPresetPayload } from "../objects/import-lead-preset.object";
import { User } from "@/app/user/models/user.model";
import {
  CreateImportLeadPresetArgs,
  FindManyImportLeadPresetArgs,
} from "../args/import-lead-preset.args";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { importLeadPresetsTable } from "@/database/schema-alias";
import { eq } from "drizzle-orm";

@Resolver(() => ImportLeadPreset)
@UseAuthGuard()
export class ImportLeadPresetResolver extends BaseResolver(ImportLeadPreset) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    @InjectDB() private db: DrizzleClient,
  ) {
    super();
  }

  @Query(() => [ImportLeadPreset])
  async importLeadPresets(
    @Auth() user: User,
    @Args() args: FindManyImportLeadPresetArgs,
  ) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.db.query.importLeadPresets.findMany({
      where: (t) => eq(t.teamId, team.id),
    });
  }

  @Mutation(() => CreateImportLeadPresetPayload)
  async createImportLeadPreset(
    @Auth() user: User,
    @Args() args: CreateImportLeadPresetArgs,
  ) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    const [preset] = await this.db
      .insert(importLeadPresetsTable)
      .values({
        ...args.input,
        teamId: team.id,
      })
      .returning();
    return {
      preset,
    };
  }
}
