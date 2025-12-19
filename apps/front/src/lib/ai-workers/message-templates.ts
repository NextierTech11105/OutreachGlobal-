/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SMS MESSAGE TEMPLATE LIBRARIES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Pre-programmed templates for each campaign context.
 * NOT live AI generation - these are approved templates selected by context.
 *
 * LIBRARIES:
 * 1. INITIAL - GIANNA's first contact templates
 * 2. FOLLOW_UP - Post-value delivery, post-interest
 * 3. RETARGET - Re-engaging old leads with new angle
 * 4. NUDGER - CATHY's humor-based follow-ups
 *
 * Each template tracks:
 * - Attempt number (1, 2, 3, etc.)
 * - Context (what triggered this message)
 * - Worker (who sends it)
 * - Variables required
 */

import type { DigitalWorkerId } from "./digital-workers";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type CampaignContext =
  | "initial"
  | "follow_up"
  | "retarget"
  | "nudger"
  | "value_delivered"
  | "book_appointment"
  | "post_appointment";

export interface MessageTemplate {
  id: string;
  name: string;
  context: CampaignContext;
  worker: DigitalWorkerId;
  attemptNumber: number;
  template: string;
  variables: string[];
  notes?: string;
  bestFor?: string[];
}

export interface TemplateUsageLog {
  templateId: string;
  leadId: string;
  campaignId: string;
  attemptNumber: number;
  sentAt: string;
  deliveredAt?: string;
  responseAt?: string;
  responseType?: string;
  worker: DigitalWorkerId;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GIANNA - INITIAL TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════
// First contact, goal: capture email for Value X delivery

export const GIANNA_INITIAL_TEMPLATES: MessageTemplate[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // PROPERTY OWNERS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "gianna_initial_property_1",
    name: "Property - Direct Value Offer",
    context: "initial",
    worker: "gianna",
    attemptNumber: 1,
    template: `Hey {{first_name}}! Quick question - I put together a valuation on {{property_address}} and the numbers are interesting. Want me to send it over? Just need your email.`,
    variables: ["first_name", "property_address"],
    bestFor: ["High equity", "Absentee owners"],
  },
  {
    id: "gianna_initial_property_2",
    name: "Property - Curiosity Hook",
    context: "initial",
    worker: "gianna",
    attemptNumber: 1,
    template: `{{first_name}} - saw your property on {{property_street}} and ran some numbers. You might be sitting on more equity than you think. Worth 2 mins to find out?`,
    variables: ["first_name", "property_street"],
    bestFor: ["Cold leads", "Unknown motivation"],
  },
  {
    id: "gianna_initial_property_3",
    name: "Property - Market Update",
    context: "initial",
    worker: "gianna",
    attemptNumber: 1,
    template: `Hey {{first_name}}, Gianna here. Market's been moving in {{property_city}} - put together a report on what that means for {{property_address}}. Want me to email it over?`,
    variables: ["first_name", "property_city", "property_address"],
    bestFor: ["Market timing plays", "Curious sellers"],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // BUSINESS OWNERS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "gianna_initial_business_1",
    name: "Business - Exit Strategy",
    context: "initial",
    worker: "gianna",
    attemptNumber: 1,
    template: `{{first_name}} - quick one. I work with {{industry}} owners looking at their options. Put together an exit strategy guide that's been helpful. Want me to send it? Just need your email.`,
    variables: ["first_name", "industry"],
    bestFor: ["Business acquisitions", "Retirement age"],
  },
  {
    id: "gianna_initial_business_2",
    name: "Business - Valuation Curiosity",
    context: "initial",
    worker: "gianna",
    attemptNumber: 1,
    template: `Hey {{first_name}}, Gianna here. Been researching {{company_name}} - curious if you've ever thought about what it's worth? I can put together a quick estimate if you're interested.`,
    variables: ["first_name", "company_name"],
    bestFor: ["Never been approached", "Strong businesses"],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // GENERIC / FLEXIBLE
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "gianna_initial_generic_1",
    name: "Generic - Value First",
    context: "initial",
    worker: "gianna",
    attemptNumber: 1,
    template: `Hey {{first_name}}! Gianna here. I've got something I think you'll find valuable - a {{value_content}}. Want me to send it over? Just need your email.`,
    variables: ["first_name", "value_content"],
    bestFor: ["Any lead type", "Value X campaigns"],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// FOLLOW-UP TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════
// After initial contact, post-value delivery, maintaining engagement

export const FOLLOW_UP_TEMPLATES: MessageTemplate[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // POST-VALUE DELIVERY (GIANNA → SABRINA handoff)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "followup_value_delivered_1",
    name: "Value Delivered - Check In",
    context: "value_delivered",
    worker: "sabrina",
    attemptNumber: 1,
    template: `Hey {{first_name}}! Sabrina here - sent over that {{value_content}} yesterday. Had a chance to look at it? Happy to walk you through the numbers if helpful.`,
    variables: ["first_name", "value_content"],
    notes: "24h after Value X delivery",
  },
  {
    id: "followup_value_delivered_2",
    name: "Value Delivered - Strategy Session Pivot",
    context: "value_delivered",
    worker: "sabrina",
    attemptNumber: 2,
    template: `{{first_name}} - following up on that {{value_content}}. Most folks have questions after seeing the numbers. Want to hop on a quick call to talk through it? No pitch, just perspective.`,
    variables: ["first_name", "value_content"],
    notes: "48h after Value X delivery",
  },
  {
    id: "followup_value_delivered_3",
    name: "Value Delivered - Final Push",
    context: "value_delivered",
    worker: "sabrina",
    attemptNumber: 3,
    template: `Last one from me {{first_name}} - that {{value_content}} has a lot of info. If any of it surprised you (good or bad), I'm here to answer questions. Just reply and I'll set up a time.`,
    variables: ["first_name", "value_content"],
    notes: "72h after Value X delivery, before CATHY takes over",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // POST-INTEREST (they replied positively)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "followup_interested_1",
    name: "Interested - Lock In Time",
    context: "follow_up",
    worker: "sabrina",
    attemptNumber: 1,
    template: `Great to hear {{first_name}}! Let's get you on the calendar. I can do {{suggested_time}} - does that work? If not, just tell me what's better.`,
    variables: ["first_name", "suggested_time"],
    notes: "Immediate response to interest signal",
  },
  {
    id: "followup_interested_2",
    name: "Interested - Time Options",
    context: "follow_up",
    worker: "sabrina",
    attemptNumber: 2,
    template: `{{first_name}} - didn't want to lose momentum. I can do Tuesday 2pm or Wednesday 10am for a quick strategy chat. Which works better?`,
    variables: ["first_name"],
    notes: "If they didn't respond to first time offer",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // POST-QUESTION (they asked something)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "followup_question_1",
    name: "Question - Acknowledge + Move Forward",
    context: "follow_up",
    worker: "gianna",
    attemptNumber: 1,
    template: `Good question {{first_name}}. Easiest thing is to hop on for 10 mins - I can answer that and show you a few things. Got time this week?`,
    variables: ["first_name"],
    notes: "Pivot questions to calls",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// RETARGET TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════
// Re-engaging old leads with new angles, fresh context

export const RETARGET_TEMPLATES: MessageTemplate[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // NEW ANGLE RETARGET
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "retarget_new_angle_1",
    name: "Retarget - Market Changed",
    context: "retarget",
    worker: "gianna",
    attemptNumber: 1,
    template: `Hey {{first_name}}, Gianna again. I know we chatted a while back about {{property_address}}. Market's shifted since then - might be worth a fresh look. Interested in updated numbers?`,
    variables: ["first_name", "property_address"],
    notes: "Use when market conditions changed",
  },
  {
    id: "retarget_new_angle_2",
    name: "Retarget - New Opportunity",
    context: "retarget",
    worker: "gianna",
    attemptNumber: 1,
    template: `{{first_name}} - something came across my desk that made me think of you. Different angle than before. Worth a quick chat? Promise it's not the same pitch.`,
    variables: ["first_name"],
    notes: "When you have genuinely new info",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TIME-BASED RETARGET
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "retarget_time_based_1",
    name: "Retarget - 90 Day Check In",
    context: "retarget",
    worker: "gianna",
    attemptNumber: 1,
    template: `Hey {{first_name}}, Gianna here. Been about 3 months since we last connected. Circumstances change - wanted to check if anything's different on your end?`,
    variables: ["first_name"],
    notes: "Quarterly re-engagement",
  },
  {
    id: "retarget_time_based_2",
    name: "Retarget - Year End",
    context: "retarget",
    worker: "gianna",
    attemptNumber: 1,
    template: `{{first_name}} - end of year is always a good time to reassess. Still have your info from when we talked. Want an updated valuation before year end?`,
    variables: ["first_name"],
    notes: "Q4 retarget campaign",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // RETARGET FOLLOW-UPS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "retarget_followup_1",
    name: "Retarget Follow-up #1",
    context: "retarget",
    worker: "gianna",
    attemptNumber: 2,
    template: `{{first_name}} - just circling back on my last message. No pressure, just curious if timing is any better now.`,
    variables: ["first_name"],
  },
  {
    id: "retarget_followup_2",
    name: "Retarget Follow-up #2",
    context: "retarget",
    worker: "gianna",
    attemptNumber: 3,
    template: `Last check in {{first_name}}. If now's not the time, totally get it. But if anything changes, you know where to find me. -Gianna`,
    variables: ["first_name"],
    notes: "Final retarget before marking cold",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CATHY NUDGER TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════
// Humor-based follow-ups for ghosted/cold leads. Attempt number visible.

export const CATHY_NUDGER_TEMPLATES: MessageTemplate[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // ATTEMPT 1-2: MILD HUMOR
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "cathy_nudge_1a",
    name: "Nudge #1 - Light Check In",
    context: "nudger",
    worker: "cathy",
    attemptNumber: 1,
    template: `Hey {{first_name}}! Cathy here. I'm not saying you're hard to reach, but I've had better luck getting through to my mother-in-law. And that woman screens EVERYTHING. Still interested in that {{value_content}}?`,
    variables: ["first_name", "value_content"],
    notes: "First nudge - mild humor",
  },
  {
    id: "cathy_nudge_1b",
    name: "Nudge #1 - Alternate",
    context: "nudger",
    worker: "cathy",
    attemptNumber: 1,
    template: `{{first_name}}, Cathy again. I know, I know - another message. But in my defense, I genuinely think that {{value_content}} would be useful. Am I wrong?`,
    variables: ["first_name", "value_content"],
    notes: "First nudge - alternate",
  },
  {
    id: "cathy_nudge_2a",
    name: "Nudge #2 - Self Deprecating",
    context: "nudger",
    worker: "cathy",
    attemptNumber: 2,
    template: `{{first_name}}, this is attempt #{{attempt_count}}. I'm starting to think my messages are going straight to the 'maybe later' pile. That's where my husband puts all my suggestions too. Let me know if I should keep trying or take the hint!`,
    variables: ["first_name", "attempt_count"],
    notes: "Second nudge - mention attempt count",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTEMPT 3-4: MEDIUM HUMOR
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "cathy_nudge_3a",
    name: "Nudge #3 - Time Acknowledge",
    context: "nudger",
    worker: "cathy",
    attemptNumber: 3,
    template: `Third time's the charm, right {{first_name}}? That's what I told my third husband. (Kidding, I've only had one... so far.) It's been {{days_since_contact}} days - just checking if anything's changed?`,
    variables: ["first_name", "days_since_contact"],
    notes: "Third nudge - medium humor, show days",
  },
  {
    id: "cathy_nudge_3b",
    name: "Nudge #3 - Timing Suggestion",
    context: "nudger",
    worker: "cathy",
    attemptNumber: 3,
    template: `{{first_name}}, Cathy here (yes, again). I've tried you {{attempt_count}} times now - maybe I'm catching you at bad times? I could try {{suggested_time}} instead. Or just tell me to buzz off - I can take it.`,
    variables: ["first_name", "attempt_count", "suggested_time"],
    notes: "Third nudge - suggest different timing",
  },
  {
    id: "cathy_nudge_4a",
    name: "Nudge #4 - Ghost Acknowledgment",
    context: "nudger",
    worker: "cathy",
    attemptNumber: 4,
    template: `{{first_name}}, at this point I feel like I'm texting into the void. Which is fine - the void doesn't judge my jokes. But if you ARE there, just let me know. Even a thumbs up works. -Cathy (attempt #{{attempt_count}})`,
    variables: ["first_name", "attempt_count"],
    notes: "Fourth nudge - acknowledge ghosting",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTEMPT 5+: SPICY HUMOR (Go for broke)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "cathy_nudge_5a",
    name: "Nudge #5 - Last Shot",
    context: "nudger",
    worker: "cathy",
    attemptNumber: 5,
    template: `{{first_name}}, this is Cathy's FINAL message. Not because I'm giving up - but because even I have limits. (My husband would disagree.) If you ever want to chat about {{value_content}}, you know where to find me. Take care!`,
    variables: ["first_name", "value_content"],
    notes: "Fifth nudge - final before going cold",
  },
  {
    id: "cathy_nudge_5b",
    name: "Nudge #5 - Absurdist Exit",
    context: "nudger",
    worker: "cathy",
    attemptNumber: 5,
    template: `{{first_name}}, I'm going to assume one of three things: 1) You're incredibly busy 2) You're not interested 3) You've been abducted by aliens. If it's #3, blink twice. Otherwise, just know the offer stands whenever you're ready. -Cathy`,
    variables: ["first_name"],
    notes: "Fifth nudge - absurdist humor exit",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // CONTEXT-SPECIFIC NUDGES
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "cathy_nudge_property_1",
    name: "Nudge - Property Context",
    context: "nudger",
    worker: "cathy",
    attemptNumber: 3,
    template: `{{first_name}}, Cathy again about {{property_address}}. I've driven by this address more times than my ex drives by my new place. (Too dark? Sorry.) Anyway - still curious about those numbers?`,
    variables: ["first_name", "property_address"],
    notes: "Property-specific nudge",
  },
  {
    id: "cathy_nudge_business_1",
    name: "Nudge - Business Context",
    context: "nudger",
    worker: "cathy",
    attemptNumber: 3,
    template: `{{first_name}}, Cathy here. I've looked at more {{industry}} businesses than my accountant has looked at my tax deductions. (And he looks at A LOT.) Your numbers are interesting - worth a chat?`,
    variables: ["first_name", "industry"],
    notes: "Business-specific nudge",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE LIBRARY AGGREGATION
// ═══════════════════════════════════════════════════════════════════════════════

export const ALL_TEMPLATES: MessageTemplate[] = [
  ...GIANNA_INITIAL_TEMPLATES,
  ...FOLLOW_UP_TEMPLATES,
  ...RETARGET_TEMPLATES,
  ...CATHY_NUDGER_TEMPLATES,
];

/**
 * Get templates by context
 */
export function getTemplatesByContext(context: CampaignContext): MessageTemplate[] {
  return ALL_TEMPLATES.filter((t) => t.context === context);
}

/**
 * Get templates by worker
 */
export function getTemplatesByWorker(worker: DigitalWorkerId): MessageTemplate[] {
  return ALL_TEMPLATES.filter((t) => t.worker === worker);
}

/**
 * Get template by attempt number
 */
export function getTemplateByAttempt(
  context: CampaignContext,
  attemptNumber: number,
): MessageTemplate | undefined {
  return ALL_TEMPLATES.find(
    (t) => t.context === context && t.attemptNumber === attemptNumber
  );
}

/**
 * Get next template in sequence
 */
export function getNextTemplate(
  context: CampaignContext,
  currentAttemptNumber: number,
): MessageTemplate | undefined {
  const templates = getTemplatesByContext(context);
  const nextAttempt = currentAttemptNumber + 1;

  // Find exact match or highest available
  const exact = templates.find((t) => t.attemptNumber === nextAttempt);
  if (exact) return exact;

  // If no exact match, get highest available
  const maxAttempt = Math.max(...templates.map((t) => t.attemptNumber));
  if (nextAttempt > maxAttempt) return undefined; // Exhausted

  return templates.find((t) => t.attemptNumber === maxAttempt);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ATTEMPT TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

export interface LeadAttemptHistory {
  leadId: string;
  attempts: AttemptRecord[];
  currentContext: CampaignContext;
  totalAttempts: number;
  lastAttemptAt: string;
  lastWorker: DigitalWorkerId;
  status: "active" | "responded" | "opted_out" | "exhausted";
}

export interface AttemptRecord {
  attemptNumber: number;
  templateId: string;
  templateName: string;
  worker: DigitalWorkerId;
  context: CampaignContext;
  sentAt: string;
  deliveredAt?: string;
  response?: {
    receivedAt: string;
    type: string; // interested, question, objection, stop, etc.
    text: string;
  };
}

/**
 * Create a new attempt record
 */
export function createAttemptRecord(
  template: MessageTemplate,
  previousAttempts: number,
): Omit<AttemptRecord, "sentAt" | "deliveredAt" | "response"> {
  return {
    attemptNumber: previousAttempts + 1,
    templateId: template.id,
    templateName: template.name,
    worker: template.worker,
    context: template.context,
  };
}

/**
 * Determine which worker should handle next based on history
 */
export function determineNextWorker(history: LeadAttemptHistory): DigitalWorkerId {
  // If no response after 3+ attempts, switch to CATHY
  if (history.totalAttempts >= 3 && history.status === "active") {
    return "cathy";
  }

  // If responded with interest, switch to SABRINA
  const lastResponse = history.attempts
    .filter((a) => a.response)
    .pop();

  if (lastResponse?.response?.type === "interested") {
    return "sabrina";
  }

  // Default to current context worker
  if (history.currentContext === "initial") return "gianna";
  if (history.currentContext === "nudger") return "cathy";
  if (history.currentContext === "book_appointment") return "sabrina";

  return "gianna";
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE RENDERING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Render a template with variables
 */
export function renderTemplate(
  template: MessageTemplate,
  variables: Record<string, string>,
): { rendered: string; missingVars: string[] } {
  const missingVars: string[] = [];
  let rendered = template.template;

  for (const varName of template.variables) {
    const value = variables[varName];
    if (value) {
      rendered = rendered.replace(new RegExp(`{{${varName}}}`, "g"), value);
    } else {
      missingVars.push(varName);
    }
  }

  return { rendered, missingVars };
}

/**
 * Get template summary for display
 */
export function getTemplateSummary(template: MessageTemplate): string {
  return `[${template.worker.toUpperCase()}] ${template.name} (Attempt #${template.attemptNumber})`;
}

console.log("[Message Templates] Library loaded with", ALL_TEMPLATES.length, "templates");
console.log("  - Initial:", GIANNA_INITIAL_TEMPLATES.length);
console.log("  - Follow-up:", FOLLOW_UP_TEMPLATES.length);
console.log("  - Retarget:", RETARGET_TEMPLATES.length);
console.log("  - Nudger:", CATHY_NUDGER_TEMPLATES.length);
