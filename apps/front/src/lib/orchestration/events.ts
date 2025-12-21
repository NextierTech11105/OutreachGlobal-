/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EVENT SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Unified event types for all ID-based operations across the platform.
 * Every action that changes state emits an event for observability.
 *
 * EVENT CATEGORIES:
 *   • DATA_INGEST   → USBizData imports, skip traces, validations
 *   • LEAD_LIFECYCLE → Lead qualification, status changes, conversions
 *   • CAMPAIGN      → SMS/Email campaigns, batches, delivery
 *   • CONVERSATION  → Messages, responses, agent handoffs
 *   • AGENT         → Agent activations, decisions, outcomes
 *   • PIPELINE      → Stage transitions, completions, failures
 *   • DEAL          → Proposals, bookings, engagements
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { nanoid } from "nanoid";

// ─────────────────────────────────────────────────────────────────────────────
// EVENT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type EventCategory =
  | "data_ingest"
  | "lead_lifecycle"
  | "campaign"
  | "conversation"
  | "agent"
  | "pipeline"
  | "deal"
  | "system";

export type EventType =
  // DATA INGEST EVENTS
  | "data.csv_loaded"
  | "data.record_parsed"
  | "data.apollo_validated"
  | "data.apollo_failed"
  | "data.skip_trace_started"
  | "data.skip_trace_completed"
  | "data.skip_trace_failed"
  | "data.twilio_verified"
  | "data.twilio_failed"
  | "data.phone_qualified"
  | "data.phone_disqualified"

  // LEAD LIFECYCLE EVENTS
  | "lead.created"
  | "lead.qualified"
  | "lead.enriched"
  | "lead.assigned"
  | "lead.contacted"
  | "lead.responded"
  | "lead.converted"
  | "lead.opted_out"
  | "lead.dead"
  | "lead.reactivated"
  | "lead.stage_changed"
  | "lead.score_updated"

  // CAMPAIGN EVENTS
  | "campaign.created"
  | "campaign.started"
  | "campaign.paused"
  | "campaign.resumed"
  | "campaign.completed"
  | "campaign.batch_queued"
  | "campaign.batch_sent"
  | "campaign.message_sent"
  | "campaign.message_delivered"
  | "campaign.message_failed"

  // CONVERSATION EVENTS
  | "conversation.started"
  | "conversation.message_received"
  | "conversation.message_sent"
  | "conversation.intent_detected"
  | "conversation.sentiment_analyzed"
  | "conversation.handoff_requested"
  | "conversation.handoff_completed"
  | "conversation.escalated"
  | "conversation.ended"

  // AGENT EVENTS
  | "agent.activated"
  | "agent.assigned"
  | "agent.processing"
  | "agent.decision_made"
  | "agent.action_taken"
  | "agent.handoff_initiated"
  | "agent.handoff_received"
  | "agent.completed"
  | "agent.error"
  | "agent.timeout"

  // PIPELINE EVENTS
  | "pipeline.started"
  | "pipeline.stage_entered"
  | "pipeline.stage_completed"
  | "pipeline.condition_evaluated"
  | "pipeline.transition"
  | "pipeline.paused"
  | "pipeline.resumed"
  | "pipeline.completed"
  | "pipeline.failed"
  | "pipeline.retry"

  // DEAL EVENTS
  | "deal.created"
  | "deal.proposal_sent"
  | "deal.proposal_viewed"
  | "deal.call_booked"
  | "deal.call_completed"
  | "deal.engagement_signed"
  | "deal.closed_won"
  | "deal.closed_lost"

  // SYSTEM EVENTS
  | "system.health_check"
  | "system.rate_limit_hit"
  | "system.error"
  | "system.alert";

// ─────────────────────────────────────────────────────────────────────────────
// EVENT STRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

export interface EventMetadata {
  eventId: string;
  timestamp: string;
  category: EventCategory;
  type: EventType;
  version: string;
  source: string;
  correlationId?: string; // Groups related events
  causationId?: string; // The event that caused this event
  sessionId?: string; // Conversation session
  traceId?: string; // Distributed tracing
  spanId?: string; // Span within trace
}

export interface EntityReference {
  entityType:
    | "record"
    | "lead"
    | "contact"
    | "deal"
    | "campaign"
    | "session"
    | "execution"
    | "agent";
  entityId: string;
}

export interface EventPayload {
  [key: string]: unknown;
}

export interface OrchestrationEvent<T extends EventPayload = EventPayload> {
  metadata: EventMetadata;
  entity: EntityReference;
  payload: T;
  context?: {
    agent?: "luci" | "gianna" | "cathy" | "sabrina" | "system";
    stage?: string;
    previousState?: string;
    newState?: string;
    trigger?: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SPECIFIC EVENT PAYLOADS
// ─────────────────────────────────────────────────────────────────────────────

export interface DataIngestPayload extends EventPayload {
  sectorPath?: string;
  fileName?: string;
  recordCount?: number;
  companyName?: string;
  contactName?: string;
  phone?: string;
  isValid?: boolean;
  validationScore?: number;
  disqualificationReason?: string;
}

export interface LeadLifecyclePayload extends EventPayload {
  leadId: string;
  stage?: string;
  previousStage?: string;
  score?: number;
  previousScore?: number;
  assignedTo?: string;
  reason?: string;
}

export interface CampaignPayload extends EventPayload {
  campaignId: string;
  campaignName?: string;
  batchId?: string;
  batchSize?: number;
  messageId?: string;
  recipientPhone?: string;
  status?: string;
  deliveredAt?: string;
}

export interface ConversationPayload extends EventPayload {
  sessionId: string;
  leadId: string;
  messageId?: string;
  direction: "inbound" | "outbound";
  content?: string;
  intent?: string;
  sentiment?: "positive" | "neutral" | "negative";
  handoffTo?: string;
  handoffFrom?: string;
}

export interface AgentPayload extends EventPayload {
  agentName: "luci" | "gianna" | "cathy" | "sabrina";
  action?: string;
  decision?: string;
  confidence?: number;
  reasoning?: string;
  duration?: number;
  tokensUsed?: number;
  cost?: number;
}

export interface PipelinePayload extends EventPayload {
  executionId: string;
  pipelineName: string;
  stage?: string;
  previousStage?: string;
  conditionId?: string;
  conditionResult?: boolean;
  progress?: number;
  error?: string;
}

export interface DealPayload extends EventPayload {
  dealId: string;
  leadId: string;
  stage: string;
  value?: number;
  probability?: number;
  closeDate?: string;
  assignedTo?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT FACTORY
// ─────────────────────────────────────────────────────────────────────────────

export class EventFactory {
  private static version = "1.0.0";
  private static source = "orchestration";

  static createEvent<T extends EventPayload>(
    type: EventType,
    entity: EntityReference,
    payload: T,
    context?: OrchestrationEvent["context"],
    correlationId?: string,
    causationId?: string,
  ): OrchestrationEvent<T> {
    const category = this.getCategory(type);

    return {
      metadata: {
        eventId: nanoid(),
        timestamp: new Date().toISOString(),
        category,
        type,
        version: this.version,
        source: this.source,
        correlationId,
        causationId,
        traceId: nanoid(),
        spanId: nanoid(8),
      },
      entity,
      payload,
      context,
    };
  }

  private static getCategory(type: EventType): EventCategory {
    const prefix = type.split(".")[0];
    const categoryMap: Record<string, EventCategory> = {
      data: "data_ingest",
      lead: "lead_lifecycle",
      campaign: "campaign",
      conversation: "conversation",
      agent: "agent",
      pipeline: "pipeline",
      deal: "deal",
      system: "system",
    };
    return categoryMap[prefix] || "system";
  }

  // Convenience methods for common events

  static leadCreated(
    leadId: string,
    data: Partial<LeadLifecyclePayload>,
  ): OrchestrationEvent<LeadLifecyclePayload> {
    return this.createEvent(
      "lead.created",
      { entityType: "lead", entityId: leadId },
      { leadId, ...data },
      { agent: "luci", newState: "new" },
    );
  }

  static leadStageChanged(
    leadId: string,
    previousStage: string,
    newStage: string,
    agent: OrchestrationEvent["context"]["agent"],
  ): OrchestrationEvent<LeadLifecyclePayload> {
    return this.createEvent(
      "lead.stage_changed",
      { entityType: "lead", entityId: leadId },
      { leadId, stage: newStage, previousStage },
      { agent, previousState: previousStage, newState: newStage },
    );
  }

  static messageReceived(
    sessionId: string,
    leadId: string,
    content: string,
    intent?: string,
  ): OrchestrationEvent<ConversationPayload> {
    return this.createEvent(
      "conversation.message_received",
      { entityType: "session", entityId: sessionId },
      { sessionId, leadId, direction: "inbound", content, intent },
      { trigger: "webhook" },
    );
  }

  static agentDecision(
    agentName: AgentPayload["agentName"],
    action: string,
    decision: string,
    confidence: number,
    correlationId?: string,
  ): OrchestrationEvent<AgentPayload> {
    return this.createEvent(
      "agent.decision_made",
      { entityType: "agent", entityId: agentName },
      { agentName, action, decision, confidence },
      { agent: agentName },
      correlationId,
    );
  }

  static pipelineStageEntered(
    executionId: string,
    pipelineName: string,
    stage: string,
    previousStage?: string,
  ): OrchestrationEvent<PipelinePayload> {
    return this.createEvent(
      "pipeline.stage_entered",
      { entityType: "execution", entityId: executionId },
      { executionId, pipelineName, stage, previousStage },
      { stage, previousState: previousStage, newState: stage },
    );
  }

  static dealCreated(
    dealId: string,
    leadId: string,
    value?: number,
  ): OrchestrationEvent<DealPayload> {
    return this.createEvent(
      "deal.created",
      { entityType: "deal", entityId: dealId },
      { dealId, leadId, stage: "opportunity", value },
      { newState: "opportunity" },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT BUS (In-Memory for now, can be replaced with Redis/Kafka)
// ─────────────────────────────────────────────────────────────────────────────

type EventHandler<T extends EventPayload = EventPayload> = (
  event: OrchestrationEvent<T>,
) => Promise<void> | void;

interface EventSubscription {
  id: string;
  type: EventType | "*";
  category?: EventCategory;
  handler: EventHandler;
}

class EventBus {
  private subscriptions: EventSubscription[] = [];
  private eventLog: OrchestrationEvent[] = [];
  private maxLogSize = 10000;

  subscribe<T extends EventPayload>(
    type: EventType | "*",
    handler: EventHandler<T>,
    category?: EventCategory,
  ): string {
    const id = nanoid();
    this.subscriptions.push({
      id,
      type,
      category,
      handler: handler as EventHandler,
    });
    return id;
  }

  unsubscribe(subscriptionId: string): void {
    this.subscriptions = this.subscriptions.filter(
      (s) => s.id !== subscriptionId,
    );
  }

  async emit<T extends EventPayload>(
    event: OrchestrationEvent<T>,
  ): Promise<void> {
    // Log the event
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxLogSize / 2);
    }

    // Find matching handlers
    const handlers = this.subscriptions.filter((sub) => {
      if (sub.type !== "*" && sub.type !== event.metadata.type) return false;
      if (sub.category && sub.category !== event.metadata.category)
        return false;
      return true;
    });

    // Execute handlers (fire-and-forget with error logging)
    await Promise.all(
      handlers.map(async (sub) => {
        try {
          await sub.handler(event);
        } catch (error) {
          console.error(
            `[EventBus] Handler error for ${event.metadata.type}:`,
            error,
          );
        }
      }),
    );
  }

  getRecentEvents(
    limit = 100,
    filters?: {
      type?: EventType;
      category?: EventCategory;
      entityType?: EntityReference["entityType"];
      entityId?: string;
      since?: string;
    },
  ): OrchestrationEvent[] {
    let events = [...this.eventLog];

    if (filters) {
      if (filters.type) {
        events = events.filter((e) => e.metadata.type === filters.type);
      }
      if (filters.category) {
        events = events.filter((e) => e.metadata.category === filters.category);
      }
      if (filters.entityType) {
        events = events.filter(
          (e) => e.entity.entityType === filters.entityType,
        );
      }
      if (filters.entityId) {
        events = events.filter((e) => e.entity.entityId === filters.entityId);
      }
      if (filters.since) {
        events = events.filter((e) => e.metadata.timestamp >= filters.since);
      }
    }

    return events.slice(-limit).reverse();
  }

  getEventsByCorrelation(correlationId: string): OrchestrationEvent[] {
    return this.eventLog.filter(
      (e) => e.metadata.correlationId === correlationId,
    );
  }

  getEventsByEntity(
    entityType: EntityReference["entityType"],
    entityId: string,
  ): OrchestrationEvent[] {
    return this.eventLog.filter(
      (e) =>
        e.entity.entityType === entityType && e.entity.entityId === entityId,
    );
  }
}

// Singleton instance
export const eventBus = new EventBus();
