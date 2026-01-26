import {
  Controller,
  Get,
  Logger,
} from "@nestjs/common";
import { TenantContext, UseAuthGuard } from "@/app/auth/decorators";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { leadsTable as leads } from "@/database/schema-alias";
import { sql, eq, and, desc } from "drizzle-orm";

/**
 * Sectors API Controller
 *
 * Provides REST endpoints for sector/industry statistics.
 * Sectors are derived from SIC codes or industry tags on leads.
 */
@Controller("rest/sectors")
@UseAuthGuard()
export class SectorsController {
  private readonly logger = new Logger(SectorsController.name);

  constructor(@InjectDB() private readonly db: DrizzleClient) {}

  /**
   * GET /rest/sectors/stats
   * Get aggregate statistics by pipeline status
   */
  @Get("stats")
  async stats(@TenantContext("teamId") teamId: string) {
    try {
      if (!teamId) {
        return {
          raw: 0,
          skip_traced: 0,
          validated: 0,
          ready: 0,
          blocked: 0,
          sent: 0,
          blockedDNC: 0,
          blockedLitigator: 0,
          blockedInvalid: 0,
          withPhone: 0,
          withMobile: 0,
          withEmail: 0,
        };
      }

      // Get aggregate counts by pipeline status
      const pipelineStats = await this.db
        .select({
          status: leads.pipelineStatus,
          count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(leads)
        .where(eq(leads.teamId, teamId))
        .groupBy(leads.pipelineStatus);

      // Initialize stats with zeros
      const stats = {
        raw: 0,
        skip_traced: 0,
        validated: 0,
        ready: 0,
        blocked: 0,
        sent: 0,
        blockedDNC: 0,
        blockedLitigator: 0,
        blockedInvalid: 0,
        withPhone: 0,
        withMobile: 0,
        withEmail: 0,
      };

      // Map pipeline statuses to our stats
      for (const row of pipelineStats) {
        const status = row.status || "raw";
        const count = row.count || 0;

        switch (status) {
          case "raw":
          case "new":
            stats.raw += count;
            break;
          case "traced":
          case "skip_traced":
            stats.skip_traced += count;
            break;
          case "scored":
          case "validated":
            stats.validated += count;
            break;
          case "ready":
          case "qualified":
            stats.ready += count;
            break;
          case "blocked":
          case "rejected":
            stats.blocked += count;
            break;
          case "sent":
          case "campaign":
            stats.sent += count;
            break;
        }
      }

      // Get phone/email counts
      const [phoneCountResult] = await this.db
        .select({
          count: sql<number>`count(case when ${leads.phone} is not null and ${leads.phone} != '' then 1 end)`,
        })
        .from(leads)
        .where(eq(leads.teamId, teamId));

      const [emailCountResult] = await this.db
        .select({
          count: sql<number>`count(case when ${leads.email} is not null and ${leads.email} != '' then 1 end)`,
        })
        .from(leads)
        .where(eq(leads.teamId, teamId));

      stats.withPhone = phoneCountResult?.count || 0;
      stats.withEmail = emailCountResult?.count || 0;

      // Mobile count is harder to determine without enrichment data
      // For now, estimate based on phone presence
      stats.withMobile = Math.floor(stats.withPhone * 0.7);

      return stats;
    } catch (error) {
      this.logger.error(`Error fetching sector stats: ${error}`);
      return {
        raw: 0,
        skip_traced: 0,
        validated: 0,
        ready: 0,
        blocked: 0,
        sent: 0,
        blockedDNC: 0,
        blockedLitigator: 0,
        blockedInvalid: 0,
        withPhone: 0,
        withMobile: 0,
        withEmail: 0,
      };
    }
  }

  /**
   * GET /rest/sectors
   * List all sectors with lead counts
   */
  @Get()
  async list(@TenantContext("teamId") teamId: string) {
    try {
      if (!teamId) {
        return { sectors: [], totalLeads: 0 };
      }

      // Get leads grouped by tags (sectors)
      const sectors = await this.db
        .select({
          sector: sql<string>`unnest(${leads.tags})`,
          count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(leads)
        .where(and(eq(leads.teamId, teamId), sql`${leads.tags} is not null`))
        .groupBy(sql`unnest(${leads.tags})`)
        .orderBy(desc(sql`count(*)`));

      return {
        sectors: sectors.map((s) => ({
          name: s.sector,
          count: s.count,
        })),
        totalLeads: sectors.reduce((sum, s) => sum + s.count, 0),
      };
    } catch (error) {
      this.logger.error(`Error fetching sectors: ${error}`);
      return { sectors: [], totalLeads: 0 };
    }
  }
}
