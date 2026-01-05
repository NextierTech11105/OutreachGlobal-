import { Injectable, Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { eq, and, desc, sql } from "drizzle-orm";
import { leadsTable } from "@/database/schema-alias";
import {
  leadEvents,
  LeadEventType,
  LeadState,
  NewLeadEvent,
  LeadEvent,
  VALID_STATE_TRANSITIONS,
  isValidTransition,
  generateEventDedupeKey,
} from "@/database/schema/canonical-lead-state.schema";

// Event payloads for specific event types
export interface SmsEventPayload {
  messageId: string;
  messageContent: string;
  fromPhone: string;
  toPhone: string;
  direction: "inbound" | "outbound";
  worker?: string;
  campaignId?: string;
}

export interface EmailCapturedPayload {
  extractedEmail: string;
  source: "sms" | "email" | "form";
  confidence?: number;
}

export interface IntentPayload {
  intent: string;
  confidence: number;
  keywords?: string[];
}

export interface TimerPayload {
  timerType: "TIMER_7D" | "TIMER_14D" | "TIMER_30D";
  action: string;
  result?: string;
}

export interface StateChangeContext {
  triggeredBy: string;
  eventSource: string;
  reason?: string;
  payload?: Record<string, unknown>;
}

@Injectable()
export class LeadEventService {
  private readonly logger = new Logger(LeadEventService.name);

  constructor(@InjectDB() private db: DrizzleClient) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT RECORDING - Immutable append-only event log
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Record a new lead event with deduplication
   */
  async recordEvent(
    event: Omit<NewLeadEvent, "id" | "createdAt" | "processedAt">,
  ): Promise<LeadEvent | null> {
    try {
      // Generate dedupe key if not provided
      const dedupeKey =
        event.dedupeKey ||
        generateEventDedupeKey(
          event.leadId,
          event.eventType as LeadEventType,
          event.payload?.messageId as string | undefined,
        );

      const [recorded] = await this.db
        .insert(leadEvents)
        .values({
          ...event,
          dedupeKey,
          processedAt: new Date(),
        })
        .onConflictDoNothing({ target: leadEvents.dedupeKey })
        .returning();

      if (recorded) {
        this.logger.log(
          `Event recorded: ${event.eventType} for lead ${event.leadId}`,
        );
      } else {
        this.logger.debug(`Duplicate event skipped: ${dedupeKey}`);
      }

      return recorded || null;
    } catch (error) {
      this.logger.error(`Failed to record event: ${error}`);
      throw error;
    }
  }

  /**
   * Record SMS sent event
   */
  async recordSmsSent(
    teamId: string,
    leadId: string,
    payload: SmsEventPayload,
  ): Promise<LeadEvent | null> {
    const lead = await this.db.query.leads.findFirst({
      where: eq(leadsTable.id, leadId),
    });

    const currentState = (lead?.leadState as LeadState) || "new";
    const newState = currentState === "new" ? "touched" : currentState;

    return this.recordEvent({
      tenantId: teamId,
      teamId,
      leadId,
      eventType: "SMS_SENT",
      eventSource: payload.worker || "system",
      previousState: currentState,
      newState: newState !== currentState ? newState : undefined,
      payload: {
        ...payload,
        direction: "outbound",
      },
    });
  }

  /**
   * Record SMS received event
   */
  async recordSmsReceived(
    teamId: string,
    leadId: string,
    payload: SmsEventPayload,
  ): Promise<LeadEvent | null> {
    const lead = await this.db.query.leads.findFirst({
      where: eq(leadsTable.id, leadId),
    });

    const currentState = (lead?.leadState as LeadState) || "new";
    // Inbound SMS transitions from touched/retargeting to responded
    const newState =
      currentState === "touched" || currentState === "retargeting"
        ? "responded"
        : currentState;

    return this.recordEvent({
      tenantId: teamId,
      teamId,
      leadId,
      eventType: "SMS_RECEIVED",
      eventSource: "signalhouse",
      previousState: currentState,
      newState: newState !== currentState ? newState : undefined,
      payload: {
        ...payload,
        direction: "inbound",
      },
    });
  }

  /**
   * Record email captured event
   */
  async recordEmailCaptured(
    teamId: string,
    leadId: string,
    payload: EmailCapturedPayload,
  ): Promise<LeadEvent | null> {
    const lead = await this.db.query.leads.findFirst({
      where: eq(leadsTable.id, leadId),
    });

    const currentState = (lead?.leadState as LeadState) || "new";
    // Email captured can transition from responded or soft_interest
    let newState: LeadState | undefined;
    if (currentState === "responded" || currentState === "soft_interest") {
      newState = "email_captured";
    }

    return this.recordEvent({
      tenantId: teamId,
      teamId,
      leadId,
      eventType: "EMAIL_CAPTURED",
      eventSource: payload.source,
      previousState: currentState,
      newState,
      payload: {
        extractedEmail: payload.extractedEmail,
        confidence: payload.confidence,
      },
    });
  }

  /**
   * Record high intent detection
   */
  async recordHighIntent(
    teamId: string,
    leadId: string,
    payload: IntentPayload,
  ): Promise<LeadEvent | null> {
    return this.recordEvent({
      tenantId: teamId,
      teamId,
      leadId,
      eventType: "HIGH_INTENT_DETECTED",
      eventSource: "ai_classification",
      payload: {
        intent: payload.intent,
        confidence: payload.confidence,
        keywords: payload.keywords,
      },
    });
  }

  /**
   * Record timer event
   */
  async recordTimerEvent(
    teamId: string,
    leadId: string,
    payload: TimerPayload,
  ): Promise<LeadEvent | null> {
    return this.recordEvent({
      tenantId: teamId,
      teamId,
      leadId,
      eventType: payload.timerType as LeadEventType,
      eventSource: "timer",
      payload: {
        action: payload.action,
        result: payload.result,
      },
    });
  }

  /**
   * Record opt-out/suppression event
   */
  async recordOptOut(
    teamId: string,
    leadId: string,
    reason: string,
  ): Promise<LeadEvent | null> {
    const lead = await this.db.query.leads.findFirst({
      where: eq(leadsTable.id, leadId),
    });

    const currentState = (lead?.leadState as LeadState) || "new";

    return this.recordEvent({
      tenantId: teamId,
      teamId,
      leadId,
      eventType: "OPT_OUT",
      eventSource: "system",
      previousState: currentState,
      newState: "suppressed",
      payload: {
        reason,
        previousState: currentState,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT QUERYING - Retrieve event history
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get all events for a lead
   */
  async getLeadEvents(
    leadId: string,
    options?: {
      limit?: number;
      offset?: number;
      eventTypes?: LeadEventType[];
    },
  ): Promise<LeadEvent[]> {
    let query = this.db
      .select()
      .from(leadEvents)
      .where(eq(leadEvents.leadId, leadId))
      .orderBy(desc(leadEvents.createdAt))
      .$dynamic();

    if (options?.eventTypes?.length) {
      query = query.where(
        and(
          eq(leadEvents.leadId, leadId),
          sql`${leadEvents.eventType} = ANY(${options.eventTypes})`,
        ),
      );
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.offset(options.offset);
    }

    return query;
  }

  /**
   * Get state transition history for a lead
   */
  async getStateHistory(leadId: string): Promise<
    Array<{
      previousState: LeadState | null;
      newState: LeadState | null;
      eventType: LeadEventType;
      timestamp: Date;
      triggeredBy: string;
    }>
  > {
    const events = await this.db
      .select({
        previousState: leadEvents.previousState,
        newState: leadEvents.newState,
        eventType: leadEvents.eventType,
        timestamp: leadEvents.createdAt,
        eventSource: leadEvents.eventSource,
      })
      .from(leadEvents)
      .where(
        and(
          eq(leadEvents.leadId, leadId),
          sql`${leadEvents.newState} IS NOT NULL`,
        ),
      )
      .orderBy(desc(leadEvents.createdAt));

    return events.map((e) => ({
      previousState: e.previousState as LeadState | null,
      newState: e.newState as LeadState | null,
      eventType: e.eventType as LeadEventType,
      timestamp: e.timestamp,
      triggeredBy: e.eventSource,
    }));
  }

  /**
   * Get the last N events for a lead
   */
  async getRecentEvents(
    leadId: string,
    count: number = 10,
  ): Promise<LeadEvent[]> {
    return this.db
      .select()
      .from(leadEvents)
      .where(eq(leadEvents.leadId, leadId))
      .orderBy(desc(leadEvents.createdAt))
      .limit(count);
  }

  /**
   * Get event counts by type for a team
   */
  async getEventStats(
    teamId: string,
    since?: Date,
  ): Promise<Record<string, number>> {
    const result = await this.db
      .select({
        eventType: leadEvents.eventType,
        count: sql<number>`count(*)::int`,
      })
      .from(leadEvents)
      .where(
        since
          ? and(
              eq(leadEvents.teamId, teamId),
              sql`${leadEvents.createdAt} >= ${since}`,
            )
          : eq(leadEvents.teamId, teamId),
      )
      .groupBy(leadEvents.eventType);

    return result.reduce(
      (acc, row) => {
        acc[row.eventType] = row.count;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE RECONSTRUCTION - Replay events to reconstruct state
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Reconstruct lead state from event history
   * Useful for debugging and verification
   */
  async reconstructState(leadId: string): Promise<{
    currentState: LeadState;
    eventCount: number;
    lastEventAt: Date | null;
    stateTransitions: number;
  }> {
    const events = await this.db
      .select()
      .from(leadEvents)
      .where(eq(leadEvents.leadId, leadId))
      .orderBy(leadEvents.createdAt);

    let currentState: LeadState = "new";
    let stateTransitions = 0;
    let lastEventAt: Date | null = null;

    for (const event of events) {
      if (event.newState) {
        currentState = event.newState as LeadState;
        stateTransitions++;
      }
      lastEventAt = event.createdAt;
    }

    return {
      currentState,
      eventCount: events.length,
      lastEventAt,
      stateTransitions,
    };
  }

  /**
   * Verify lead state matches event history
   * Returns discrepancies if any
   */
  async verifyLeadState(leadId: string): Promise<{
    isValid: boolean;
    currentDbState: LeadState | null;
    reconstructedState: LeadState;
    discrepancy?: string;
  }> {
    const lead = await this.db.query.leads.findFirst({
      where: eq(leadsTable.id, leadId),
    });

    const { currentState: reconstructedState } =
      await this.reconstructState(leadId);

    const currentDbState = (lead?.leadState as LeadState) || null;
    const isValid = currentDbState === reconstructedState;

    return {
      isValid,
      currentDbState,
      reconstructedState,
      discrepancy: isValid
        ? undefined
        : `DB state is '${currentDbState}' but event history shows '${reconstructedState}'`,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIT & COMPLIANCE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get full audit trail for compliance
   */
  async getAuditTrail(leadId: string): Promise<
    Array<{
      timestamp: Date;
      eventType: string;
      source: string;
      stateChange: string | null;
      details: Record<string, unknown>;
    }>
  > {
    const events = await this.getLeadEvents(leadId);

    return events.map((event) => ({
      timestamp: event.createdAt,
      eventType: event.eventType,
      source: event.eventSource,
      stateChange:
        event.previousState && event.newState
          ? `${event.previousState} → ${event.newState}`
          : null,
      details: (event.payload as Record<string, unknown>) || {},
    }));
  }

  /**
   * Export events for compliance reporting
   */
  async exportTeamEvents(
    teamId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<LeadEvent[]> {
    return this.db
      .select()
      .from(leadEvents)
      .where(
        and(
          eq(leadEvents.teamId, teamId),
          sql`${leadEvents.createdAt} >= ${startDate}`,
          sql`${leadEvents.createdAt} <= ${endDate}`,
        ),
      )
      .orderBy(leadEvents.createdAt);
  }
}
