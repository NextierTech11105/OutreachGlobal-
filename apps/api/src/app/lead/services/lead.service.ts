import { InjectDB } from "@/database/decorators";
import { DatabaseService } from "@/database/services/database.service";
import { DrizzleClient } from "@/database/types";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import {
  LeadConnectionArgs,
  LeadsCountArgs,
  FindOneLeadArgs,
  CreateLeadArgs,
  UpdateLeadArgs,
  DeleteLeadArgs,
  BulkDeleteLeadArgs,
  CreateLeadPhoneNumberArgs,
  UpdateLeadPhoneNumberArgs,
  DeleteLeadPhoneNumberArgs,
} from "../args/lead.args";
import { leadPhoneNumbersTable, leadsTable } from "@/database/schema-alias";
import {
  and,
  arrayOverlaps,
  count,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { getCursorOrder } from "@haorama/drizzle-postgres-extra";
import { isNumber } from "@nextier/common";
import { ModelNotFoundError, orFail } from "@/database/exceptions";
import { EventBus } from "@nestjs/cqrs";
import { LeadCreated } from "../events/lead-created.event";
import { LeadUpdated } from "../events/lead-updated.event";
import {
  LeadState,
  VALID_STATE_TRANSITIONS,
  isValidTransition,
  leadEvents,
  leadTimers,
  LeadTimerType,
} from "@/database/schema/canonical-lead-state.schema";

@Injectable()
export class LeadService {
  private readonly logger = new Logger(LeadService.name);

  constructor(
    @InjectDB() private db: DrizzleClient,
    private dbService: DatabaseService,
    private eventBus: EventBus,
  ) {}

  paginate(options: LeadConnectionArgs) {
    const {
      sortBy,
      sortDirection,
      sicCode,
      state,
      sectorTag,
      enrichmentStatus,
      minScore,
      maxScore,
    } = options;

    const query = this.db
      .select()
      .from(leadsTable)
      .where((t) =>
        and(
          eq(t.teamId, options.teamId),
          options?.tags?.length
            ? arrayOverlaps(t.tags, options.tags)
            : undefined,
          typeof options.hasPhone === "boolean"
            ? options.hasPhone
              ? isNotNull(t.phone)
              : isNull(t.phone)
            : undefined,
          !options.searchQuery
            ? undefined
            : or(
                ilike(t.firstName, `%${options.searchQuery}%`),
                ilike(t.lastName, `%${options.searchQuery}%`),
                ilike(t.company, `%${options.searchQuery}%`),
                ilike(t.email, `%${options.searchQuery}%`),
                ilike(t.phone, `%${options.searchQuery}%`),
              ),
          // NEW FILTERS
          sicCode ? eq(t.sicCode, sicCode) : undefined,
          state ? eq(t.state, state) : undefined,
          sectorTag ? eq(t.sectorTag, sectorTag) : undefined,
          enrichmentStatus ? eq(t.enrichmentStatus, enrichmentStatus) : undefined,
          isNumber(minScore) ? gte(t.score, minScore) : undefined,
          isNumber(maxScore) ? lte(t.score, maxScore) : undefined,
        ),
      )
      .$dynamic();

    // Dynamic sort column selection
    const getSortColumn = () => {
      switch (sortBy) {
        case "score":
          return leadsTable.score;
        case "company":
          return leadsTable.company;
        case "state":
          return leadsTable.state;
        case "sicCode":
          return leadsTable.sicCode;
        case "createdAt":
        default:
          return leadsTable.createdAt;
      }
    };

    return this.dbService.withCursorPagination(query, {
      ...options,
      cursors: () => [
        getCursorOrder(getSortColumn(), sortDirection !== "asc"),
        getCursorOrder(leadsTable.id, true), // Secondary sort for stability
      ],
    });
  }

  async count(options: LeadsCountArgs) {
    const { minScore, maxScore } = options;
    const [{ total }] = await this.db
      .select({ total: count(leadsTable.id) })
      .from(leadsTable)
      .where(
        and(
          eq(leadsTable.teamId, options.teamId),
          isNumber(minScore) ? gte(leadsTable.score, minScore) : undefined,
          isNumber(maxScore) ? lte(leadsTable.score, maxScore) : undefined,
        ),
      );
    return total || 0;
  }

  async getStatuses(teamId: string) {
    const leads = await this.db
      .selectDistinct({ status: leadsTable.status })
      .from(leadsTable)
      .where(and(isNotNull(leadsTable.status), eq(leadsTable.teamId, teamId)));

    return leads.map((lead) => ({ id: lead.status || "NO_STATUS" }));
  }

  async getTags(teamId: string) {
    const leads = await this.db
      .selectDistinct({
        tag: sql<string>`unnest(${leadsTable.tags})`.as("tag"),
      })
      .from(leadsTable)
      .where(and(eq(leadsTable.teamId, teamId), isNotNull(leadsTable.tags)))
      .orderBy((t) => t.tag);

    return leads.map((lead) => lead.tag);
  }

  async findOneOrFail({ id, teamId }: FindOneLeadArgs) {
    const lead = await this.db.query.leads
      .findFirst({
        where: (t) => and(eq(t.id, id), eq(t.teamId, teamId)),
      })
      .then(orFail("lead"));
    return lead;
  }

  async create(options: CreateLeadArgs) {
    const [lead] = await this.db
      .insert(leadsTable)
      .values({
        teamId: options.teamId,
        ...options.input,
      })
      .returning();

    this.eventBus.publish(new LeadCreated(lead));

    return { lead };
  }

  async update(options: UpdateLeadArgs) {
    const [lead] = await this.db
      .update(leadsTable)
      .set(options.input)
      .where(
        and(
          eq(leadsTable.id, options.id),
          eq(leadsTable.teamId, options.teamId),
        ),
      )
      .returning();

    if (!lead) {
      throw new ModelNotFoundError("lead not found");
    }

    this.eventBus.publish(new LeadUpdated(lead));

    return { lead };
  }

  async remove(options: DeleteLeadArgs) {
    const [lead] = await this.db
      .delete(leadsTable)
      .where(
        and(
          eq(leadsTable.id, options.id),
          eq(leadsTable.teamId, options.teamId),
        ),
      )
      .returning({ id: leadsTable.id });

    if (!lead) {
      throw new ModelNotFoundError("lead not found");
    }

    return { deletedLeadId: lead.id };
  }

  async bulkRemove(options: BulkDeleteLeadArgs) {
    await this.db
      .delete(leadsTable)
      .where(
        and(
          inArray(leadsTable.id, options.leadIds),
          eq(leadsTable.teamId, options.teamId),
        ),
      );

    return { deletedLeadsCount: options.leadIds.length };
  }

  async createPhoneNumber(options: CreateLeadPhoneNumberArgs) {
    const total = await this.db.$count(
      leadPhoneNumbersTable,
      eq(leadPhoneNumbersTable.leadId, options.leadId),
    );

    if (total >= 3) {
      throw new BadRequestException(
        "lead can only have 3 additional phone numbers",
      );
    }

    const [leadPhoneNumber] = await this.db
      .insert(leadPhoneNumbersTable)
      .values({
        leadId: options.leadId,
        ...options.input,
      })
      .returning();

    return { leadPhoneNumber };
  }

  async updatePhoneNumber(options: UpdateLeadPhoneNumberArgs) {
    const [leadPhoneNumber] = await this.db
      .update(leadPhoneNumbersTable)
      .set({ label: options.label })
      .where(
        and(
          eq(leadPhoneNumbersTable.id, options.leadPhoneNumberId),
          eq(leadPhoneNumbersTable.leadId, options.leadId),
        ),
      )
      .returning();

    if (!leadPhoneNumber) {
      throw new ModelNotFoundError("lead phone number not found");
    }

    return { leadPhoneNumber };
  }

  async removePhoneNumber(options: DeleteLeadPhoneNumberArgs) {
    const [leadPhoneNumber] = await this.db
      .delete(leadPhoneNumbersTable)
      .where(
        and(
          eq(leadPhoneNumbersTable.id, options.leadPhoneNumberId),
          eq(leadPhoneNumbersTable.leadId, options.leadId),
        ),
      )
      .returning({ id: leadPhoneNumbersTable.id });

    if (!leadPhoneNumber) {
      throw new ModelNotFoundError("lead phone number not found");
    }

    return { deletedLeadPhoneNumberId: leadPhoneNumber.id };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CANONICAL STATE MACHINE - Enforced state transitions with event sourcing
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Update lead state with validation and event sourcing
   * This is the ONLY way to change lead state - direct updates are prohibited
   */
  async updateLeadState(
    leadId: string,
    teamId: string,
    newState: LeadState,
    triggeredBy: string = "SYSTEM",
    eventSource: string = "system",
    eventPayload?: Record<string, unknown>,
  ) {
    // 1. Get current lead
    const lead = await this.db.query.leads.findFirst({
      where: and(eq(leadsTable.id, leadId), eq(leadsTable.teamId, teamId)),
    });

    if (!lead) {
      throw new ModelNotFoundError("lead not found");
    }

    const currentState = (lead.leadState as LeadState) || "new";

    // 2. Validate transition
    if (!isValidTransition(currentState, newState)) {
      const allowedTransitions = VALID_STATE_TRANSITIONS[currentState] || [];
      throw new BadRequestException(
        `Invalid state transition: ${currentState} → ${newState}. ` +
          `Allowed transitions: ${allowedTransitions.length > 0 ? allowedTransitions.join(", ") : "none (terminal state)"}`,
      );
    }

    // 3. Record event (immutable event log)
    const [event] = await this.db
      .insert(leadEvents)
      .values({
        tenantId: teamId, // Using teamId as tenant for now
        teamId,
        leadId,
        eventType: "SMS_SENT", // Generic event type for state changes
        eventSource,
        previousState: currentState,
        newState,
        payload: {
          triggeredBy,
          ...eventPayload,
        },
        processedAt: new Date(),
      })
      .returning();

    // 4. Update lead state
    const [updatedLead] = await this.db
      .update(leadsTable)
      .set({
        leadState: newState,
        updatedAt: new Date(),
      })
      .where(eq(leadsTable.id, leadId))
      .returning();

    // 5. Handle state-specific side effects
    await this.handleStateTransitionSideEffects(
      leadId,
      teamId,
      currentState,
      newState,
    );

    this.logger.log(
      `Lead ${leadId} state transition: ${currentState} → ${newState} (by ${triggeredBy})`,
    );

    this.eventBus.publish(new LeadUpdated(updatedLead));

    return {
      lead: updatedLead,
      event,
      previousState: currentState,
      newState,
    };
  }

  /**
   * Handle side effects when state transitions occur
   */
  private async handleStateTransitionSideEffects(
    leadId: string,
    teamId: string,
    fromState: LeadState,
    toState: LeadState,
  ) {
    // Cancel any pending timers when lead moves to terminal state
    if (toState === "closed" || toState === "suppressed") {
      await this.cancelAllTimers(leadId, `Lead moved to ${toState}`);
    }

    // Set up timers when lead enters "touched" state
    if (toState === "touched" && fromState === "new") {
      await this.scheduleRetargetingTimers(leadId, teamId);
    }
  }

  /**
   * Schedule 7-day and 14-day retargeting timers
   */
  async scheduleRetargetingTimers(leadId: string, teamId: string) {
    const now = new Date();

    // 7-day timer
    const timer7d = new Date(now);
    timer7d.setDate(timer7d.getDate() + 7);

    // 14-day timer
    const timer14d = new Date(now);
    timer14d.setDate(timer14d.getDate() + 14);

    try {
      await this.db
        .insert(leadTimers)
        .values([
          {
            teamId,
            leadId,
            timerType: "TIMER_7D" as LeadTimerType,
            triggerAt: timer7d,
            action: "retarget",
            actionPayload: { templateRotation: false },
          },
          {
            teamId,
            leadId,
            timerType: "TIMER_14D" as LeadTimerType,
            triggerAt: timer14d,
            action: "escalate",
            actionPayload: { templateRotation: true },
          },
        ])
        .onConflictDoNothing(); // Ignore if timers already exist

      this.logger.log(`Scheduled retargeting timers for lead ${leadId}`);
    } catch (error) {
      this.logger.warn(
        `Failed to schedule timers for lead ${leadId}: ${error}`,
      );
    }
  }

  /**
   * Cancel all pending timers for a lead
   */
  async cancelAllTimers(leadId: string, reason: string) {
    await this.db
      .update(leadTimers)
      .set({
        cancelledAt: new Date(),
        cancelReason: reason,
      })
      .where(and(eq(leadTimers.leadId, leadId), isNull(leadTimers.executedAt)));

    this.logger.log(`Cancelled all timers for lead ${leadId}: ${reason}`);
  }

  /**
   * Move lead to retargeting state (called by 7D timer executor)
   * Transitions lead from "touched" to "retargeting" state
   */
  async moveToRetargeting(leadId: string) {
    const lead = await this.db.query.leads.findFirst({
      where: eq(leadsTable.id, leadId),
    });

    if (!lead) return;

    // Only retarget if still in "touched" state (no response yet)
    if (lead.leadState === "touched") {
      await this.updateLeadState(
        leadId,
        lead.teamId,
        "retargeting",
        "TIMER_7D",
        "timer",
        { reason: "7-day no response" },
      );
      this.logger.log(
        `Lead ${leadId} moved to retargeting after 7-day no response`,
      );
    }
  }

  /**
   * Rotate template for 14-day no-response leads (called by 14D timer executor)
   * Keeps lead in retargeting but triggers template rotation
   */
  async rotateTemplate(leadId: string) {
    const lead = await this.db.query.leads.findFirst({
      where: eq(leadsTable.id, leadId),
    });

    if (!lead) return;

    // Only escalate if in "touched" or "retargeting" state (no response yet)
    if (lead.leadState === "touched" || lead.leadState === "retargeting") {
      // If still in touched, move to retargeting first
      if (lead.leadState === "touched") {
        await this.updateLeadState(
          leadId,
          lead.teamId,
          "retargeting",
          "TIMER_14D",
          "timer",
          { reason: "14-day escalation", templateRotation: true },
        );
      }

      // Record template rotation event
      await this.db.insert(leadEvents).values({
        tenantId: lead.teamId,
        teamId: lead.teamId,
        leadId,
        eventType: "TIMER_14D",
        eventSource: "timer",
        payload: {
          action: "template_rotation",
          triggeredBy: "TIMER_14D",
        },
        processedAt: new Date(),
      });

      this.logger.log(
        `Template rotation triggered for lead ${leadId} after 14-day no response`,
      );
    }
  }

  /**
   * Get valid transitions for a given state
   */
  getValidTransitions(currentState: LeadState): LeadState[] {
    return VALID_STATE_TRANSITIONS[currentState] || [];
  }
}
