/**
 * OUTBOUND GATE SERVICE
 * =====================
 * Centralized suppression check before any outbound communication.
 *
 * CRITICAL: This is the single point of enforcement for:
 * - Lead state suppression
 * - DNC/opt-out signals
 * - TCPA compliance
 *
 * Every SMS, call, and email MUST pass through this gate.
 */
import { Injectable, Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { eq, and, inArray, desc } from "drizzle-orm";
import { leads, leadSignals } from "@/database/schema";

export type BlockReason =
  | "lead_not_found"
  | "lead_suppressed"
  | "opted_out"
  | "do_not_contact"
  | "wrong_number"
  | "no_phone"
  | "no_email";

export interface OutboundCheckResult {
  allowed: boolean;
  reason?: BlockReason;
  leadId: string;
  leadState?: string;
  blockingSignal?: {
    type: string;
    createdAt: Date;
  };
}

export interface OutboundCheckOptions {
  /** Skip DNC signal check (OPTED_OUT, DO_NOT_CONTACT, WRONG_NUMBER). Default: false */
  skipDncCheck?: boolean;
  /** Skip suppressed state check. Default: false */
  skipSuppressionCheck?: boolean;
}

// Suppression signal types that block outbound
const SUPPRESSION_SIGNALS = [
  "OPTED_OUT",
  "DO_NOT_CONTACT",
  "WRONG_NUMBER",
] as const;

@Injectable()
export class OutboundGateService {
  private readonly logger = new Logger(OutboundGateService.name);

  constructor(@InjectDB() private db: DrizzleClient) {}

  /**
   * Check if outbound communication is allowed for a lead
   *
   * @param leadId - Lead ID to check
   * @param channel - Communication channel (sms, email, voice)
   * @param options - Optional settings to skip certain checks
   * @returns OutboundCheckResult with allowed status and reason if blocked
   */
  async canContact(
    leadId: string,
    channel: "sms" | "email" | "voice" = "sms",
    options: OutboundCheckOptions = {},
  ): Promise<OutboundCheckResult> {
    const { skipDncCheck = false, skipSuppressionCheck = false } = options;

    // 1. Get lead
    const lead = await this.db.query.leads.findFirst({
      where: eq(leads.id, leadId),
    });

    if (!lead) {
      this.logger.warn(`OutboundGate BLOCKED: Lead not found - ${leadId}`);
      return {
        allowed: false,
        reason: "lead_not_found",
        leadId,
      };
    }

    // 2. Check lead state (optional)
    if (!skipSuppressionCheck && lead.leadState === "suppressed") {
      this.logger.warn(
        `OutboundGate BLOCKED: Lead suppressed - ${leadId}`,
      );
      return {
        allowed: false,
        reason: "lead_suppressed",
        leadId,
        leadState: lead.leadState,
      };
    }

    // 3. Check for DNC signals (optional)
    if (!skipDncCheck) {
      const blockingSignal = await this.db.query.leadSignals.findFirst({
        where: and(
          eq(leadSignals.leadId, leadId),
          inArray(leadSignals.signalType, [...SUPPRESSION_SIGNALS]),
        ),
        orderBy: desc(leadSignals.createdAt),
      });

      if (blockingSignal) {
        const reason = this.signalToReason(blockingSignal.signalType);
        this.logger.warn(
          `OutboundGate BLOCKED: Signal ${blockingSignal.signalType} - ${leadId}`,
        );
        return {
          allowed: false,
          reason,
          leadId,
          leadState: lead.leadState ?? undefined,
          blockingSignal: {
            type: blockingSignal.signalType,
            createdAt: blockingSignal.createdAt,
          },
        };
      }
    }

    // 4. Channel-specific checks (always required)
    if ((channel === "sms" || channel === "voice") && !lead.phone) {
      return {
        allowed: false,
        reason: "no_phone",
        leadId,
        leadState: lead.leadState ?? undefined,
      };
    }

    if (channel === "email" && !lead.email) {
      return {
        allowed: false,
        reason: "no_email",
        leadId,
        leadState: lead.leadState ?? undefined,
      };
    }

    // 5. All checks passed
    return {
      allowed: true,
      leadId,
      leadState: lead.leadState ?? undefined,
    };
  }

  /**
   * Batch check multiple leads (for campaign enrollment)
   */
  async canContactBatch(
    leadIds: string[],
    channel: "sms" | "email" | "voice" = "sms",
  ): Promise<Map<string, OutboundCheckResult>> {
    const results = new Map<string, OutboundCheckResult>();

    // Parallelize checks
    const checks = await Promise.all(
      leadIds.map((id) => this.canContact(id, channel)),
    );

    for (let i = 0; i < leadIds.length; i++) {
      results.set(leadIds[i], checks[i]);
    }

    return results;
  }

  /**
   * Assert that contact is allowed, throw if not
   */
  async assertCanContact(
    leadId: string,
    channel: "sms" | "email" | "voice" = "sms",
  ): Promise<void> {
    const result = await this.canContact(leadId, channel);
    if (!result.allowed) {
      throw new OutboundBlockedError(result);
    }
  }

  /**
   * Filter a list of lead IDs to only those that can be contacted
   */
  async filterContactable(
    leadIds: string[],
    channel: "sms" | "email" | "voice" = "sms",
  ): Promise<string[]> {
    const results = await this.canContactBatch(leadIds, channel);
    return leadIds.filter((id) => results.get(id)?.allowed === true);
  }

  private signalToReason(signalType: string): BlockReason {
    switch (signalType) {
      case "OPTED_OUT":
        return "opted_out";
      case "DO_NOT_CONTACT":
        return "do_not_contact";
      case "WRONG_NUMBER":
        return "wrong_number";
      default:
        return "do_not_contact";
    }
  }
}

/**
 * Error thrown when outbound contact is blocked
 */
export class OutboundBlockedError extends Error {
  constructor(public readonly result: OutboundCheckResult) {
    super(`Outbound blocked for lead ${result.leadId}: ${result.reason}`);
    this.name = "OutboundBlockedError";
  }
}
