import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { leads } from "@/database/schema-alias";
import { sql, eq, and, asc, desc, like, or } from "drizzle-orm";
import { User } from "@/app/user/models/user.model";
import { ulid } from "ulid";

/**
 * Leads REST API Controller
 *
 * Provides REST endpoints for lead CRUD operations.
 * Used by the frontend's lead management pages.
 */
@Controller("rest/leads")
@UseAuthGuard()
export class LeadsApiController {
  private readonly logger = new Logger(LeadsApiController.name);

  constructor(@InjectDB() private readonly db: DrizzleClient) {}

  /**
   * GET /rest/leads
   * List leads with pagination and filtering
   */
  @Get()
  async list(
    @Auth() user: User,
    @Query("perPage") perPage?: string,
    @Query("page") page?: string,
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("source") source?: string,
  ) {
    try {
      const teamId = user.teamId;
      if (!teamId) {
        return { leads: [], total: 0 };
      }

      const limit = parseInt(perPage || "50", 10);
      const offset = parseInt(page || "0", 10);

      // Build where conditions
      const conditions = [eq(leads.teamId, teamId)];

      if (status && status !== "all") {
        conditions.push(eq(leads.pipelineStatus, status));
      }

      if (source) {
        conditions.push(eq(leads.source, source));
      }

      if (search) {
        conditions.push(
          or(
            like(leads.firstName, `%${search}%`),
            like(leads.lastName, `%${search}%`),
            like(leads.company, `%${search}%`),
            like(leads.email, `%${search}%`),
            like(leads.phone, `%${search}%`),
          )
        );
      }

      // Get leads
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
          source: leads.source,
          createdAt: leads.createdAt,
          updatedAt: leads.updatedAt,
        })
        .from(leads)
        .where(and(...conditions))
        .orderBy(desc(leads.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count
      const [totalResult] = await this.db
        .select({ total: sql<number>`count(*)` })
        .from(leads)
        .where(and(...conditions));

      return {
        leads: leadsList,
        total: totalResult?.total || 0,
        page: Math.floor(offset / limit),
        perPage: limit,
      };
    } catch (error) {
      this.logger.error(`Error fetching leads: ${error}`);
      return { leads: [], total: 0 };
    }
  }

  /**
   * GET /rest/leads/:id
   * Get a single lead by ID
   */
  @Get(":id")
  async get(@Auth() user: User, @Param("id") id: string) {
    try {
      const teamId = user.teamId;
      if (!teamId) {
        throw new BadRequestException("User not associated with a team");
      }

      const [lead] = await this.db
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
          zipCode: leads.zipCode,
          country: leads.country,
          address: leads.address,
          source: leads.source,
          tags: leads.tags,
          notes: leads.notes,
          metadata: leads.metadata,
          createdAt: leads.createdAt,
          updatedAt: leads.updatedAt,
        })
        .from(leads)
        .where(and(eq(leads.id, id), eq(leads.teamId, teamId)));

      if (!lead) {
        throw new BadRequestException("Lead not found");
      }

      return lead;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error fetching lead: ${error}`);
      throw new BadRequestException("Failed to fetch lead");
    }
  }

  /**
   * POST /rest/leads
   * Create a new lead
   */
  @Post()
  async create(
    @Auth() user: User,
    @Body()
    body: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      company?: string;
      title?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      source?: string;
    },
  ) {
    try {
      const teamId = user.teamId;
      if (!teamId) {
        throw new BadRequestException("User not associated with a team");
      }

      const [lead] = await this.db
        .insert(leads)
        .values({
          id: ulid(),
          teamId,
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
          phone: body.phone,
          company: body.company,
          title: body.title,
          city: body.city,
          state: body.state,
          zipCode: body.zipCode,
          source: body.source,
          pipelineStatus: "raw",
          score: 0,
        })
        .returning();

      return {
        success: true,
        lead,
      };
    } catch (error) {
      this.logger.error(`Error creating lead: ${error}`);
      throw new BadRequestException("Failed to create lead");
    }
  }

  /**
   * PUT /rest/leads/:id
   * Update a lead
   */
  @Put(":id")
  async update(
    @Auth() user: User,
    @Param("id") id: string,
    @Body()
    body: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      company?: string;
      title?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      status?: string;
      notes?: string;
    },
  ) {
    try {
      const teamId = user.teamId;
      if (!teamId) {
        throw new BadRequestException("User not associated with a team");
      }

      // Check if lead exists
      const [existingLead] = await this.db
        .select({ id: leads.id })
        .from(leads)
        .where(and(eq(leads.id, id), eq(leads.teamId, teamId)));

      if (!existingLead) {
        throw new BadRequestException("Lead not found");
      }

      const [lead] = await this.db
        .update(leads)
        .set({
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
          phone: body.phone,
          company: body.company,
          title: body.title,
          city: body.city,
          state: body.state,
          zipCode: body.zipCode,
          status: body.status,
          notes: body.notes,
          updatedAt: new Date(),
        })
        .where(and(eq(leads.id, id), eq(leads.teamId, teamId)))
        .returning();

      return {
        success: true,
        lead,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error updating lead: ${error}`);
      throw new BadRequestException("Failed to update lead");
    }
  }

  /**
   * DELETE /rest/leads/:id
   * Delete a lead
   */
  @Delete(":id")
  async delete(@Auth() user: User, @Param("id") id: string) {
    try {
      const teamId = user.teamId;
      if (!teamId) {
        throw new BadRequestException("User not associated with a team");
      }

      // Check if lead exists
      const [existingLead] = await this.db
        .select({ id: leads.id })
        .from(leads)
        .where(and(eq(leads.id, id), eq(leads.teamId, teamId)));

      if (!existingLead) {
        throw new BadRequestException("Lead not found");
      }

      await this.db
        .delete(leads)
        .where(and(eq(leads.id, id), eq(leads.teamId, teamId)));

      return {
        success: true,
        message: "Lead deleted successfully",
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error deleting lead: ${error}`);
      throw new BadRequestException("Failed to delete lead");
    }
  }
}
