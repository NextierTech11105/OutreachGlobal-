import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  BadRequestException,
  Logger,
  Param,
} from "@nestjs/common";
import { TenantContext } from "@/app/auth/decorators";
import { CombinedAuthGuard } from "@/app/auth/guards/combined-auth.guard";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { leadsTable as leads, dataSourcesTable as dataSources } from "@/database/schema-alias";
import { and, eq, sql, count, asc } from "drizzle-orm";

/**
 * Buckets API Controller
 *
 * Provides REST endpoints for the frontend's bucket/data-lake views.
 * Buckets are virtual groupings of leads by source/sector.
 */
@Controller("api/buckets")
@UseGuards(CombinedAuthGuard)
export class BucketsController {
  private readonly logger = new Logger(BucketsController.name);

  constructor(@InjectDB() private readonly db: DrizzleClient) {}

  /**
   * GET /api/buckets
   * List all buckets (data sources) with lead counts
   */
  @Get()
  async list(
    @TenantContext("teamId") teamId: string,
    @Query("perPage") perPage?: string,
    @Query("page") page?: string,
  ) {
    const limit = parseInt(perPage || "100", 10);
    const offset = parseInt(page || "0", 10);

    try {
      // Get data sources (buckets) with lead counts
      const buckets = await this.db
        .select({
          id: dataSources.id,
          name: dataSources.name,
          description: dataSources.description,
          source: dataSources.source,
          createdAt: dataSources.createdAt,
          updatedAt: dataSources.updatedAt,
          leadCount: sql<number>`count(${leads.id})`.mapWith(Number),
          enrichedCount: sql<number>`
            count(case when ${leads.enrichmentStatus} is not null then 1 end)
          `.mapWith(Number),
          contactedCount: sql<number>`
            count(case when ${leads.leadState} != 'new' then 1 end)
          `.mapWith(Number),
        })
        .from(dataSources)
        .leftJoin(leads, and(eq(dataSources.id, leads.source), eq(leads.teamId, teamId)))
        .where(eq(dataSources.teamId, teamId))
        .groupBy(dataSources.id)
        .orderBy(asc(dataSources.name))
        .limit(limit)
        .offset(offset);

      // If no data sources exist, return empty array
      if (!buckets || buckets.length === 0) {
        return {
          buckets: [],
          total: 0,
          page: offset / limit,
          perPage: limit,
        };
      }

      // Get total count
      const totalResult = await this.db
        .select({ total: sql<number>`count(distinct ${dataSources.id})` })
        .from(dataSources)
        .where(eq(dataSources.teamId, teamId));

      const total = totalResult[0]?.total || 0;

      return {
        buckets,
        total,
        page: offset / limit,
        perPage: limit,
      };
    } catch (error) {
      this.logger.error(`Error fetching buckets: ${error}`);
      return {
        buckets: [],
        total: 0,
        error: "Failed to fetch buckets",
      };
    }
  }

  /**
   * GET /api/buckets/:id
   * Get a single bucket by ID
   */
  @Get(":id")
  async get(
    @TenantContext("teamId") teamId: string,
    @Param("id") id: string,
  ) {
    try {
      const [bucket] = await this.db
        .select({
          id: dataSources.id,
          name: dataSources.name,
          description: dataSources.description,
          source: dataSources.source,
          metadata: dataSources.metadata,
          createdAt: dataSources.createdAt,
          updatedAt: dataSources.updatedAt,
        })
        .from(dataSources)
        .where(and(eq(dataSources.id, id), eq(dataSources.teamId, teamId)));

      if (!bucket) {
        throw new BadRequestException("Bucket not found");
      }

      // Get lead count for this bucket
      const [leadCountResult] = await this.db
        .select({ count: count(leads.id) })
        .from(leads)
        .where(and(eq(leads.source, id), eq(leads.teamId, teamId)));

      return {
        ...bucket,
        leadCount: leadCountResult?.count || 0,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error fetching bucket: ${error}`);
      throw new BadRequestException("Failed to fetch bucket");
    }
  }

  /**
   * GET /api/buckets/:id/leads
   * Get leads for a specific bucket
   */
  @Get(":id/leads")
  async getLeads(
    @TenantContext("teamId") teamId: string,
    @Param("id") id: string,
    @Query("perPage") perPage?: string,
    @Query("page") page?: string,
  ) {
    const limit = parseInt(perPage || "50", 10);
    const offset = parseInt(page || "0", 10);

    try {
      const leadsList = await this.db
        .select({
          id: leads.id,
          firstName: leads.firstName,
          lastName: leads.lastName,
          email: leads.email,
          phone: leads.phone,
          company: leads.company,
          title: leads.title,
          status: leads.status,
          pipelineStatus: leads.pipelineStatus,
          score: leads.score,
          enrichmentStatus: leads.enrichmentStatus,
          leadState: leads.leadState,
          city: leads.city,
          state: leads.state,
          createdAt: leads.createdAt,
        })
        .from(leads)
        .where(and(eq(leads.source, id), eq(leads.teamId, teamId)))
        .orderBy(asc(leads.createdAt))
        .limit(limit)
        .offset(offset);

      const [totalResult] = await this.db
        .select({ total: count(leads.id) })
        .from(leads)
        .where(and(eq(leads.source, id), eq(leads.teamId, teamId)));

      return {
        leads: leadsList,
        total: totalResult?.total || 0,
        page: offset / limit,
        perPage: limit,
      };
    } catch (error) {
      this.logger.error(`Error fetching bucket leads: ${error}`);
      throw new BadRequestException("Failed to fetch bucket leads");
    }
  }

  /**
   * POST /api/buckets
   * Create a new bucket/data source
   */
  @Post()
  async create(
    @TenantContext("teamId") teamId: string,
    @Body()
    body: {
      name: string;
      description?: string;
      source?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    if (!body.name) {
      throw new BadRequestException("name is required");
    }

    try {
      const [bucket] = await this.db
        .insert(dataSources)
        .values({
          teamId,
          name: body.name,
          description: body.description,
          source: body.source || body.name.toLowerCase().replace(/\s+/g, "_"),
          metadata: body.metadata || {},
        })
        .returning();

      return {
        success: true,
        bucket,
      };
    } catch (error) {
      this.logger.error(`Error creating bucket: ${error}`);
      throw new BadRequestException("Failed to create bucket");
    }
  }
}
