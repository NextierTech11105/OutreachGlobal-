/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NEXTIER SMS OPENER TEMPLATES - GTM LIBRARY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * THE "BE LIKE WATER" TEMPLATE SYSTEM
 * Same AI Agents (LUCI → GIANNA → CATHY → SABRINA)
 * Different positioning per persona/vertical
 *
 * FLOW:
 *   1. LUCI fetches from USBizData → Skip traces → Scores leads
 *   2. Campaign PREP (batch selection) → PREVIEW (human review) → EXECUTE (autopilot)
 *   3. GIANNA sends initial blast via SignalHouse
 *   4. Inbound Response Center handles all replies
 *   5. CATHY nudges ghosts | SABRINA closes hot leads
 *
 * 160 CHAR MAX for SMS - Blunt, direct, value-first
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export type TargetPersona =
  | "business_broker"
  | "real_estate_agent"
  | "real_estate_broker"
  | "ma_consultant"
  | "private_equity"
  | "roll_up_operator"
  | "business_owner_exit";

export type TemplateCategory =
  | "initial_opener"
  | "follow_up"
  | "value_drop"
  | "curiosity"
  | "social_proof"
  | "urgency"
  | "challenge";

export interface SmsTemplate {
  id: string;
  persona: TargetPersona;
  category: TemplateCategory;
  message: string;
  variables: string[];
  charCount: number;
  agent: "gianna" | "cathy" | "sabrina";
}

// ═══════════════════════════════════════════════════════════════════════════════
// GIANNA INITIAL OPENERS BY PERSONA
// ═══════════════════════════════════════════════════════════════════════════════
// Templates cleared - build fresh for each campaign

export const NEXTIER_OPENERS: Record<TargetPersona, SmsTemplate[]> = {
  business_broker: [],
  real_estate_agent: [],
  real_estate_broker: [],
  ma_consultant: [],
  private_equity: [],
  roll_up_operator: [],
  business_owner_exit: [],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CATHY NUDGE TEMPLATES - Ghost Revival
// ═══════════════════════════════════════════════════════════════════════════════

// Templates cleared - build fresh for each campaign
export const CATHY_NUDGES: SmsTemplate[] = [];

// ═══════════════════════════════════════════════════════════════════════════════
// SABRINA CLOSER TEMPLATES - Aggressive Booking
// ═══════════════════════════════════════════════════════════════════════════════

// Templates cleared - build fresh for each campaign
export const SABRINA_CLOSERS: SmsTemplate[] = [];

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE SELECTION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function getOpenersByPersona(persona: TargetPersona): SmsTemplate[] {
  return NEXTIER_OPENERS[persona] || [];
}

export function getRandomOpener(persona: TargetPersona): SmsTemplate | null {
  const openers = NEXTIER_OPENERS[persona];
  if (!openers || openers.length === 0) return null;
  return openers[Math.floor(Math.random() * openers.length)];
}

export function personalizeTemplate(
  template: SmsTemplate,
  variables: Record<string, string>,
): string {
  let message = template.message;
  for (const [key, value] of Object.entries(variables)) {
    message = message.replace(new RegExp(`{${key}}`, "g"), value);
  }
  return message;
}

export function getAllTemplates(): SmsTemplate[] {
  const all: SmsTemplate[] = [];
  for (const persona of Object.keys(NEXTIER_OPENERS) as TargetPersona[]) {
    all.push(...NEXTIER_OPENERS[persona]);
  }
  all.push(...CATHY_NUDGES);
  all.push(...SABRINA_CLOSERS);
  return all;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GTM CONFIGURATION - How we sell to each persona
// ═══════════════════════════════════════════════════════════════════════════════

// GTM positioning cleared - configure per campaign
export const GTM_POSITIONING: Record<
  TargetPersona,
  {
    headline: string;
    valueProps: string[];
    objectionHandlers: Record<string, string>;
    closeStrategy: string;
  }
> = {
  business_broker: {
    headline: "",
    valueProps: [],
    objectionHandlers: {},
    closeStrategy: "",
  },
  real_estate_agent: {
    headline: "",
    valueProps: [],
    objectionHandlers: {},
    closeStrategy: "",
  },
  real_estate_broker: {
    headline: "",
    valueProps: [],
    objectionHandlers: {},
    closeStrategy: "",
  },
  ma_consultant: {
    headline: "",
    valueProps: [],
    objectionHandlers: {},
    closeStrategy: "",
  },
  private_equity: {
    headline: "",
    valueProps: [],
    objectionHandlers: {},
    closeStrategy: "",
  },
  roll_up_operator: {
    headline: "",
    valueProps: [],
    objectionHandlers: {},
    closeStrategy: "",
  },
  business_owner_exit: {
    headline: "",
    valueProps: [],
    objectionHandlers: {},
    closeStrategy: "",
  },
};
