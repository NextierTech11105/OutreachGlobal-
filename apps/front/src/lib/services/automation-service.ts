/**
 * BASELINE AUTOMATION SERVICE
 *
 * Implements the 6 core automation rules:
 * 1. Retarget No-Response (7, 14, 30 day drip)
 * 2. Nurture Confirmed Contact (multi-channel drip)
 * 3. Hot Lead - Valuation Requested (immediate priority)
 * 4. Email Captured - Auto-Send Report
 * 5. Opt-Out Handling
 * 6. Wrong Number Handling
 */

import { smsQueueService } from "./sms-queue-service";

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
  | "no_response";

// Lead status in the automation pipeline
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

// In-memory state storage (would be database in production)
const leadStates = new Map<string, LeadAutomationState>();
const scheduledTasks = new Map<string, NodeJS.Timeout>();

// Email regex pattern
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

// Opt-out keywords
const OPT_OUT_KEYWORDS = [
  "stop", "unsubscribe", "remove", "optout", "opt out", "cancel",
  "dont text", "don't text", "no more", "leave me alone"
];

// Wrong number keywords
const WRONG_NUMBER_KEYWORDS = [
  "wrong number", "wrong person", "who is this", "dont know",
  "don't know", "never heard", "not me", "idk who"
];

// Interest keywords
const INTEREST_KEYWORDS = [
  "yes", "interested", "tell me more", "call me", "sure",
  "sounds good", "what's the offer", "how much"
];

class AutomationService {
  // ============================================
  // RULE 1: RETARGET NO-RESPONSE
  // ============================================

  /**
   * Schedule retarget drip for leads with no response
   * Day 7 → Day 14 → Day 30 → Cold bucket
   */
  scheduleRetargetDrip(leadId: string, phone: string, firstName?: string, propertyAddress?: string): void {
    const state = this.getOrCreateState(leadId, phone);

    if (state.optedOut || state.wrongNumber) {
      console.log(`[Automation] Skipping retarget for ${leadId} - opted out or wrong number`);
      return;
    }

    state.drip.sequence = "retarget";
    state.drip.stage = 0;
    state.lastContactAt = new Date();

    // Schedule Day 7 nudge
    this.scheduleTask(leadId, "retarget_day7", 7 * 24 * 60 * 60 * 1000, () => {
      if (!this.checkStillEligible(leadId)) return;

      const message = `Hey ${firstName || "there"}, just circling back on my last msg about ${propertyAddress || "your property"}. Still thinking about it?`;
      this.queueSMS(leadId, phone, message, "retarget_nudge_1");
      state.drip.stage = 1;

      // Schedule Day 14
      this.scheduleTask(leadId, "retarget_day14", 7 * 24 * 60 * 60 * 1000, () => {
        if (!this.checkStillEligible(leadId)) return;

        const message2 = `Still interested in chatting about ${propertyAddress || "the property"}? LMK! No pressure at all.`;
        this.queueSMS(leadId, phone, message2, "retarget_nudge_2");
        state.drip.stage = 2;

        // Schedule Day 30 (final)
        this.scheduleTask(leadId, "retarget_day30", 16 * 24 * 60 * 60 * 1000, () => {
          if (!this.checkStillEligible(leadId)) return;

          const message3 = `Last try! If you ever want to discuss ${propertyAddress || "your property"}, I'm here. Have a great day!`;
          this.queueSMS(leadId, phone, message3, "retarget_final");
          state.drip.stage = 3;
          state.priority = "cold";

          console.log(`[Automation] Lead ${leadId} moved to COLD bucket after no response`);
        });
      });
    });

    leadStates.set(leadId, state);
    console.log(`[Automation] Retarget drip scheduled for ${leadId}`);
  }

  // ============================================
  // RULE 2: NURTURE CONFIRMED CONTACT
  // ============================================

  /**
   * Activate nurture drip when contact is confirmed
   * Response received OR phone verified
   */
  activateNurtureDrip(leadId: string, phone: string, email?: string): void {
    const state = this.getOrCreateState(leadId, phone);

    // Cancel any retarget drip
    this.cancelTasks(leadId);

    state.phoneVerified = true;
    state.priority = "warm";
    state.score += 20;
    state.drip.sequence = "nurture";
    state.drip.stage = 0;

    if (email) {
      state.email = email;
    }

    // Schedule nurture sequence
    // Day 3: Value content email
    this.scheduleTask(leadId, "nurture_day3", 3 * 24 * 60 * 60 * 1000, () => {
      if (!this.checkStillEligible(leadId)) return;
      if (state.email) {
        this.queueEmail(leadId, state.email, "value_content");
      }
      state.drip.stage = 1;
    });

    // Day 7: Market update SMS
    this.scheduleTask(leadId, "nurture_day7", 7 * 24 * 60 * 60 * 1000, () => {
      if (!this.checkStillEligible(leadId)) return;
      const message = "Quick market update - prices in your area are moving! Want me to send you the latest data?";
      this.queueSMS(leadId, phone, message, "nurture_market_update");
      state.drip.stage = 2;
    });

    // Day 14: Queue for power dialer
    this.scheduleTask(leadId, "nurture_day14", 14 * 24 * 60 * 60 * 1000, () => {
      if (!this.checkStillEligible(leadId)) return;
      this.queueCall(leadId, phone, "nurture_check_in");
      state.drip.stage = 3;
    });

    leadStates.set(leadId, state);
    console.log(`[Automation] Nurture drip activated for ${leadId} (score: ${state.score})`);
  }

  // ============================================
  // RULE 3: HOT LEAD - VALUATION REQUESTED
  // ============================================

  /**
   * Maximum priority for valuation/blueprint recipients
   * These are situational targets with HIGH probability
   */
  flagAsHotLead(leadId: string, phone: string, email?: string, reason: "valuation" | "blueprint" | "interested" | "call_request" = "valuation"): void {
    const state = this.getOrCreateState(leadId, phone);

    // Cancel all other drips - this is priority 1
    this.cancelTasks(leadId);

    state.priority = "hot";
    state.score += 50;
    state.phoneVerified = true;

    if (reason === "valuation") state.valuationSent = true;
    if (reason === "blueprint") state.blueprintSent = true;
    if (email) state.email = email;

    state.drip.sequence = "hot_lead";
    state.drip.stage = 0;

    // Immediate: Log for sales alert
    console.log(`🔥🔥🔥 [HOT LEAD] ${leadId} - Reason: ${reason} - IMMEDIATE FOLLOW-UP REQUIRED`);

    // Send notification (would integrate with Slack/webhook in production)
    this.sendSalesAlert(leadId, reason);

    // Hour 24: Follow-up if no response
    this.scheduleTask(leadId, "hot_24h", 24 * 60 * 60 * 1000, () => {
      if (state.lastResponseAt && state.lastResponseAt > state.lastContactAt!) return;

      const message = "Did you get a chance to review the report I sent? Happy to walk through it with you!";
      this.queueSMS(leadId, phone, message, "hot_followup_24h");
      state.drip.stage = 1;
    });

    // Hour 48: Phone call attempt
    this.scheduleTask(leadId, "hot_48h", 48 * 60 * 60 * 1000, () => {
      if (state.lastResponseAt && state.lastResponseAt > state.lastContactAt!) return;

      this.queueCall(leadId, phone, "hot_followup_call");
      state.drip.stage = 2;
    });

    // Day 3: Check-in SMS
    this.scheduleTask(leadId, "hot_day3", 3 * 24 * 60 * 60 * 1000, () => {
      if (state.lastResponseAt && state.lastResponseAt > state.lastContactAt!) return;

      const message = "Any questions about the numbers? I'm here to help!";
      this.queueSMS(leadId, phone, message, "hot_followup_day3");
      state.drip.stage = 3;
    });

    // Day 7: Final hot lead touch
    this.scheduleTask(leadId, "hot_day7", 7 * 24 * 60 * 60 * 1000, () => {
      if (state.lastResponseAt && state.lastResponseAt > state.lastContactAt!) return;

      const message = "Still thinking about it? Happy to hop on a quick call whenever works for you.";
      this.queueSMS(leadId, phone, message, "hot_followup_day7");
      state.drip.stage = 4;

      // Downgrade to warm if still no response
      if (!state.lastResponseAt) {
        state.priority = "warm";
        console.log(`[Automation] Hot lead ${leadId} downgraded to WARM after 7 days`);
      }
    });

    leadStates.set(leadId, state);
  }

  // ============================================
  // RULE 4: EMAIL CAPTURED - AUTO-SEND REPORT
  // ============================================

  /**
   * Detect email in SMS response and auto-send valuation
   */
  processIncomingMessage(leadId: string, phone: string, message: string, propertyId?: string): {
    classification: ResponseType;
    extractedEmail?: string;
    action: string;
  } {
    const state = this.getOrCreateState(leadId, phone);
    const lowerMessage = message.toLowerCase().trim();

    // Update last response
    state.lastResponseAt = new Date();

    // Check for opt-out first (highest priority)
    if (OPT_OUT_KEYWORDS.some(kw => lowerMessage.includes(kw))) {
      this.handleOptOut(leadId, phone);
      return {
        classification: "opt_out",
        action: "Added to opt-out list, all messages cancelled"
      };
    }

    // Check for wrong number
    if (WRONG_NUMBER_KEYWORDS.some(kw => lowerMessage.includes(kw))) {
      this.handleWrongNumber(leadId, phone);
      return {
        classification: "wrong_number",
        action: "Marked as wrong number, queued for re-skip-trace"
      };
    }

    // Check for email in message
    const emailMatch = message.match(EMAIL_REGEX);
    if (emailMatch) {
      const email = emailMatch[0].toLowerCase();
      state.email = email;
      state.emailVerified = true;

      // Auto-send valuation report
      this.autoSendValuationToEmail(leadId, phone, email, propertyId);

      // Flag as hot lead - they're engaged!
      this.flagAsHotLead(leadId, phone, email, "valuation");

      return {
        classification: "email_provided",
        extractedEmail: email,
        action: "Email captured, valuation report sent, flagged as HOT lead"
      };
    }

    // Check for interest signals
    if (INTEREST_KEYWORDS.some(kw => lowerMessage.includes(kw))) {
      // Check if they want a call
      if (lowerMessage.includes("call")) {
        this.flagAsHotLead(leadId, phone, undefined, "call_request");
        return {
          classification: "appointment_request",
          action: "Flagged as HOT lead, queued for call"
        };
      }

      // General interest
      this.activateNurtureDrip(leadId, phone);
      return {
        classification: "interested",
        action: "Activated nurture drip, priority upgraded to WARM"
      };
    }

    // Check if it's a question
    if (message.includes("?") || lowerMessage.startsWith("what") || lowerMessage.startsWith("how") || lowerMessage.startsWith("when")) {
      this.activateNurtureDrip(leadId, phone);
      return {
        classification: "question",
        action: "Question detected - needs human response, nurture drip activated"
      };
    }

    // Unclear response - still confirms the number works
    state.phoneVerified = true;
    state.score += 10;
    leadStates.set(leadId, state);

    return {
      classification: "unclear",
      action: "Phone confirmed, needs human review"
    };
  }

  // ============================================
  // RULE 5: OPT-OUT HANDLING
  // ============================================

  handleOptOut(leadId: string, phone: string): void {
    const state = this.getOrCreateState(leadId, phone);

    // Cancel all pending tasks
    this.cancelTasks(leadId);

    state.optedOut = true;
    state.priority = "dead";
    state.drip.sequence = null;

    // Add to SMS queue opt-out list
    smsQueueService.addOptOut(phone);

    // Send confirmation
    this.queueSMS(leadId, phone, "You've been unsubscribed. Reply START to re-join. Have a great day!", "opt_out_confirm");

    leadStates.set(leadId, state);
    console.log(`[Automation] Lead ${leadId} opted out`);
  }

  // ============================================
  // RULE 6: WRONG NUMBER HANDLING
  // ============================================

  handleWrongNumber(leadId: string, phone: string): void {
    const state = this.getOrCreateState(leadId, phone);

    // Cancel all pending tasks
    this.cancelTasks(leadId);

    state.wrongNumber = true;
    state.phoneVerified = false;
    state.drip.sequence = null;

    // Send apology
    this.queueSMS(leadId, phone, "So sorry for the mixup! Have a great day.", "wrong_number_apology");

    // Queue for re-skip-trace
    console.log(`[Automation] Lead ${leadId} marked as wrong number - queue for re-skip-trace`);

    leadStates.set(leadId, state);
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private getOrCreateState(leadId: string, phone: string): LeadAutomationState {
    let state = leadStates.get(leadId);
    if (!state) {
      state = {
        leadId,
        phone,
        priority: "cold",
        phoneVerified: false,
        emailVerified: false,
        optedOut: false,
        wrongNumber: false,
        valuationSent: false,
        blueprintSent: false,
        drip: {
          stage: 0,
          sequence: null,
        },
        score: 0,
      };
      leadStates.set(leadId, state);
    }
    return state;
  }

  private checkStillEligible(leadId: string): boolean {
    const state = leadStates.get(leadId);
    if (!state) return false;
    if (state.optedOut) return false;
    if (state.wrongNumber) return false;
    return true;
  }

  private scheduleTask(leadId: string, taskId: string, delayMs: number, callback: () => void): void {
    const fullId = `${leadId}_${taskId}`;

    // Clear any existing task with same ID
    const existing = scheduledTasks.get(fullId);
    if (existing) {
      clearTimeout(existing);
    }

    const timeout = setTimeout(callback, delayMs);
    scheduledTasks.set(fullId, timeout);
  }

  private cancelTasks(leadId: string): void {
    for (const [key, timeout] of scheduledTasks.entries()) {
      if (key.startsWith(leadId)) {
        clearTimeout(timeout);
        scheduledTasks.delete(key);
      }
    }
  }

  private queueSMS(leadId: string, phone: string, message: string, category: string): void {
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

    console.log(`[Automation] SMS queued for ${leadId}: ${category}`);
  }

  private queueEmail(_leadId: string, _email: string, _template: string): void {
    // Would integrate with SendGrid service
    console.log(`[Automation] Email queued for ${_leadId}: ${_template} to ${_email}`);
  }

  private queueCall(_leadId: string, _phone: string, _reason: string): void {
    // Would integrate with power dialer queue
    console.log(`[Automation] Call queued for ${_leadId}: ${_reason}`);
  }

  private sendSalesAlert(leadId: string, reason: string): void {
    // Would integrate with Slack/webhook
    console.log(`🔔 [SALES ALERT] Hot lead: ${leadId} - Reason: ${reason}`);
  }

  private autoSendValuationToEmail(leadId: string, phone: string, email: string, propertyId?: string): void {
    console.log(`[Automation] Auto-generating valuation for ${leadId} to send to ${email}`);

    // Would call valuation API and send email
    // For now, just confirm via SMS
    this.queueSMS(leadId, phone, "Just sent it! Check your inbox 📧", "email_confirm");
  }

  // ============================================
  // PUBLIC API
  // ============================================

  getLeadState(leadId: string): LeadAutomationState | undefined {
    return leadStates.get(leadId);
  }

  getAllHotLeads(): LeadAutomationState[] {
    return Array.from(leadStates.values()).filter(s => s.priority === "hot");
  }

  getAllWarmLeads(): LeadAutomationState[] {
    return Array.from(leadStates.values()).filter(s => s.priority === "warm");
  }

  getStats(): {
    total: number;
    hot: number;
    warm: number;
    cold: number;
    dead: number;
    optedOut: number;
    wrongNumbers: number;
    valuationsSent: number;
  } {
    const states = Array.from(leadStates.values());
    return {
      total: states.length,
      hot: states.filter(s => s.priority === "hot").length,
      warm: states.filter(s => s.priority === "warm").length,
      cold: states.filter(s => s.priority === "cold").length,
      dead: states.filter(s => s.priority === "dead").length,
      optedOut: states.filter(s => s.optedOut).length,
      wrongNumbers: states.filter(s => s.wrongNumber).length,
      valuationsSent: states.filter(s => s.valuationSent || s.blueprintSent).length,
    };
  }
}

// Export singleton instance
export const automationService = new AutomationService();
