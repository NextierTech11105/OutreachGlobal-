import { RealEstateService } from "@/app/property/services/real-estate.service";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  leadsTable,
  propertiesTable,
  propertyDistressScoresTable,
} from "@/database/schema-alias";
import { and, eq, ilike, isNull, lte, or, sql, SQLWrapper } from "drizzle-orm";
import { LeadInsert, LeadSelect } from "../models/lead.model";
import { PropertyDistressScoreInsert } from "@/app/property/models/property-distress-score.model";
import { PropertyInsert } from "@/app/property/models/property.model";
import { leadTimers, LeadTimerType } from "@/database/schema/canonical-lead-state.schema";
import { LeadService } from "../services/lead.service";

interface PropertyAddress {
  address: string;
  city: string;
  county: string;
  state: string;
  street: string;
  zip: string;
}

interface PropertyData {
  id: string;
  propertyId: string;
  preForeclosure: boolean;
  address: PropertyAddress;
  owner1FirstName?: string;
  owner1LastName?: string;
  owner2FirstName?: string;
  owner2LastName?: string;
  estimatedValue?: number;
  yearBuilt?: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  lotSquareFeet?: number;
  absenteeOwner?: boolean;
  highEquity?: boolean;
  ownerOccupied?: boolean;
  loanTypeCode: string;
  vacant: boolean;
  equityPercent: number;
  maturityDateFirst?: string;
}

@Injectable()
export class LeadSchedule {
  private readonly logger = new Logger(LeadSchedule.name);

  constructor(
    private reiService: RealEstateService,
    private leadService: LeadService,
    @InjectDB() private db: DrizzleClient,
  ) {}

  private createScore(
    property: PropertyData,
    defaultTags: string[] = [],
    defaultScore = 0,
  ) {
    const tags = defaultTags;
    let currentScore = defaultScore;
    if (property.preForeclosure) {
      currentScore += 10;
      tags.push("PreForeclosure");
    }

    if (property.loanTypeCode === "REV") {
      currentScore += 10;
      tags.push("SeniorOwner");
    }

    if (property.vacant) {
      currentScore += 10;
      tags.push("VacantProp");
    }

    if (property.equityPercent > 80) {
      currentScore += 10;
      tags.push("HighEquity");
    }

    if (property.maturityDateFirst) {
      const maturityDate = new Date(property.maturityDateFirst);
      const today = new Date();
      const diffTime = Math.abs(maturityDate.getTime() - today.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 365) {
        currentScore += 10;
        tags.push("LoanMaturityRisk");
      }
    }

    if (property.equityPercent < 30 && property.equityPercent > 0) {
      currentScore += 10;
      tags.push("LowEquity");
    }

    if (property.equityPercent < 0) {
      currentScore += 10;
      tags.push("Underwater");
    }

    if (currentScore > 100) {
      currentScore = 100;
    }

    return { score: currentScore, tags };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handle() {
    try {
      this.logger.log("Starting property search and lead matching");
      const properties = await this.reiService.propertySearch();
      await this.matchLeadsWithProperties(properties);
      const propertyValues: PropertyInsert[] = [];
      properties.forEach((prop) => {
        const { tags } = this.createScore(prop, [], 0);
        propertyValues.push({
          ...prop,
          id: undefined,
          source: "RealEstateAPI",
          externalId: prop.id,
          ownerLastName: prop.owner1FirstName,
          ownerFirstName: prop.owner1LastName,
          buildingSquareFeet: prop.squareFeet,
          type: prop.propertyType,
          metadata: { property: prop },
          tags: [...new Set(tags)],
          mortgageInfo: {
            lenderName: prop.lenderName,
            loanTypeCode: prop.loanTypeCode,
            lenderType: prop.lenderType,
          },
        });
      });

      if (propertyValues.length) {
        await this.db
          .insert(propertiesTable)
          .values(propertyValues)
          .onConflictDoNothing({
            target: [propertiesTable.externalId, propertiesTable.source],
          });
      }
    } catch (error: any) {
      console.log(error);
    }
  }

  async updateMatchingLeads(
    matches: { lead: LeadSelect; property: PropertyData }[],
  ) {
    const leadToUpdate: LeadInsert[] = [];
    const scoreValues: PropertyDistressScoreInsert[] = [];

    for (const { lead, property } of matches) {
      const { tags, score } = this.createScore(
        property,
        lead.tags || [],
        lead.score,
      );

      if (!scoreValues.find((score) => score.externalId === property.id)) {
        scoreValues.push({
          teamId: lead.teamId,
          provider: "REAL_ESTATE_API",
          externalId: property.id,
          address: property.address?.address || null,
          ownerName: property.owner1FirstName || null,
          ownerType: property.owner1LastName || null,
          equityPercent: property.equityPercent,
          isVacant: property.vacant,
          loanMaturityDate: property.maturityDateFirst,
          reverseMortgage: property.loanTypeCode === "REV",
          score,
          lastSignalUpdate: new Date(),
        });
      }

      leadToUpdate.push({
        ...lead,
        id: lead.id,
        score,
        source: "RealEstateAPI",
        tags: [...new Set(tags)],
      });
    }

    await this.db
      .insert(leadsTable)
      .values(leadToUpdate)
      .onConflictDoUpdate({
        target: leadsTable.id,
        set: {
          score: sql`excluded.score`,
          tags: sql`excluded.tags`,
          source: sql`excluded.source`,
        },
      });

    await this.db
      .insert(propertyDistressScoresTable)
      .values(scoreValues)
      .onConflictDoUpdate({
        target: [
          propertyDistressScoresTable.provider,
          propertyDistressScoresTable.externalId,
        ],
        set: {
          score: sql`excluded.score`,
          lastSignalUpdate: sql`excluded.last_signal_update`,
        },
      });
  }

  /**
   * Match leads with properties based on various criteria
   */
  private async matchLeadsWithProperties(properties: PropertyData[]) {
    this.logger.log(`Processing ${properties.length} properties`);

    const matches: { lead: LeadSelect; property: PropertyData }[] = [];

    for (const property of properties) {
      try {
        // Find leads that match this property by address, name, or zip code
        const matchingLeads = await this.findMatchingLeads(property);

        if (matchingLeads.length > 0) {
          this.logger.log(
            `Found ${matchingLeads.length} matching leads for property ${property.address.address}`,
          );
          matchingLeads.forEach((lead) => {
            matches.push({ lead, property });
          });
        }
      } catch (error: any) {
        this.logger.error(
          `Error processing property ${property.address.address}: ${error.message}`,
        );
      }
    }

    if (matches.length > 0) {
      await this.updateMatchingLeads(matches);
    }
  }

  /**
   * Find leads that match a property based on address, name, or zip code
   */
  private async findMatchingLeads(property: PropertyData) {
    const {
      address,
      owner1FirstName,
      owner1LastName,
      owner2FirstName,
      owner2LastName,
    } = property;

    // Build query conditions for matching leads
    const conditions: (SQLWrapper | undefined)[] = [];

    // Match by address
    if (address?.address) {
      conditions.push(ilike(leadsTable.address, `%${address.address}%`));
    }

    // Match by zip code
    if (address?.zip) {
      conditions.push(eq(leadsTable.zipCode, address.zip));
    }

    // Match by state
    if (address?.state) {
      conditions.push(eq(leadsTable.state, address.state));
    }

    // Match by city
    if (address?.city) {
      conditions.push(ilike(leadsTable.city, `%${address.city}%`));
    }

    // Match by owner names
    if (owner1FirstName && owner1LastName) {
      conditions.push(
        and(
          ilike(leadsTable.firstName, `%${owner1FirstName}%`),
          ilike(leadsTable.lastName, `%${owner1LastName}%`),
        ),
      );
    }

    if (owner2FirstName && owner2LastName) {
      conditions.push(
        and(
          ilike(leadsTable.firstName, `%${owner2FirstName}%`),
          ilike(leadsTable.lastName, `%${owner2LastName}%`),
        ),
      );
    }

    // If no conditions, return empty array
    if (conditions.length === 0) {
      return [];
    }

    // Execute query with OR conditions
    return this.db
      .select()
      .from(leadsTable)
      .where(or(...conditions))
      .execute();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TIMER EXECUTION - Execute due lead timers (7D retarget, 14D escalation)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Execute due lead timers every minute
   * Handles 7-day retargeting and 14-day template rotation
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async executeLeadTimers() {
    const now = new Date();

    try {
      // Find all due timers (not yet executed, not cancelled)
      const dueTimers = await this.db
        .select()
        .from(leadTimers)
        .where(
          and(
            lte(leadTimers.triggerAt, now),
            isNull(leadTimers.executedAt),
            isNull(leadTimers.cancelledAt),
          ),
        )
        .limit(100); // Process in batches to avoid overwhelming the system

      if (dueTimers.length === 0) {
        return;
      }

      this.logger.log(`Executing ${dueTimers.length} due lead timers`);

      for (const timer of dueTimers) {
        try {
          await this.executeTimer(timer);

          // Mark timer as executed
          await this.db
            .update(leadTimers)
            .set({
              executedAt: now,
              attempts: (timer.attempts || 0) + 1,
            })
            .where(eq(leadTimers.id, timer.id));

          this.logger.log(
            `Timer ${timer.id} (${timer.timerType}) executed for lead ${timer.leadId}`,
          );
        } catch (error) {
          // Increment attempts and log error
          await this.db
            .update(leadTimers)
            .set({
              attempts: (timer.attempts || 0) + 1,
              lastError: error instanceof Error ? error.message : String(error),
            })
            .where(eq(leadTimers.id, timer.id));

          this.logger.error(
            `Timer ${timer.id} failed: ${error instanceof Error ? error.message : error}`,
          );

          // Cancel timer if max attempts reached
          if ((timer.attempts || 0) >= (timer.maxAttempts || 3)) {
            await this.db
              .update(leadTimers)
              .set({
                cancelledAt: now,
                cancelReason: "Max attempts reached",
              })
              .where(eq(leadTimers.id, timer.id));

            this.logger.warn(
              `Timer ${timer.id} cancelled after ${timer.maxAttempts} failed attempts`,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(`Timer execution batch failed: ${error}`);
    }
  }

  /**
   * Execute a single timer based on its type
   */
  private async executeTimer(timer: typeof leadTimers.$inferSelect) {
    switch (timer.timerType) {
      case "TIMER_7D":
        await this.leadService.moveToRetargeting(timer.leadId);
        break;

      case "TIMER_14D":
        await this.leadService.rotateTemplate(timer.leadId);
        break;

      case "FOLLOW_UP":
        // Generic follow-up handling
        this.logger.log(`Follow-up timer triggered for lead ${timer.leadId}`);
        break;

      case "CALLBACK":
        // Scheduled callback handling
        this.logger.log(`Callback timer triggered for lead ${timer.leadId}`);
        break;

      default:
        this.logger.warn(`Unknown timer type: ${timer.timerType}`);
    }
  }

  /**
   * Get timer statistics (for monitoring dashboard)
   */
  async getTimerStats() {
    const now = new Date();

    const pending = await this.db.$count(
      leadTimers,
      and(isNull(leadTimers.executedAt), isNull(leadTimers.cancelledAt)),
    );

    const overdue = await this.db.$count(
      leadTimers,
      and(
        lte(leadTimers.triggerAt, now),
        isNull(leadTimers.executedAt),
        isNull(leadTimers.cancelledAt),
      ),
    );

    return { pending, overdue };
  }
}
