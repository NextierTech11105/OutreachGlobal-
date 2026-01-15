/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * THE BLITZ - Weekly SMS Outbound Until 20K Baseline
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PHILOSOPHY:
 * - Weekly blitz until 20K ultra-targeted baseline
 * - ICP defined → Personas mapped
 * - 160-char compliant messaging (single SMS segment)
 * - Scale the outbound response machine
 *
 * THE LOOP handles responses. THE BLITZ fills THE LOOP.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ICP - IDEAL CUSTOMER PROFILE
// ═══════════════════════════════════════════════════════════════════════════════

export interface ICP {
  id: string;
  name: string;
  vertical: string;
  titles: string[];
  companySize: { min: number; max: number };
  industries: string[];
  painPoints: string[];
  decisionPower: "direct" | "influencer" | "gatekeeper";
  budget: "high" | "medium" | "low";
}

export const NEXTIER_ICPs: Record<string, ICP> = {
  // B2B Decision Makers
  CEO_FOUNDER: {
    id: "ceo_founder",
    name: "CEO/Founder",
    vertical: "B2B",
    titles: ["CEO", "Founder", "Owner", "President", "Managing Director"],
    companySize: { min: 5, max: 500 },
    industries: ["Technology", "Professional Services", "Marketing", "Consulting"],
    painPoints: ["Lead generation", "Sales pipeline", "Time management", "Scaling"],
    decisionPower: "direct",
    budget: "high",
  },

  MARKETING_LEADER: {
    id: "marketing_leader",
    name: "Marketing Leader",
    vertical: "B2B",
    titles: ["CMO", "VP Marketing", "Marketing Director", "Head of Marketing"],
    companySize: { min: 10, max: 1000 },
    industries: ["SaaS", "E-commerce", "Agency", "B2B Services"],
    painPoints: ["Lead quality", "CAC", "Attribution", "Pipeline velocity"],
    decisionPower: "direct",
    budget: "high",
  },

  SALES_LEADER: {
    id: "sales_leader",
    name: "Sales Leader",
    vertical: "B2B",
    titles: ["VP Sales", "Sales Director", "Head of Sales", "CRO"],
    companySize: { min: 10, max: 500 },
    industries: ["SaaS", "Technology", "Professional Services"],
    painPoints: ["Pipeline", "Conversion rates", "Rep productivity", "Outbound"],
    decisionPower: "direct",
    budget: "high",
  },

  // Real Estate Technology
  REAL_ESTATE_AGENT: {
    id: "re_agent",
    name: "Real Estate Agent",
    vertical: "REAL_ESTATE_TECH",
    titles: ["Real Estate Agent", "Realtor", "Broker", "Associate Broker"],
    companySize: { min: 1, max: 50 },
    industries: ["Real Estate", "Property"],
    painPoints: ["Lead generation", "Follow-up", "Time management", "Closing"],
    decisionPower: "direct",
    budget: "medium",
  },

  PROPERTY_INVESTOR: {
    id: "property_investor",
    name: "Property Investor",
    vertical: "REAL_ESTATE_TECH",
    titles: ["Real Estate Investor", "Property Owner", "Landlord", "Developer"],
    companySize: { min: 1, max: 100 },
    industries: ["Real Estate Investment", "Property Management"],
    painPoints: ["Deal flow", "Off-market deals", "Seller outreach", "Scaling"],
    decisionPower: "direct",
    budget: "high",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PERSONAS - Mapped to ICPs
// ═══════════════════════════════════════════════════════════════════════════════

export interface Persona {
  id: string;
  name: string;
  icpId: string;
  tone: "professional" | "casual" | "direct" | "friendly";
  urgency: "high" | "medium" | "low";
  valueProps: string[];
  objections: string[];
  cta: string;
}

export const PERSONAS: Record<string, Persona> = {
  BUSY_CEO: {
    id: "busy_ceo",
    name: "Busy CEO",
    icpId: "ceo_founder",
    tone: "direct",
    urgency: "high",
    valueProps: ["Save 20+ hrs/week", "Scale without hiring", "Predictable pipeline"],
    objections: ["No time", "Already have team", "Tried before"],
    cta: "15-min call to show you",
  },

  GROWTH_MARKETER: {
    id: "growth_marketer",
    name: "Growth Marketer",
    icpId: "marketing_leader",
    tone: "professional",
    urgency: "medium",
    valueProps: ["Lower CAC", "More qualified leads", "Automated nurture"],
    objections: ["Budget constraints", "Need to see ROI", "Complex stack"],
    cta: "Quick demo of the workflow",
  },

  HUNGRY_AGENT: {
    id: "hungry_agent",
    name: "Hungry Agent",
    icpId: "re_agent",
    tone: "friendly",
    urgency: "high",
    valueProps: ["More listings", "Automated follow-up", "Never miss a lead"],
    objections: ["Already have CRM", "Too expensive", "No tech skills"],
    cta: "See how top agents use this",
  },

  DEAL_HUNTER: {
    id: "deal_hunter",
    name: "Deal Hunter",
    icpId: "property_investor",
    tone: "direct",
    urgency: "high",
    valueProps: ["Off-market deals", "Seller outreach at scale", "Beat competition"],
    objections: ["Have cold callers", "Texts don't work", "Need volume"],
    cta: "15-min to show the system",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 160-CHAR COMPLIANT MESSAGING - Single SMS Segment
// ═══════════════════════════════════════════════════════════════════════════════

export interface SMSTemplate {
  id: string;
  personaId: string;
  stage: "opener" | "nudge" | "value" | "close";
  message: string;
  charCount: number;
  variables: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10DLC COMPLIANT MESSAGING - CJRCU60 Approved
// ═══════════════════════════════════════════════════════════════════════════════
// ALL MESSAGES MUST:
// 1. Be ≤160 chars for single segment
// 2. Include "Reply STOP to opt out" or similar
// 3. End with brand identifier "-NEXTIER"
//
// Approved sample format:
// "We're here to save you time AND money. Let me know when you're free for a quick call. Respond STOP to opt out from NEXTIER"

export const SMS_TEMPLATES: SMSTemplate[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // B2B CEO/FOUNDER - Direct, time-focused (Campaign: B2B)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "ceo_opener_1",
    personaId: "busy_ceo",
    stage: "opener",
    message: "Hi {firstName}, save 20+ hrs/week on outbound with AI. Quick call to show you? Reply STOP to opt out -NEXTIER",
    charCount: 113,
    variables: ["firstName"],
  },
  {
    id: "ceo_nudge_1",
    personaId: "busy_ceo",
    stage: "nudge",
    message: "{firstName}, most founders are buried in sales tasks. I have a fix - 15 min call? Reply STOP to opt out -NEXTIER",
    charCount: 117,
    variables: ["firstName"],
  },
  {
    id: "ceo_value_1",
    personaId: "busy_ceo",
    stage: "value",
    message: "{firstName}, scale outbound without hiring. Book 15 min: {link} Reply STOP to opt out -NEXTIER",
    charCount: 99,
    variables: ["firstName", "link"],
  },
  {
    id: "ceo_close_1",
    personaId: "busy_ceo",
    stage: "close",
    message: "Last note {firstName} - let me show you the system. No pitch: {link} Reply STOP to opt out -NEXTIER",
    charCount: 105,
    variables: ["firstName", "link"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MARKETING LEADER - Professional, ROI-focused
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "marketer_opener_1",
    personaId: "growth_marketer",
    stage: "opener",
    message: "Hi {firstName}, lower your CAC with AI-powered outbound. Worth a look? Reply STOP to opt out -NEXTIER",
    charCount: 106,
    variables: ["firstName"],
  },
  {
    id: "marketer_nudge_1",
    personaId: "growth_marketer",
    stage: "nudge",
    message: "{firstName}, automate your pipeline with qualified leads on autopilot. Quick demo? Reply STOP to opt out -NEXTIER",
    charCount: 118,
    variables: ["firstName"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // REAL ESTATE AGENT - Friendly, opportunity-focused
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "agent_opener_1",
    personaId: "hungry_agent",
    stage: "opener",
    message: "Hi {firstName}! Finding new listings takes time. Got a system that works. Want to see? Reply STOP to opt out -NEXTIER",
    charCount: 120,
    variables: ["firstName"],
  },
  {
    id: "agent_nudge_1",
    personaId: "hungry_agent",
    stage: "nudge",
    message: "{firstName}, automate your follow-up and never miss a lead. Quick call? Reply STOP to opt out -NEXTIER",
    charCount: 107,
    variables: ["firstName"],
  },
  {
    id: "agent_value_1",
    personaId: "hungry_agent",
    stage: "value",
    message: "{firstName}, top agents use this for more listings. 15 min to show you: {link} Reply STOP to opt out -NEXTIER",
    charCount: 116,
    variables: ["firstName", "link"],
  },
  {
    id: "agent_close_1",
    personaId: "hungry_agent",
    stage: "close",
    message: "Last message {firstName} - more listings, less cold calling: {link} Reply STOP to opt out -NEXTIER",
    charCount: 105,
    variables: ["firstName", "link"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROPERTY INVESTOR - Direct, results-focused
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "investor_opener_1",
    personaId: "deal_hunter",
    stage: "opener",
    message: "Hi {firstName}, off-market seller outreach at scale. Interested? Reply STOP to opt out -NEXTIER",
    charCount: 99,
    variables: ["firstName"],
  },
  {
    id: "investor_nudge_1",
    personaId: "deal_hunter",
    stage: "nudge",
    message: "{firstName}, replace cold calling with automated SMS that converts. 15 min? Reply STOP to opt out -NEXTIER",
    charCount: 112,
    variables: ["firstName"],
  },
  {
    id: "investor_value_1",
    personaId: "deal_hunter",
    stage: "value",
    message: "{firstName}, more off-market deals without the grind. See how: {link} Reply STOP to opt out -NEXTIER",
    charCount: 107,
    variables: ["firstName", "link"],
  },
  {
    id: "investor_close_1",
    personaId: "deal_hunter",
    stage: "close",
    message: "Last shot {firstName} - book 15 min and I'll show you the system: {link} Reply STOP to opt out -NEXTIER",
    charCount: 111,
    variables: ["firstName", "link"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HOME SERVICES - Friendly, value-focused
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "homeservices_opener_1",
    personaId: "homeservices_owner",
    stage: "opener",
    message: "Hi {firstName}, get more {industry} leads on autopilot. Worth a look? Reply STOP to opt out -NEXTIER",
    charCount: 104,
    variables: ["firstName", "industry"],
  },
  {
    id: "homeservices_nudge_1",
    personaId: "homeservices_owner",
    stage: "nudge",
    message: "{firstName}, automate your lead follow-up and close more jobs. Quick call? Reply STOP to opt out -NEXTIER",
    charCount: 110,
    variables: ["firstName"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TRUCKING - Direct, efficiency-focused
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "trucking_opener_1",
    personaId: "fleet_owner",
    stage: "opener",
    message: "Hi {firstName}, streamline your fleet ops with AI automation. Worth a look? Reply STOP to opt out -NEXTIER",
    charCount: 111,
    variables: ["firstName"],
  },
  {
    id: "trucking_nudge_1",
    personaId: "fleet_owner",
    stage: "nudge",
    message: "{firstName}, save time on dispatch and driver coordination. Quick call? Reply STOP to opt out -NEXTIER",
    charCount: 108,
    variables: ["firstName"],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// THE BLITZ CONFIG - Weekly Execution
// ═══════════════════════════════════════════════════════════════════════════════

export const THE_BLITZ = {
  // Weekly cadence
  CADENCE: "weekly" as const,

  // Target baseline
  BASELINE_TARGET: 20000,

  // Weekly upload size (1-5K blocks)
  WEEKLY_BLOCK_SIZE: {
    min: 1000,
    max: 5000,
    recommended: 2000,
  },

  // Ultra-targeted = quality over quantity
  TARGETING: {
    requirePhone: true,
    requireEmail: false, // Nice to have
    matchICP: true,
    skipTraceFirst: true,
  },

  // Execution timing
  TIMING: {
    preferredDays: ["Tuesday", "Wednesday", "Thursday"],
    preferredHours: { start: 9, end: 17 },
    timezone: "America/New_York",
  },

  // Scale progression
  SCALE_PLAN: [
    { week: 1, target: 2000, description: "Initial blitz - test messaging" },
    { week: 2, target: 3000, description: "Increase volume, refine ICPs" },
    { week: 3, target: 4000, description: "Scale winners, cut losers" },
    { week: 4, target: 5000, description: "Full throttle on proven personas" },
    { week: 5, target: 5000, description: "Maintain, optimize response handling" },
    // Continue until 20K baseline
  ],
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Get template for persona + stage
// ═══════════════════════════════════════════════════════════════════════════════

export function getTemplate(
  personaId: string,
  stage: SMSTemplate["stage"],
): SMSTemplate | undefined {
  return SMS_TEMPLATES.find(
    (t) => t.personaId === personaId && t.stage === stage,
  );
}

export function renderTemplate(
  template: SMSTemplate,
  variables: Record<string, string>,
): string {
  let message = template.message;
  for (const [key, value] of Object.entries(variables)) {
    message = message.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return message;
}

export function validateCharCount(message: string): {
  valid: boolean;
  count: number;
  segments: number;
} {
  const count = message.length;
  const segments = Math.ceil(count / 160);
  return {
    valid: count <= 160,
    count,
    segments,
  };
}

console.log("[THE BLITZ] Loaded - Weekly SMS outbound until 20K baseline");
