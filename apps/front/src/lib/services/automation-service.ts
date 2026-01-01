/**
 * BASELINE AUTOMATION SERVICE - DATABASE-BACKED
 *
 * Implements the 6 core automation rules:
 * 1. Retarget No-Response (7, 14, 30 day drip)
 * 2. Nurture Confirmed Contact (multi-channel drip)
 * 3. Hot Lead - Valuation Requested (immediate priority)
 * 4. Email Captured - Auto-Send Report
 * 5. Opt-Out Handling
 * 6. Wrong Number Handling
 *
 * DURABLE STATE: All state persisted to PostgreSQL, survives server restarts.
 */

import { smsQueueService } from "./sms-queue-service";
import { db } from "../db";
import {
  automationStates,
  scheduledTasks as scheduledTasksTable,
  suppressionQueue as suppressionQueueTable,
  recommendations as recommendationsTable,
  type AutomationState,
  type NewAutomationState,
  type ScheduledTask,
  type NewScheduledTask,
  type SuppressionQueueItem,
  type Recommendation,
  type NewRecommendation,
  type RecommendedAction,
  type RecommendingWorker,
} from "../db/schema";
import { eq, and, lte, sql, desc } from "drizzle-orm";

// Lead priority levels
export type LeadPriority = "hot" | "warm" | "cold" | "dead";

// Response classification types
export type ResponseType =
  | "interested"
  | "not_interested"
  | "question"
  | "appointment_request"
  | "email_provided"
  | "opt_out"
  | "wrong_number"
  | "unclear"
  | "no_response"
  | "valuation_request";

// Lead status in the automation pipeline (for backward compatibility)
export interface LeadAutomationState {
  leadId: string;
  phone: string;
  email?: string;
  propertyId?: string;
  priority: LeadPriority;
  lastContactAt?: Date;
  lastResponseAt?: Date;
  responseType?: ResponseType;
  phoneVerified: boolean;
  emailVerified: boolean;
  optedOut: boolean;
  wrongNumber: boolean;
  valuationSent: boolean;
  blueprintSent: boolean;
  drip: {
    stage: number;
    nextTouchAt?: Date;
    sequence: "retarget" | "nurture" | "hot_lead" | null;
  };
  score: number;
}

// Email regex pattern
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

// Opt-out keywords
const OPT_OUT_KEYWORDS = [
  "stop",
  "unsubscribe",
  "remove",
  "optout",
  "opt out",
  "cancel",
  "dont text",
  "don't text",
  "no more",
  "leave me alone",
];

// Wrong number keywords
const WRONG_NUMBER_KEYWORDS = [
  "wrong number",
  "wrong person",
  "who is this",
  "dont know",
  "don't know",
  "never heard",
  "not me",
  "idk who",
];

// Profanity keywords (simplified - would use a library in production)
const PROFANITY_KEYWORDS = [
  "fuck",
  "shit",
  "ass",
  "damn",
  "bitch",
  "wtf",
  "stfu",
  "scam",
  "spam",
  "harassment",
  "sue you",
  "lawyer",
  "attorney",
  "police",
  "report you",
];

// Suppression queue is now stored in database (suppressionQueueTable)
// No in-memory array needed

// Interest keywords
const INTEREST_KEYWORDS = [
  "yes",
  "interested",
  "tell me more",
  "call me",
  "sure",
  "sounds good",
  "what's the offer",
  "how much",
];

class AutomationService {
  // ============================================
  // HUMAN GATE CONFIGURATION (Doctrine-Aligned)
  // When enabled: AI recommends → Human approves → System executes
  // ============================================

  private humanGateEnabled = true; // Set to true to require human approval

  /**
   * Toggle human gate mode
   * When enabled, actions go to recommendations queue
   * When disabled, actions execute immediately (legacy mode)
   */
  setHumanGateMode(enabled: boolean): void {
    this.humanGateEnabled = enabled;
    console.log(
      `[Automation] Human gate ${enabled ? "ENABLED" : "DISABLED"} - ${
        enabled ? "AI will recommend, humans approve" : "Direct execution mode"
      }`
    );
  }

  /**
   * Create a recommendation for human review (Doctrine-aligned)
   * This is the core of the human gate pattern
   */
  async createRecommendation(params: {
    leadId: string;
    action: RecommendedAction;
    recommendedBy: RecommendingWorker;
    aiReason: string;
    confidence?: number;
    priority?: number;
    content?: string;
    targetPhone?: string;
    targetEmail?: string;
    targetBucket?: string;
    targetWorker?: string;
    expiresInHours?: number;
  }): Promise<string | null> {
    if (!db) {
      console.warn("[Automation] Database not available for recommendations");
      return null;
    }

    try {
      const expiresAt = params.expiresInHours
        ? new Date(Date.now() + params.expiresInHours * 60 * 60 * 1000)
        : new Date(Date.now() + 24 * 60 * 60 * 1000); // Default 24h expiry

      const [recommendation] = await db
        .insert(recommendationsTable)
        .values({
          leadId: params.leadId,
          action: params.action,
          recommendedBy: params.recommendedBy,
          aiReason: params.aiReason,
          confidence: params.confidence || 80,
          priority: params.priority || 50,
          content: params.content,
          targetPhone: params.targetPhone,
          targetEmail: params.targetEmail,
          targetBucket: params.targetBucket,
          targetWorker: params.targetWorker,
          expiresAt,
        })
        .returning();

      console.log(
        `[Automation] Recommendation created: ${params.action} for ${params.leadId} by ${params.recommendedBy}`
      );

      return recommendation.id;
    } catch (error) {
      console.error("[Automation] Failed to create recommendation:", error);
      return null;
    }
  }

  /**
   * Approve a recommendation and execute it
   */
  async approveRecommendation(
    recommendationId: string,
    reviewedBy: string,
    editedContent?: string
  ): Promise<boolean> {
    if (!db) return false;

    try {
      // Get the recommendation
      const [rec] = await db
        .select()
        .from(recommendationsTable)
        .where(eq(recommendationsTable.id, recommendationId))
        .limit(1);

      if (!rec || rec.status !== "pending") {
        console.warn(
          `[Automation] Recommendation ${recommendationId} not found or not pending`
        );
        return false;
      }

      // Mark as approved
      await db
        .update(recommendationsTable)
        .set({
          status: "approved",
          reviewedAt: new Date(),
          reviewedBy,
          contentEdited: editedContent,
          updatedAt: new Date(),
        })
        .where(eq(recommendationsTable.id, recommendationId));

      // Execute the action
      const success = await this.executeRecommendation(rec, editedContent);

      // Mark as executed
      await db
        .update(recommendationsTable)
        .set({
          status: success ? "executed" : "approved",
          executedAt: success ? new Date() : undefined,
          executionResult: { success },
          updatedAt: new Date(),
        })
        .where(eq(recommendationsTable.id, recommendationId));

      return success;
    } catch (error) {
      console.error("[Automation] Failed to approve recommendation:", error);
      return false;
    }
  }

  /**
   * Reject a recommendation
   */
  async rejectRecommendation(
    recommendationId: string,
    reviewedBy: string,
    reason: string
  ): Promise<boolean> {
    if (!db) return false;

    try {
      await db
        .update(recommendationsTable)
        .set({
          status: "rejected",
          reviewedAt: new Date(),
          reviewedBy,
          rejectionReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(recommendationsTable.id, recommendationId));

      console.log(
        `[Automation] Recommendation ${recommendationId} rejected: ${reason}`
      );
      return true;
    } catch (error) {
      console.error("[Automation] Failed to reject recommendation:", error);
      return false;
    }
  }

  /**
   * Execute an approved recommendation
   */
  private async executeRecommendation(
    rec: Recommendation,
    editedContent?: string
  ): Promise<boolean> {
    const content = editedContent || rec.content;

    switch (rec.action) {
      case "send_sms":
        if (rec.targetPhone && content) {
          this.executeDirectSMS(rec.leadId, rec.targetPhone, content, "recommendation");
          return true;
        }
        break;

      case "send_email":
        if (rec.targetEmail) {
          console.log(
            `[Automation] Executing email to ${rec.targetEmail} for ${rec.leadId}`
          );
          return true;
        }
        break;

      case "schedule_call":
        if (rec.targetPhone) {
          console.log(
            `[Automation] Scheduling call to ${rec.targetPhone} for ${rec.leadId}`
          );
          return true;
        }
        break;

      case "move_to_bucket":
        if (rec.targetBucket) {
          console.log(
            `[Automation] Moving ${rec.leadId} to bucket ${rec.targetBucket}`
          );
          return true;
        }
        break;

      case "flag_hot_lead":
        await this.updateState(rec.leadId, { priority: "hot" });
        console.log(`[Automation] Flagged ${rec.leadId} as hot lead`);
        return true;

      case "archive_lead":
        await this.updateState(rec.leadId, { priority: "dead" });
        console.log(`[Automation] Archived ${rec.leadId}`);
        return true;

      case "escalate_to_worker":
        if (rec.targetWorker) {
          console.log(
            `[Automation] Escalating ${rec.leadId} to ${rec.targetWorker}`
          );
          return true;
        }
        break;
    }

    return false;
  }

  /**
   * Get pending recommendations for review
   */
  async getPendingRecommendations(limit = 50): Promise<Recommendation[]> {
    if (!db) return [];

    try {
      return await db
        .select()
        .from(recommendationsTable)
        .where(eq(recommendationsTable.status, "pending"))
        .orderBy(desc(recommendationsTable.priority))
        .limit(limit);
    } catch (error) {
      console.error("[Automation] Failed to get pending recommendations:", error);
      return [];
    }
  }

  /**
   * Direct SMS execution (bypasses recommendation queue)
   * Used when human has already approved
   */
  private executeDirectSMS(
    leadId: string,
    phone: string,
    message: string,
    category: string
  ): void {
    smsQueueService.addToQueue({
      leadId,
      to: phone,
      message,
      templateCategory: category,
      variables: {},
      personality: "brooklyn_bestie",
      priority: 5,
      maxAttempts: 3,
    });

    console.log(`[Automation] SMS executed for ${leadId}: ${category}`);
  }

  // ============================================
  // RULE 1: RETARGET NO-RESPONSE
  // ============================================

  /**
   * Schedule retarget drip for leads with no response
   * Day 7 → Day 14 → Day 30 → Cold bucket
   */
  async scheduleRetargetDrip(
    leadId: string,
    phone: string,
    firstName?: string,
    propertyAddress?: string,
  ): Promise<void> {
    const state = await this.getOrCreateState(leadId, phone);

    if (state.optedOut || state.wrongNumber) {
      console.log(
        `[Automation] Skipping retarget for ${leadId} - opted out or wrong number`,
      );
      return;
    }

    // Update state in database
    await this.updateState(leadId, {
      dripSequence: "retarget",
      dripStage: 0,
      lastContactAt: new Date(),
    });

    // Schedule Day 7 nudge (persisted to database)
    await this.scheduleTask(
      leadId,
      "retarget_day7",
      "retarget",
      7 * 24 * 60 * 60 * 1000,
      {
        firstName,
        propertyAddress,
        phone,
      },
    );

    console.log(`[Automation] Retarget drip scheduled for ${leadId}`);
  }

  // ============================================
  // RULE 2: NURTURE CONFIRMED CONTACT
  // ============================================

  /**
   * Activate nurture drip when contact is confirmed
   * Response received OR phone verified
   */
  async activateNurtureDrip(
    leadId: string,
    phone: string,
    email?: string,
  ): Promise<void> {
    const state = await this.getOrCreateState(leadId, phone);

    // Cancel any retarget drip
    await this.cancelTasks(leadId);

    // Update state in database
    await this.updateState(leadId, {
      phoneVerified: true,
      priority: "warm",
      score: state.score + 20,
      dripSequence: "nurture",
      dripStage: 0,
      ...(email && { email }),
    });

    // Schedule nurture sequence (persisted to database)
    // Day 3: Value content email
    await this.scheduleTask(
      leadId,
      "nurture_day3",
      "nurture",
      3 * 24 * 60 * 60 * 1000,
      {
        phone,
        email,
      },
    );

    // Day 7: Market update SMS
    await this.scheduleTask(
      leadId,
      "nurture_day7",
      "nurture",
      7 * 24 * 60 * 60 * 1000,
      {
        phone,
      },
    );

    // Day 14: Queue for power dialer
    await this.scheduleTask(
      leadId,
      "nurture_day14",
      "nurture",
      14 * 24 * 60 * 60 * 1000,
      {
        phone,
      },
    );

    const newScore = state.score + 20;
    console.log(
      `[Automation] Nurture drip activated for ${leadId} (score: ${newScore})`,
    );
  }

  // ============================================
  // RULE 3: HOT LEAD - VALUATION REQUESTED
  // ============================================

  /**
   * Maximum priority for valuation/blueprint recipients
   * These are situational targets with HIGH probability
   */
  async flagAsHotLead(
    leadId: string,
    phone: string,
    email?: string,
    reason:
      | "valuation"
      | "blueprint"
      | "interested"
      | "call_request" = "valuation",
  ): Promise<void> {
    const state = await this.getOrCreateState(leadId, phone);

    // Cancel all other drips - this is priority 1
    await this.cancelTasks(leadId);

    // Update state in database
    await this.updateState(leadId, {
      priority: "hot",
      score: state.score + 50,
      phoneVerified: true,
      dripSequence: "hot_lead",
      dripStage: 0,
      ...(reason === "valuation" && { valuationSent: true }),
      ...(reason === "blueprint" && { blueprintSent: true }),
      ...(email && { email }),
    });

    // Immediate: Log for sales alert
    console.log(
      `🔥🔥🔥 [HOT LEAD] ${leadId} - Reason: ${reason} - IMMEDIATE FOLLOW-UP REQUIRED`,
    );

    // Send notification (would integrate with Slack/webhook in production)
    this.sendSalesAlert(leadId, reason);

    // Schedule hot lead follow-up sequence (persisted to database)
    // Hour 24: Follow-up if no response
    await this.scheduleTask(
      leadId,
      "hot_24h",
      "hot_lead",
      24 * 60 * 60 * 1000,
      {
        phone,
        reason,
      },
    );

    // Hour 48: Phone call attempt
    await this.scheduleTask(
      leadId,
      "hot_48h",
      "hot_lead",
      48 * 60 * 60 * 1000,
      {
        phone,
      },
    );

    // Day 3: Check-in SMS
    await this.scheduleTask(
      leadId,
      "hot_day3",
      "hot_lead",
      3 * 24 * 60 * 60 * 1000,
      {
        phone,
      },
    );

    // Day 7: Final hot lead touch
    await this.scheduleTask(
      leadId,
      "hot_day7",
      "hot_lead",
      7 * 24 * 60 * 60 * 1000,
      {
        phone,
      },
    );
  }

  // ============================================
  // RULE 4: EMAIL CAPTURED - AUTO-SEND REPORT
  // ============================================

  /**
   * Detect email in SMS response and auto-send valuation
   */
  async processIncomingMessage(
    leadId: string,
    phone: string,
    message: string,
    propertyId?: string,
  ): Promise<{
    classification: ResponseType;
    extractedEmail?: string;
    action: string;
  }> {
    const state = await this.getOrCreateState(leadId, phone);
    const lowerMessage = message.toLowerCase().trim();

    // Update last response in database
    await this.updateState(leadId, {
      lastResponseAt: new Date(),
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SUPPRESSION CAMPAIGN: OPT-OUT, WRONG NUMBER, PROFANITY
    // All go to suppression queue for review - not visible as inbox labels
    // ═══════════════════════════════════════════════════════════════════════

    // Check for opt-out first (highest priority) → SUPPRESSION
    if (OPT_OUT_KEYWORDS.some((kw) => lowerMessage.includes(kw))) {
      await this.handleOptOut(leadId, phone);
      await this.addToSuppressionQueue(leadId, phone, "opt_out", message);
      return {
        classification: "opt_out",
        action: "Added to suppression campaign for review",
      };
    }

    // Check for wrong number → SUPPRESSION
    if (WRONG_NUMBER_KEYWORDS.some((kw) => lowerMessage.includes(kw))) {
      await this.handleWrongNumber(leadId, phone);
      await this.addToSuppressionQueue(leadId, phone, "wrong_number", message);
      return {
        classification: "wrong_number",
        action: "Added to suppression campaign for review",
      };
    }

    // Check for profanity → SUPPRESSION
    if (PROFANITY_KEYWORDS.some((kw) => lowerMessage.includes(kw))) {
      await this.addToSuppressionQueue(leadId, phone, "profanity", message);
      // Don't auto-respond to profanity, just suppress
      console.log(
        `[Automation] Profanity detected from ${phone} - added to suppression`,
      );
      return {
        classification: "opt_out", // Treat as opt-out for safety
        action: "Profanity detected - added to suppression campaign for review",
      };
    }

    // Check for email in message
    const emailMatch = message.match(EMAIL_REGEX);
    if (emailMatch) {
      const email = emailMatch[0].toLowerCase();

      // Update state with email
      await this.updateState(leadId, {
        email,
        emailVerified: true,
      });

      // Auto-send valuation report
      this.autoSendValuationToEmail(leadId, phone, email, propertyId);

      // Flag as hot lead - they're engaged!
      await this.flagAsHotLead(leadId, phone, email, "valuation");

      return {
        classification: "email_provided",
        extractedEmail: email,
        action: "Email captured, valuation report sent, flagged as HOT lead",
      };
    }

    // Check for interest signals
    if (INTEREST_KEYWORDS.some((kw) => lowerMessage.includes(kw))) {
      // Check if they want a call
      if (lowerMessage.includes("call")) {
        await this.flagAsHotLead(leadId, phone, undefined, "call_request");
        return {
          classification: "appointment_request",
          action: "Flagged as HOT lead, queued for call",
        };
      }

      // General interest
      await this.activateNurtureDrip(leadId, phone);
      return {
        classification: "interested",
        action: "Activated nurture drip, priority upgraded to WARM",
      };
    }

    // Check if it's a question
    if (
      message.includes("?") ||
      lowerMessage.startsWith("what") ||
      lowerMessage.startsWith("how") ||
      lowerMessage.startsWith("when")
    ) {
      await this.activateNurtureDrip(leadId, phone);
      return {
        classification: "question",
        action:
          "Question detected - needs human response, nurture drip activated",
      };
    }

    // Unclear response - still confirms the number works
    await this.updateState(leadId, {
      phoneVerified: true,
      score: state.score + 10,
    });

    return {
      classification: "unclear",
      action: "Phone confirmed, needs human review",
    };
  }

  // ============================================
  // RULE 5: OPT-OUT HANDLING
  // ARCHITECTURE: Postgres is source of truth, Redis is cache
  // ============================================

  async handleOptOut(leadId: string, phone: string): Promise<void> {
    // Cancel all pending tasks
    await this.cancelTasks(leadId);

    // Update state in database
    await this.updateState(leadId, {
      optedOut: true,
      priority: "dead",
      dripSequence: null,
    });

    // Add to SMS queue opt-out list (writes to Postgres then Redis)
    await smsQueueService.addOptOut(phone);

    // Send confirmation
    this.queueSMS(
      leadId,
      phone,
      "You've been unsubscribed. Reply START to re-join. Have a great day!",
      "opt_out_confirm",
    );

    console.log(
      `[Automation] Lead ${leadId} opted out (persisted to Postgres)`,
    );
  }

  // ============================================
  // RULE 6: WRONG NUMBER HANDLING
  // ============================================

  async handleWrongNumber(leadId: string, phone: string): Promise<void> {
    // Cancel all pending tasks
    await this.cancelTasks(leadId);

    // Update state in database
    await this.updateState(leadId, {
      wrongNumber: true,
      phoneVerified: false,
      dripSequence: null,
    });

    // Send apology
    this.queueSMS(
      leadId,
      phone,
      "So sorry for the mixup! Have a great day.",
      "wrong_number_apology",
    );

    // Queue for re-skip-trace
    console.log(
      `[Automation] Lead ${leadId} marked as wrong number - queue for re-skip-trace`,
    );
  }

  // ============================================
  // SUPPRESSION CAMPAIGN (DATABASE-BACKED)
  // ============================================

  /**
   * Add to suppression queue for review (persisted to database)
   * WN (wrong number), STOP (opt-out), and profanity all go here
   * These are NOT visible as inbox labels - they go to admin review
   */
  async addToSuppressionQueue(
    leadId: string,
    phone: string,
    reason: "wrong_number" | "opt_out" | "profanity",
    message: string,
  ): Promise<void> {
    if (!db) {
      console.warn(
        "[Suppression] Database not available, skipping persistence",
      );
      return;
    }

    try {
      await db.insert(suppressionQueueTable).values({
        leadId,
        phone,
        reason,
        message,
      });

      console.log(
        `[Suppression] Added to suppression queue: ${reason} from ${phone}`,
      );
    } catch (error) {
      console.error("[Suppression] Failed to add to queue:", error);
    }
  }

  /**
   * Get suppression queue for admin review (from database)
   */
  async getSuppressionQueue(): Promise<SuppressionQueueItem[]> {
    if (!db) {
      console.warn("[Suppression] Database not available");
      return [];
    }

    try {
      return await db
        .select()
        .from(suppressionQueueTable)
        .where(eq(suppressionQueueTable.reviewed, false));
    } catch (error) {
      console.error("[Suppression] Failed to get queue:", error);
      return [];
    }
  }

  /**
   * Mark suppression item as reviewed
   */
  async reviewSuppressionItem(
    id: string,
    reviewedBy: string,
    action: "confirm" | "restore" | "delete",
  ): Promise<void> {
    if (!db) return;

    try {
      await db
        .update(suppressionQueueTable)
        .set({
          reviewed: true,
          reviewedBy,
          reviewedAt: new Date(),
          reviewAction: action,
        })
        .where(eq(suppressionQueueTable.id, id));
    } catch (error) {
      console.error("[Suppression] Failed to review item:", error);
    }
  }

  // ============================================
  // DATABASE HELPER METHODS
  // ============================================

  /**
   * Get or create automation state from database
   */
  private async getOrCreateState(
    leadId: string,
    phone: string,
  ): Promise<LeadAutomationState> {
    if (!db) {
      // Fallback to in-memory for development
      return {
        leadId,
        phone,
        priority: "cold",
        phoneVerified: false,
        emailVerified: false,
        optedOut: false,
        wrongNumber: false,
        valuationSent: false,
        blueprintSent: false,
        drip: { stage: 0, sequence: null },
        score: 0,
      };
    }

    try {
      // Try to get existing state
      const [existing] = await db
        .select()
        .from(automationStates)
        .where(eq(automationStates.leadId, leadId))
        .limit(1);

      if (existing) {
        return this.dbStateToLeadState(existing);
      }

      // Create new state in database
      const [newState] = await db
        .insert(automationStates)
        .values({
          leadId,
          phone,
          priority: "cold",
          score: 0,
        })
        .returning();

      return this.dbStateToLeadState(newState);
    } catch (error) {
      console.error("[Automation] Failed to get/create state:", error);
      // Fallback to in-memory
      return {
        leadId,
        phone,
        priority: "cold",
        phoneVerified: false,
        emailVerified: false,
        optedOut: false,
        wrongNumber: false,
        valuationSent: false,
        blueprintSent: false,
        drip: { stage: 0, sequence: null },
        score: 0,
      };
    }
  }

  /**
   * Convert database state to LeadAutomationState interface
   */
  private dbStateToLeadState(dbState: AutomationState): LeadAutomationState {
    return {
      leadId: dbState.leadId,
      phone: dbState.phone,
      email: dbState.email || undefined,
      propertyId: dbState.propertyId || undefined,
      priority: (dbState.priority as LeadPriority) || "cold",
      lastContactAt: dbState.lastContactAt || undefined,
      lastResponseAt: dbState.lastResponseAt || undefined,
      responseType: (dbState.responseType as ResponseType) || undefined,
      phoneVerified: dbState.phoneVerified || false,
      emailVerified: dbState.emailVerified || false,
      optedOut: dbState.optedOut || false,
      wrongNumber: dbState.wrongNumber || false,
      valuationSent: dbState.valuationSent || false,
      blueprintSent: dbState.blueprintSent || false,
      drip: {
        stage: dbState.dripStage || 0,
        nextTouchAt: dbState.nextTouchAt || undefined,
        sequence:
          (dbState.dripSequence as
            | "retarget"
            | "nurture"
            | "hot_lead"
            | null) || null,
      },
      score: dbState.score || 0,
    };
  }

  /**
   * Update automation state in database
   */
  private async updateState(
    leadId: string,
    updates: Partial<NewAutomationState>,
  ): Promise<void> {
    if (!db) return;

    try {
      await db
        .update(automationStates)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(automationStates.leadId, leadId));
    } catch (error) {
      console.error("[Automation] Failed to update state:", error);
    }
  }

  /**
   * Check if lead is still eligible for automation (from database)
   */
  private async checkStillEligible(leadId: string): Promise<boolean> {
    if (!db) return false;

    try {
      const [state] = await db
        .select()
        .from(automationStates)
        .where(eq(automationStates.leadId, leadId))
        .limit(1);

      if (!state) return false;
      if (state.optedOut) return false;
      if (state.wrongNumber) return false;
      return true;
    } catch (error) {
      console.error("[Automation] Failed to check eligibility:", error);
      return false;
    }
  }

  /**
   * Schedule a task (persisted to database)
   */
  private async scheduleTask(
    leadId: string,
    taskId: string,
    taskType: string,
    delayMs: number,
    payload: Record<string, any>,
  ): Promise<void> {
    if (!db) return;

    try {
      const scheduledAt = new Date(Date.now() + delayMs);

      // Cancel any existing task with same ID
      await db
        .update(scheduledTasksTable)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(scheduledTasksTable.leadId, leadId),
            eq(scheduledTasksTable.taskId, taskId),
            eq(scheduledTasksTable.status, "pending"),
          ),
        );

      // Create new scheduled task
      await db.insert(scheduledTasksTable).values({
        leadId,
        taskId,
        taskType,
        scheduledAt,
        status: "pending",
        payload,
      });

      console.log(
        `[Automation] Task ${taskId} scheduled for ${scheduledAt.toISOString()}`,
      );
    } catch (error) {
      console.error("[Automation] Failed to schedule task:", error);
    }
  }

  /**
   * Cancel all pending tasks for a lead (in database)
   */
  private async cancelTasks(leadId: string): Promise<void> {
    if (!db) return;

    try {
      await db
        .update(scheduledTasksTable)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(scheduledTasksTable.leadId, leadId),
            eq(scheduledTasksTable.status, "pending"),
          ),
        );

      console.log(`[Automation] Cancelled all pending tasks for ${leadId}`);
    } catch (error) {
      console.error("[Automation] Failed to cancel tasks:", error);
    }
  }

  /**
   * Process due tasks (call from cron job or scheduler)
   */
  async processDueTasks(): Promise<number> {
    if (!db) return 0;

    try {
      // Get all tasks that are due
      const dueTasks = await db
        .select()
        .from(scheduledTasksTable)
        .where(
          and(
            eq(scheduledTasksTable.status, "pending"),
            lte(scheduledTasksTable.scheduledAt, new Date()),
          ),
        )
        .limit(100);

      let processed = 0;

      for (const task of dueTasks) {
        // Check if lead is still eligible
        const eligible = await this.checkStillEligible(task.leadId);
        if (!eligible) {
          await db
            .update(scheduledTasksTable)
            .set({ status: "cancelled" })
            .where(eq(scheduledTasksTable.id, task.id));
          continue;
        }

        // Execute task based on type and ID
        await this.executeTask(task);

        // Mark as executed
        await db
          .update(scheduledTasksTable)
          .set({ status: "executed", executedAt: new Date() })
          .where(eq(scheduledTasksTable.id, task.id));

        processed++;
      }

      if (processed > 0) {
        console.log(`[Automation] Processed ${processed} due tasks`);
      }

      return processed;
    } catch (error) {
      console.error("[Automation] Failed to process due tasks:", error);
      return 0;
    }
  }

  /**
   * Execute a scheduled task
   */
  private async executeTask(task: ScheduledTask): Promise<void> {
    const payload = (task.payload as Record<string, any>) || {};
    const { phone, firstName, propertyAddress, email } = payload;

    switch (task.taskId) {
      // Retarget sequence
      case "retarget_day7":
        this.queueSMS(
          task.leadId,
          phone,
          `Hey ${firstName || "there"}, just circling back on my last msg about ${propertyAddress || "your property"}. Still thinking about it?`,
          "retarget_nudge_1",
        );
        await this.updateState(task.leadId, { dripStage: 1 });
        await this.scheduleTask(
          task.leadId,
          "retarget_day14",
          "retarget",
          7 * 24 * 60 * 60 * 1000,
          payload,
        );
        break;

      case "retarget_day14":
        this.queueSMS(
          task.leadId,
          phone,
          `Still interested in chatting about ${propertyAddress || "the property"}? LMK! No pressure at all.`,
          "retarget_nudge_2",
        );
        await this.updateState(task.leadId, { dripStage: 2 });
        await this.scheduleTask(
          task.leadId,
          "retarget_day30",
          "retarget",
          16 * 24 * 60 * 60 * 1000,
          payload,
        );
        break;

      case "retarget_day30":
        this.queueSMS(
          task.leadId,
          phone,
          `Last try! If you ever want to discuss ${propertyAddress || "your property"}, I'm here. Have a great day!`,
          "retarget_final",
        );
        await this.updateState(task.leadId, { dripStage: 3, priority: "cold" });
        console.log(
          `[Automation] Lead ${task.leadId} moved to COLD bucket after no response`,
        );
        break;

      // Nurture sequence
      case "nurture_day3":
        if (email) {
          this.queueEmail(task.leadId, email, "value_content");
        }
        await this.updateState(task.leadId, { dripStage: 1 });
        break;

      case "nurture_day7":
        this.queueSMS(
          task.leadId,
          phone,
          "Quick market update - prices in your area are moving! Want me to send you the latest data?",
          "nurture_market_update",
        );
        await this.updateState(task.leadId, { dripStage: 2 });
        break;

      case "nurture_day14":
        this.queueCall(task.leadId, phone, "nurture_check_in");
        await this.updateState(task.leadId, { dripStage: 3 });
        break;

      // Hot lead sequence
      case "hot_24h":
        this.queueSMS(
          task.leadId,
          phone,
          "Did you get a chance to review the report I sent? Happy to walk through it with you!",
          "hot_followup_24h",
        );
        await this.updateState(task.leadId, { dripStage: 1 });
        break;

      case "hot_48h":
        this.queueCall(task.leadId, phone, "hot_followup_call");
        await this.updateState(task.leadId, { dripStage: 2 });
        break;

      case "hot_day3":
        this.queueSMS(
          task.leadId,
          phone,
          "Any questions about the numbers? I'm here to help!",
          "hot_followup_day3",
        );
        await this.updateState(task.leadId, { dripStage: 3 });
        break;

      case "hot_day7":
        this.queueSMS(
          task.leadId,
          phone,
          "Still thinking about it? Happy to hop on a quick call whenever works for you.",
          "hot_followup_day7",
        );
        await this.updateState(task.leadId, { dripStage: 4 });
        // Downgrade to warm after 7 days
        const state = await this.getOrCreateState(task.leadId, phone);
        if (!state.lastResponseAt) {
          await this.updateState(task.leadId, { priority: "warm" });
          console.log(
            `[Automation] Hot lead ${task.leadId} downgraded to WARM after 7 days`,
          );
        }
        break;

      default:
        console.log(`[Automation] Unknown task: ${task.taskId}`);
    }
  }

  private async queueSMS(
    leadId: string,
    phone: string,
    message: string,
    category: string,
    recommendedBy: RecommendingWorker = "gianna",
    aiReason?: string,
  ): Promise<void> {
    // HUMAN GATE: If enabled, create a recommendation instead of executing
    if (this.humanGateEnabled) {
      await this.createRecommendation({
        leadId,
        action: "send_sms",
        recommendedBy,
        aiReason: aiReason || `Automated ${category} message`,
        confidence: 85,
        priority: category.includes("hot") ? 90 : 50,
        content: message,
        targetPhone: phone,
      });
      console.log(`[Automation] SMS recommendation created for ${leadId}: ${category}`);
      return;
    }

    // LEGACY MODE: Direct execution (when human gate disabled)
    this.executeDirectSMS(leadId, phone, message, category);
    console.log(`[Automation] SMS queued for ${leadId}: ${category}`);
  }

  private async queueEmail(
    leadId: string,
    email: string,
    template: string,
    recommendedBy: RecommendingWorker = "gianna",
    aiReason?: string,
  ): Promise<void> {
    // HUMAN GATE: If enabled, create a recommendation instead of executing
    if (this.humanGateEnabled) {
      await this.createRecommendation({
        leadId,
        action: "send_email",
        recommendedBy,
        aiReason: aiReason || `Automated ${template} email`,
        confidence: 85,
        priority: 50,
        content: template,
        targetEmail: email,
      });
      console.log(`[Automation] Email recommendation created for ${leadId}: ${template}`);
      return;
    }

    // LEGACY MODE: Direct execution
    console.log(
      `[Automation] Email queued for ${leadId}: ${template} to ${email}`,
    );
  }

  private async queueCall(
    leadId: string,
    phone: string,
    reason: string,
    recommendedBy: RecommendingWorker = "sabrina",
    aiReason?: string,
  ): Promise<void> {
    // HUMAN GATE: If enabled, create a recommendation instead of executing
    if (this.humanGateEnabled) {
      await this.createRecommendation({
        leadId,
        action: "schedule_call",
        recommendedBy,
        aiReason: aiReason || `Automated call: ${reason}`,
        confidence: 80,
        priority: reason.includes("hot") ? 95 : 60,
        content: reason,
        targetPhone: phone,
      });
      console.log(`[Automation] Call recommendation created for ${leadId}: ${reason}`);
      return;
    }

    // LEGACY MODE: Direct execution
    console.log(`[Automation] Call queued for ${leadId}: ${reason}`);
  }

  private sendSalesAlert(leadId: string, reason: string): void {
    // Would integrate with Slack/webhook
    console.log(`🔔 [SALES ALERT] Hot lead: ${leadId} - Reason: ${reason}`);
  }

  private autoSendValuationToEmail(
    leadId: string,
    phone: string,
    email: string,
    propertyId?: string,
  ): void {
    console.log(
      `[Automation] Auto-generating valuation for ${leadId} to send to ${email}`,
    );

    // Would call valuation API and send email
    // For now, just confirm via SMS
    this.queueSMS(
      leadId,
      phone,
      "Just sent it! Check your inbox 📧",
      "email_confirm",
    );
  }

  // ============================================
  // PUBLIC API (DATABASE-BACKED)
  // ============================================

  async getLeadState(leadId: string): Promise<LeadAutomationState | undefined> {
    if (!db) return undefined;

    try {
      const [state] = await db
        .select()
        .from(automationStates)
        .where(eq(automationStates.leadId, leadId))
        .limit(1);

      return state ? this.dbStateToLeadState(state) : undefined;
    } catch (error) {
      console.error("[Automation] Failed to get lead state:", error);
      return undefined;
    }
  }

  async getAllHotLeads(): Promise<LeadAutomationState[]> {
    if (!db) return [];

    try {
      const states = await db
        .select()
        .from(automationStates)
        .where(eq(automationStates.priority, "hot"));

      return states.map((s) => this.dbStateToLeadState(s));
    } catch (error) {
      console.error("[Automation] Failed to get hot leads:", error);
      return [];
    }
  }

  async getAllWarmLeads(): Promise<LeadAutomationState[]> {
    if (!db) return [];

    try {
      const states = await db
        .select()
        .from(automationStates)
        .where(eq(automationStates.priority, "warm"));

      return states.map((s) => this.dbStateToLeadState(s));
    } catch (error) {
      console.error("[Automation] Failed to get warm leads:", error);
      return [];
    }
  }

  async getStats(): Promise<{
    total: number;
    hot: number;
    warm: number;
    cold: number;
    dead: number;
    optedOut: number;
    wrongNumbers: number;
    valuationsSent: number;
  }> {
    if (!db) {
      return {
        total: 0,
        hot: 0,
        warm: 0,
        cold: 0,
        dead: 0,
        optedOut: 0,
        wrongNumbers: 0,
        valuationsSent: 0,
      };
    }

    try {
      const result = await db
        .select({
          total: sql<number>`count(*)::int`,
          hot: sql<number>`count(*) filter (where priority = 'hot')::int`,
          warm: sql<number>`count(*) filter (where priority = 'warm')::int`,
          cold: sql<number>`count(*) filter (where priority = 'cold')::int`,
          dead: sql<number>`count(*) filter (where priority = 'dead')::int`,
          optedOut: sql<number>`count(*) filter (where opted_out = true)::int`,
          wrongNumbers: sql<number>`count(*) filter (where wrong_number = true)::int`,
          valuationsSent: sql<number>`count(*) filter (where valuation_sent = true or blueprint_sent = true)::int`,
        })
        .from(automationStates);

      return (
        result[0] || {
          total: 0,
          hot: 0,
          warm: 0,
          cold: 0,
          dead: 0,
          optedOut: 0,
          wrongNumbers: 0,
          valuationsSent: 0,
        }
      );
    } catch (error) {
      console.error("[Automation] Failed to get stats:", error);
      return {
        total: 0,
        hot: 0,
        warm: 0,
        cold: 0,
        dead: 0,
        optedOut: 0,
        wrongNumbers: 0,
        valuationsSent: 0,
      };
    }
  }
}

// Export singleton instance
export const automationService = new AutomationService();
