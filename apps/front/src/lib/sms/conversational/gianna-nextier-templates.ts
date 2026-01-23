/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * GIANNA CONVERSATIONAL SMS TEMPLATES - NEXTIER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 10DLC COMPLIANT - Low Volume Mixed / Conversational Messaging
 *
 * RULES (DO NOT VIOLATE):
 * 1. Max 160 characters (single segment)
 * 2. Identify sender: "Gianna from Nextier" or "Gianna with Nextier"
 * 3. Permission-based: Ask, don't tell
 * 4. No promotional language (FREE, ACT NOW, LIMITED TIME)
 * 5. No opt-out in first message (handled at campaign level)
 * 6. One question per message
 * 7. NY-direct voice: confident, slightly dry, observational
 *
 * CAMPAIGN TYPE: CONVERSATIONAL (not Marketing)
 * USE CASE: One-to-one permission-based business outreach
 */

export type ConversationalCategory =
  | "business_observation"
  | "time_efficiency"
  | "ownership_inquiry"
  | "market_check"
  | "simple_permission"
  | "follow_up"
  | "soft_close";

export interface ConversationalTemplate {
  id: string;
  category: ConversationalCategory;
  template: string;
  variables: string[];
  charCount: number;
  lane: "cold_outreach" | "engaged_leads";
  worker: "gianna" | "cathy" | "sabrina";
}

// ═══════════════════════════════════════════════════════════════════════════════
// LANE A: COLD OUTREACH (Low Volume Mixed)
// Initial contact, permission-seeking openers
// ═══════════════════════════════════════════════════════════════════════════════

// Templates cleared - add your custom templates here
// Available variables: {firstName}, {companyName}, {city}, {state}, {industry}
export const COLD_OUTREACH_TEMPLATES: ConversationalTemplate[] = [];

// ═══════════════════════════════════════════════════════════════════════════════
// LANE B: ENGAGED LEADS (Conversational Messaging)
// Post-response nurturing, follow-ups - ONLY after they respond
// ═══════════════════════════════════════════════════════════════════════════════

// Templates cleared - add your custom follow-up templates here
export const ENGAGED_LEADS_TEMPLATES: ConversationalTemplate[] = [];

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNALHOUSE SUBMISSION SAMPLES
// ═══════════════════════════════════════════════════════════════════════════════

export const SIGNALHOUSE_SAMPLES = {
  laneA_lowVolumeMixed: {
    useCase: "Low Volume Mixed",
    description: `NEXTIER initiates one-to-one outreach to business owners identified through professional directories and public business records. Initial messages are permission-based questions. No promotional content. Messaging continues only after recipient response.`,
    sampleMessages: [
      "{firstName} - Gianna from Nextier. Honest question: does the business run clean, or because you're everywhere all the time?",
      "{firstName}, Gianna here. One question: how much of your week goes to doing the work vs. chasing it?",
      "{firstName} - Gianna with Nextier. Got something I think you'd find interesting. Worth 2 mins of your time?",
      "Great to hear from you {firstName}. I can share more via email if you want - just drop your best address.",
      "{firstName}, Gianna here. If now's not a good time, just let me know and I'll back off. No pressure.",
    ],
    messageFlow: `Consumers provide consent via professional directories, business listings, and opt-in forms on nextier.signalhouse.io. Initial message asks permission or poses a question. Subsequent messages only sent after consumer response. Reply HELP for assistance, STOP to opt out.`,
    optInKeywords: "START, SUBSCRIBE, YES",
    optOutKeywords: "STOP, UNSUBSCRIBE, CANCEL, END, QUIT",
    helpKeywords: "HELP, INFO",
    helpResponse:
      "NEXTIER provides advisory services for business owners. Reply STOP to opt out. Questions? tb@outreachglobal.io",
    optOutResponse:
      "You've been unsubscribed from NEXTIER messages. Reply START to resubscribe.",
  },
  laneB_conversational: {
    useCase: "Conversational Messaging",
    description: `Ongoing conversational messaging with business owners who have responded to initial outreach. Messages are advisory, non-promotional, and focused on scheduling discussions. Two-way dialogue only.`,
    sampleMessages: [
      "Great to hear from you {firstName}. I can share more via email if you want - just drop your best address.",
      "{firstName}, appreciate the response. What's the best way to continue this - call, email, or keep texting?",
      "{firstName} - glad you're open to it. What's the best email to send some info to?",
      "No worries {firstName}. If you change your mind down the road, you've got my number. Take care.",
      "{firstName}, understood. I'll leave you alone. If anything changes, just text back. -Gianna",
    ],
    messageFlow: `This campaign is for leads who have already responded to initial outreach. All messaging is two-way conversational dialogue. Messages focus on scheduling calls or gathering contact information for email follow-up. No unsolicited outbound.`,
    optInKeywords: "START, YES, CONTINUE",
    optOutKeywords: "STOP, UNSUBSCRIBE, CANCEL, END, QUIT",
    helpKeywords: "HELP, INFO",
    helpResponse:
      "NEXTIER provides advisory services for business owners. Reply STOP to opt out. Questions? tb@outreachglobal.io",
    optOutResponse:
      "You've been unsubscribed from NEXTIER messages. Reply START to resubscribe.",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const ALL_CONVERSATIONAL_TEMPLATES = [
  ...COLD_OUTREACH_TEMPLATES,
  ...ENGAGED_LEADS_TEMPLATES,
];

// Helper functions
export function getTemplatesByCategory(
  category: ConversationalCategory,
): ConversationalTemplate[] {
  return ALL_CONVERSATIONAL_TEMPLATES.filter((t) => t.category === category);
}

export function getTemplatesByLane(
  lane: "cold_outreach" | "engaged_leads",
): ConversationalTemplate[] {
  return ALL_CONVERSATIONAL_TEMPLATES.filter((t) => t.lane === lane);
}

export function getRandomTemplate(
  category: ConversationalCategory,
): ConversationalTemplate | undefined {
  const templates = getTemplatesByCategory(category);
  return templates[Math.floor(Math.random() * templates.length)];
}

export function renderConversationalTemplate(
  template: ConversationalTemplate,
  variables: Record<string, string>,
): string {
  let rendered = template.template;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`{${key}}`, "g"), value);
  }
  return rendered;
}

// Validation - ensure all templates are <= 160 chars
export function validateTemplates(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const t of ALL_CONVERSATIONAL_TEMPLATES) {
    if (t.template.length > 160) {
      errors.push(`Template ${t.id} exceeds 160 chars (${t.template.length})`);
    }
    if (!t.template.includes("Gianna")) {
      errors.push(`Template ${t.id} missing sender identification`);
    }
  }
  return { valid: errors.length === 0, errors };
}

console.log(
  `[Conversational Templates] Loaded ${ALL_CONVERSATIONAL_TEMPLATES.length} templates`,
);
console.log(`  - Cold Outreach: ${COLD_OUTREACH_TEMPLATES.length}`);
console.log(`  - Engaged Leads: ${ENGAGED_LEADS_TEMPLATES.length}`);
