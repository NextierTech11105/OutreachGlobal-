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

export const COLD_OUTREACH_TEMPLATES: ConversationalTemplate[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // BUSINESS OBSERVATION (10 templates)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "conv_obs_1",
    category: "business_observation",
    template:
      "{firstName} - Gianna from Nextier. Honest question: does the business run clean, or because you're everywhere all the time?",
    variables: ["firstName"],
    charCount: 120,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_obs_2",
    category: "business_observation",
    template:
      "{firstName}, Gianna here. Noticed {companyName} in {city}. Just curious - lifestyle business or are you trying to scale?",
    variables: ["firstName", "companyName", "city"],
    charCount: 118,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_obs_3",
    category: "business_observation",
    template:
      "{firstName} - Gianna with Nextier. Question about {companyName}: you got systems, or is everything still in your head?",
    variables: ["firstName", "companyName"],
    charCount: 117,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_obs_4",
    category: "business_observation",
    template:
      "{firstName}, it's Gianna. Your {industry} business came up in my research. Quick question - you happy with how it runs?",
    variables: ["firstName", "industry"],
    charCount: 119,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_obs_5",
    category: "business_observation",
    template:
      "{firstName} - Gianna from Nextier. Saw {companyName}. Not selling anything, just curious: what's working best for you right now?",
    variables: ["firstName", "companyName"],
    charCount: 128,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_obs_6",
    category: "business_observation",
    template:
      "{firstName}, Gianna here. Noticed you've been in {industry} a while. Question - still enjoying it or ready for something different?",
    variables: ["firstName", "industry"],
    charCount: 132,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_obs_7",
    category: "business_observation",
    template:
      "{firstName} - Gianna with Nextier. Your business popped up in {city}. One question: you the owner or just running operations?",
    variables: ["firstName", "city"],
    charCount: 125,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_obs_8",
    category: "business_observation",
    template:
      "{firstName}, it's Gianna. Researching {industry} in {state}. Mind if I ask what's your biggest headache right now?",
    variables: ["firstName", "industry", "state"],
    charCount: 114,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_obs_9",
    category: "business_observation",
    template:
      "{firstName} - Gianna from Nextier. {companyName} looks solid. Curious - you ever think about what comes next?",
    variables: ["firstName", "companyName"],
    charCount: 109,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_obs_10",
    category: "business_observation",
    template:
      "{firstName}, Gianna here. I work with {industry} owners. Not pitching - just wondering how things are going for you lately?",
    variables: ["firstName", "industry"],
    charCount: 123,
    lane: "cold_outreach",
    worker: "gianna",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TIME/EFFICIENCY CHECK (8 templates)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "conv_time_1",
    category: "time_efficiency",
    template:
      "{firstName}, Gianna from Nextier. One question: how much of your week goes to doing the work vs. chasing it?",
    variables: ["firstName"],
    charCount: 111,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_time_2",
    category: "time_efficiency",
    template:
      "{firstName} - it's Gianna. Quick one: when's the last time you took a real day off? Not selling anything.",
    variables: ["firstName"],
    charCount: 105,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_time_3",
    category: "time_efficiency",
    template:
      "{firstName}, Gianna here. Honest question - you spending more time on the business or in the business?",
    variables: ["firstName"],
    charCount: 103,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_time_4",
    category: "time_efficiency",
    template:
      "{firstName} - Gianna with Nextier. Curious: if you took a week off, would {companyName} still run?",
    variables: ["firstName", "companyName"],
    charCount: 99,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_time_5",
    category: "time_efficiency",
    template:
      "{firstName}, it's Gianna. Question for {industry} owners: you working more hours now than 5 years ago? Less?",
    variables: ["firstName", "industry"],
    charCount: 110,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_time_6",
    category: "time_efficiency",
    template:
      "{firstName} - Gianna from Nextier. What's eating most of your time lately? Just curious.",
    variables: ["firstName"],
    charCount: 90,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_time_7",
    category: "time_efficiency",
    template:
      "{firstName}, Gianna here. Most owners I talk to say they're maxed out. That true for you too?",
    variables: ["firstName"],
    charCount: 96,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_time_8",
    category: "time_efficiency",
    template:
      "{firstName} - it's Gianna. Between running the business and working in it - which one's winning?",
    variables: ["firstName"],
    charCount: 98,
    lane: "cold_outreach",
    worker: "gianna",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // OWNERSHIP INQUIRY (8 templates)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "conv_own_1",
    category: "ownership_inquiry",
    template:
      "{firstName}, Gianna from Nextier. Your business ever been valued? Not selling anything - just curious if you know your number.",
    variables: ["firstName"],
    charCount: 126,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_own_2",
    category: "ownership_inquiry",
    template:
      "{firstName} - Gianna here. Question: {companyName} - that your retirement plan or just your current gig?",
    variables: ["firstName", "companyName"],
    charCount: 104,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_own_3",
    category: "ownership_inquiry",
    template:
      "{firstName}, it's Gianna with Nextier. You ever think about what {companyName} would sell for? Just wondering.",
    variables: ["firstName", "companyName"],
    charCount: 112,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_own_4",
    category: "ownership_inquiry",
    template:
      "{firstName} - Gianna from Nextier. Quick question: you planning to run {companyName} forever or is there an exit in mind?",
    variables: ["firstName", "companyName"],
    charCount: 121,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_own_5",
    category: "ownership_inquiry",
    template:
      "{firstName}, Gianna here. Owners in {industry} are getting interesting offers lately. You getting any calls?",
    variables: ["firstName", "industry"],
    charCount: 110,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_own_6",
    category: "ownership_inquiry",
    template:
      "{firstName} - it's Gianna. Just curious: you got a succession plan for {companyName} or playing it by ear?",
    variables: ["firstName", "companyName"],
    charCount: 107,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_own_7",
    category: "ownership_inquiry",
    template:
      "{firstName}, Gianna with Nextier. Question - anyone in the family taking over, or is that not the plan?",
    variables: ["firstName"],
    charCount: 104,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_own_8",
    category: "ownership_inquiry",
    template:
      "{firstName} - Gianna here. You know what businesses like yours are going for right now? Might surprise you.",
    variables: ["firstName"],
    charCount: 111,
    lane: "cold_outreach",
    worker: "gianna",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // MARKET/INDUSTRY CHECK (7 templates)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "conv_mkt_1",
    category: "market_check",
    template:
      "{firstName}, it's Gianna. How's the {industry} market treating you right now? Better or worse than last year?",
    variables: ["firstName", "industry"],
    charCount: 109,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_mkt_2",
    category: "market_check",
    template:
      "{firstName} - Gianna from Nextier. {industry} seems busy lately. You seeing that too or am I off?",
    variables: ["firstName", "industry"],
    charCount: 98,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_mkt_3",
    category: "market_check",
    template:
      "{firstName}, Gianna here. Hearing mixed things about {industry} in {state}. What's your take?",
    variables: ["firstName", "industry", "state"],
    charCount: 95,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_mkt_4",
    category: "market_check",
    template:
      "{firstName} - it's Gianna. Economy's been weird. How's that hitting {companyName}? Curious to hear.",
    variables: ["firstName", "companyName"],
    charCount: 101,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_mkt_5",
    category: "market_check",
    template:
      "{firstName}, Gianna with Nextier. What's the biggest change you've seen in {industry} this year?",
    variables: ["firstName", "industry"],
    charCount: 99,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_mkt_6",
    category: "market_check",
    template:
      "{firstName} - Gianna here. Talking to {industry} owners in {city}. Things looking up or still rough?",
    variables: ["firstName", "industry", "city"],
    charCount: 101,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_mkt_7",
    category: "market_check",
    template:
      "{firstName}, it's Gianna from Nextier. Competition in {industry} getting tighter or you holding strong?",
    variables: ["firstName", "industry"],
    charCount: 104,
    lane: "cold_outreach",
    worker: "gianna",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // SIMPLE PERMISSION (7 templates)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "conv_perm_1",
    category: "simple_permission",
    template:
      "{firstName} - Gianna with Nextier. Got something I think you'd find interesting. Worth 2 mins of your time?",
    variables: ["firstName"],
    charCount: 108,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_perm_2",
    category: "simple_permission",
    template:
      "{firstName}, Gianna here. Can I ask you something about {companyName}? Just one question.",
    variables: ["firstName", "companyName"],
    charCount: 91,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_perm_3",
    category: "simple_permission",
    template:
      "{firstName} - it's Gianna from Nextier. Mind if I share something with you? No strings attached.",
    variables: ["firstName"],
    charCount: 97,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_perm_4",
    category: "simple_permission",
    template:
      "{firstName}, Gianna with Nextier. Got a quick question for you if you've got 30 seconds.",
    variables: ["firstName"],
    charCount: 92,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_perm_5",
    category: "simple_permission",
    template:
      "{firstName} - Gianna here. Something came up that made me think of your business. Worth a quick chat?",
    variables: ["firstName"],
    charCount: 102,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_perm_6",
    category: "simple_permission",
    template:
      "{firstName}, it's Gianna. I've got an idea I want to run by you. Open to hearing it?",
    variables: ["firstName"],
    charCount: 86,
    lane: "cold_outreach",
    worker: "gianna",
  },
  {
    id: "conv_perm_7",
    category: "simple_permission",
    template:
      "{firstName} - Gianna from Nextier. Quick one: you open to a conversation about {companyName}?",
    variables: ["firstName", "companyName"],
    charCount: 97,
    lane: "cold_outreach",
    worker: "gianna",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// LANE B: ENGAGED LEADS (Conversational Messaging)
// Post-response nurturing, follow-ups - ONLY after they respond
// ═══════════════════════════════════════════════════════════════════════════════

export const ENGAGED_LEADS_TEMPLATES: ConversationalTemplate[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // FOLLOW-UP (After they respond)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "conv_fu_1",
    category: "follow_up",
    template:
      "Great to hear from you {firstName}. I can share more via email if you want - just drop your best address.",
    variables: ["firstName"],
    charCount: 102,
    lane: "engaged_leads",
    worker: "gianna",
  },
  {
    id: "conv_fu_2",
    category: "follow_up",
    template:
      "{firstName}, appreciate the response. What's the best way to continue this - call, email, or keep texting?",
    variables: ["firstName"],
    charCount: 106,
    lane: "engaged_leads",
    worker: "gianna",
  },
  {
    id: "conv_fu_3",
    category: "follow_up",
    template:
      "Thanks for getting back {firstName}. Got a few things I think would help. Email work for you?",
    variables: ["firstName"],
    charCount: 95,
    lane: "engaged_leads",
    worker: "gianna",
  },
  {
    id: "conv_fu_4",
    category: "follow_up",
    template:
      "{firstName} - glad you're open to it. What's the best email to send some info to?",
    variables: ["firstName"],
    charCount: 83,
    lane: "engaged_leads",
    worker: "gianna",
  },
  {
    id: "conv_fu_5",
    category: "follow_up",
    template:
      "Good to connect {firstName}. Quick question before I send anything over - what's your main priority right now?",
    variables: ["firstName"],
    charCount: 111,
    lane: "engaged_leads",
    worker: "gianna",
  },
  {
    id: "conv_fu_6",
    category: "follow_up",
    template:
      "{firstName}, perfect. I'll put something together. Best email for you?",
    variables: ["firstName"],
    charCount: 71,
    lane: "engaged_leads",
    worker: "gianna",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // SOFT CLOSE (Offering to stop / respect boundaries)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "conv_soft_1",
    category: "soft_close",
    template:
      "{firstName}, Gianna here. If now's not a good time, just let me know and I'll back off. No pressure.",
    variables: ["firstName"],
    charCount: 100,
    lane: "engaged_leads",
    worker: "gianna",
  },
  {
    id: "conv_soft_2",
    category: "soft_close",
    template:
      "{firstName} - totally get it if this isn't the right time. Just say the word and I won't bother you again.",
    variables: ["firstName"],
    charCount: 108,
    lane: "engaged_leads",
    worker: "gianna",
  },
  {
    id: "conv_soft_3",
    category: "soft_close",
    template:
      "No worries {firstName}. If you change your mind down the road, you've got my number. Take care.",
    variables: ["firstName"],
    charCount: 97,
    lane: "engaged_leads",
    worker: "gianna",
  },
  {
    id: "conv_soft_4",
    category: "soft_close",
    template:
      "{firstName}, understood. I'll leave you alone. If anything changes, just text back. -Gianna",
    variables: ["firstName"],
    charCount: 93,
    lane: "engaged_leads",
    worker: "gianna",
  },
];

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
