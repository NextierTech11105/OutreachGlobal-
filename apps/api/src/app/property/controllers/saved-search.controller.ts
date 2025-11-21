import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { BaseController } from "@/app/base.controller";
import { TeamService } from "@/app/team/services/team.service";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { User } from "@/app/user/models/user.model";
import { z } from "@nextier/dto";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { savedSearchesTable, savedSearchResultsTable } from "@/database/schema-alias";
import { eq, and, desc } from "drizzle-orm";
import { RealEstateService } from "../services/real-estate.service";

@Controller("rest/:teamId/saved-searches")
@UseAuthGuard()
export class SavedSearchController extends BaseController {
  constructor(
    @InjectDB() private db: DrizzleClient,
    private realEstateService: RealEstateService,
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
  ) {
    super();
  }

  @Get()
  async list(@Auth() user: User, @Param("teamId") teamId: string) {
    const team = await this.teamService.findById(teamId);
    await this.teamPolicy.can().read(user, team);

    return await this.db
      .select()
      .from(savedSearchesTable)
      .where(eq(savedSearchesTable.teamId, teamId))
      .orderBy(desc(savedSearchesTable.createdAt));
  }

  @Post()
  async create(
    @Auth() user: User,
    @Param("teamId") teamId: string,
    @Body() body: Record<string, any>,
  ) {
    const team = await this.teamService.findById(teamId);
    await this.teamPolicy.can().manage(user, team);

    const input = this.validate(
      z.object({
        searchName: z.string(),
        searchQuery: z.object({
          state: z.string().optional(),
          city: z.string().optional(),
          county: z.string().optional(),
          neighborhood: z.string().optional(),
          zipCode: z.string().optional(),
          propertyType: z.string().optional(),
          propertyCode: z.string().optional(),
          filters: z
            .object({
              absenteeOwner: z.boolean().optional(),
              vacant: z.boolean().optional(),
              preForeclosure: z.boolean().optional(),
              lisPendens: z.boolean().optional(),
              minValue: z.number().optional(),
              maxValue: z.number().optional(),
            })
            .optional(),
          limit: z.number().optional(),
        }),
        batchJobEnabled: z.string().optional().default("false"),
      }),
      body,
    );

    // Get initial count
    const countResult = await this.realEstateService.propertyCount({
      state: input.searchQuery.state,
      city: input.searchQuery.city,
      county: input.searchQuery.county,
      neighborhood: input.searchQuery.neighborhood,
      zipCode: input.searchQuery.zipCode,
      propertyType: input.searchQuery.propertyType,
      propertyCode: input.searchQuery.propertyCode,
    });

    const [savedSearch] = await this.db
      .insert(savedSearchesTable)
      .values({
        teamId,
        searchName: input.searchName,
        searchQuery: input.searchQuery,
        batchJobEnabled: input.batchJobEnabled,
        totalProperties: countResult.count.toString(),
        lastReportDate: new Date(),
      })
      .returning();

    return savedSearch;
  }

  @Get(":id")
  async get(
    @Auth() user: User,
    @Param("teamId") teamId: string,
    @Param("id") id: string,
  ) {
    const team = await this.teamService.findById(teamId);
    await this.teamPolicy.can().read(user, team);

    const [savedSearch] = await this.db
      .select()
      .from(savedSearchesTable)
      .where(and(eq(savedSearchesTable.id, id), eq(savedSearchesTable.teamId, teamId)));

    return savedSearch;
  }

  @Put(":id/batch-job")
  async toggleBatchJob(
    @Auth() user: User,
    @Param("teamId") teamId: string,
    @Param("id") id: string,
    @Body() body: Record<string, any>,
  ) {
    const team = await this.teamService.findById(teamId);
    await this.teamPolicy.can().manage(user, team);

    const input = this.validate(
      z.object({
        enabled: z.string(),
      }),
      body,
    );

    const [updated] = await this.db
      .update(savedSearchesTable)
      .set({
        batchJobEnabled: input.enabled,
        updatedAt: new Date(),
      })
      .where(and(eq(savedSearchesTable.id, id), eq(savedSearchesTable.teamId, teamId)))
      .returning();

    return updated;
  }

  @Delete(":id")
  async delete(
    @Auth() user: User,
    @Param("teamId") teamId: string,
    @Param("id") id: string,
  ) {
    const team = await this.teamService.findById(teamId);
    await this.teamPolicy.can().manage(user, team);

    await this.db
      .delete(savedSearchesTable)
      .where(and(eq(savedSearchesTable.id, id), eq(savedSearchesTable.teamId, teamId)));

    return { success: true };
  }

  @Get(":id/results")
  async getResults(
    @Auth() user: User,
    @Param("teamId") teamId: string,
    @Param("id") id: string,
  ) {
    const team = await this.teamService.findById(teamId);
    await this.teamPolicy.can().read(user, team);

    return await this.db
      .select()
      .from(savedSearchResultsTable)
      .where(eq(savedSearchResultsTable.savedSearchId, id))
      .orderBy(desc(savedSearchResultsTable.timesFound));
  }
}
