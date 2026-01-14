/**
 * SMS Stage Cartridges
 *
 * REMIXABLE TEMPLATES - 160 CHARS MAX
 *
 * Stages:
 * 1. INITIAL - First touch (GIANNA)
 * 2. NUDGER - Follow-up if no response (CATHY)
 * 3. NURTURE - Long-term engagement
 * 4. RETARGET - Re-engage cold leads
 * 5. CLOSER - Final push for conversion (SABRINA)
 *
 * Structure:
 * [HOOK] + [BODY] + [CTA] + [COMPLIANCE]
 *
 * Max: 160 characters (single SMS segment)
 */

// =============================================================================
// TYPES
// =============================================================================

export type Stage = "initial" | "nudger" | "nurture" | "retarget" | "closer";
export type Tone = "professional" | "friendly" | "casual" | "urgent" | "warm";
export type Intent = "book_call" | "get_response" | "qualify" | "close_deal" | "re_engage";

export interface Cartridge {
  id: string;
  stage: Stage;
  tone: Tone;
  intent: Intent;
  worker: "GIANNA" | "CATHY" | "SABRINA" | "SYSTEM";
  template: string;
  maxChars: 160;
  variables: string[];
}

export interface CartridgeVariables {
  firstName?: string;
  company?: string;
  industry?: string;
  city?: string;
  daysSince?: number;
  brand?: string;
}

// =============================================================================
// COMPLIANCE FOOTER (fits in 26 chars)
// =============================================================================

const OPT_OUT = "STOP to opt out"; // 15 chars

// =============================================================================
// STAGE 1: INITIAL (GIANNA - First Touch)
// =============================================================================

export const INITIAL_CARTRIDGES: Cartridge[] = [
  {
    id: "init_pro_01",
    stage: "initial",
    tone: "professional",
    intent: "book_call",
    worker: "GIANNA",
    template: "{{firstName}}, helping {{industry}} companies grow revenue. Quick call this week? {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName", "industry"],
  },
  {
    id: "init_pro_02",
    stage: "initial",
    tone: "professional",
    intent: "book_call",
    worker: "GIANNA",
    template: "Hi {{firstName}}, noticed {{company}} - I work with similar businesses. 10 min chat? {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName", "company"],
  },
  {
    id: "init_fri_01",
    stage: "initial",
    tone: "friendly",
    intent: "book_call",
    worker: "GIANNA",
    template: "Hey {{firstName}}! Working with {{industry}} in {{city}}. Would love to connect! {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName", "industry", "city"],
  },
  {
    id: "init_fri_02",
    stage: "initial",
    tone: "friendly",
    intent: "get_response",
    worker: "GIANNA",
    template: "{{firstName}}, we help save time AND money. Free for a quick call this week? {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName"],
  },
  {
    id: "init_cas_01",
    stage: "initial",
    tone: "casual",
    intent: "get_response",
    worker: "GIANNA",
    template: "{{firstName}}, quick question about {{company}} - got 2 min? {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName", "company"],
  },
  {
    id: "init_cas_02",
    stage: "initial",
    tone: "casual",
    intent: "book_call",
    worker: "GIANNA",
    template: "Hey {{firstName}}, saw {{company}} is growing - I might be able to help. Call? {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName", "company"],
  },
  {
    id: "init_urg_01",
    stage: "initial",
    tone: "urgent",
    intent: "book_call",
    worker: "GIANNA",
    template: "{{firstName}}, your competitors are already using this. Don't miss out - call? {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName"],
  },
  {
    id: "init_wrm_01",
    stage: "initial",
    tone: "warm",
    intent: "get_response",
    worker: "GIANNA",
    template: "Hi {{firstName}}! Thought of {{company}} today - would love to share an idea. {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName", "company"],
  },
];

// =============================================================================
// STAGE 2: NUDGER (CATHY - Follow-up)
// =============================================================================

export const NUDGER_CARTRIDGES: Cartridge[] = [
  {
    id: "nudge_pro_01",
    stage: "nudger",
    tone: "professional",
    intent: "get_response",
    worker: "CATHY",
    template: "{{firstName}}, following up - still interested in discussing {{company}}'s growth? {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName", "company"],
  },
  {
    id: "nudge_pro_02",
    stage: "nudger",
    tone: "professional",
    intent: "book_call",
    worker: "CATHY",
    template: "Hi {{firstName}}, wanted to reconnect. Is this week better for a quick chat? {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName"],
  },
  {
    id: "nudge_fri_01",
    stage: "nudger",
    tone: "friendly",
    intent: "get_response",
    worker: "CATHY",
    template: "{{firstName}}! Just checking in - did you get my last message? {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName"],
  },
  {
    id: "nudge_fri_02",
    stage: "nudger",
    tone: "friendly",
    intent: "book_call",
    worker: "CATHY",
    template: "Hey {{firstName}}, bumping this up - would love to connect when you're free! {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName"],
  },
  {
    id: "nudge_cas_01",
    stage: "nudger",
    tone: "casual",
    intent: "get_response",
    worker: "CATHY",
    template: "{{firstName}}, not sure if you saw my text - still open to a quick chat? {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName"],
  },
  {
    id: "nudge_cas_02",
    stage: "nudger",
    tone: "casual",
    intent: "get_response",
    worker: "CATHY",
    template: "Hey {{firstName}}, circling back - is now a bad time? {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName"],
  },
  {
    id: "nudge_urg_01",
    stage: "nudger",
    tone: "urgent",
    intent: "book_call",
    worker: "CATHY",
    template: "{{firstName}}, last chance this week - got 5 min for a quick call? {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName"],
  },
  {
    id: "nudge_wrm_01",
    stage: "nudger",
    tone: "warm",
    intent: "get_response",
    worker: "CATHY",
    template: "{{firstName}}, hope all is well! Still thinking about {{company}} - any interest? {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName", "company"],
  },
];

// =============================================================================
// STAGE 3: NURTURE (Long-term Engagement)
// =============================================================================

export const NURTURE_CARTRIDGES: Cartridge[] = [
  {
    id: "nurt_pro_01",
    stage: "nurture",
    tone: "professional",
    intent: "get_response",
    worker: "SYSTEM",
    template: "{{firstName}}, sharing a quick tip that's helped {{industry}} businesses grow. Interested? {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName", "industry"],
  },
  {
    id: "nurt_pro_02",
    stage: "nurture",
    tone: "professional",
    intent: "qualify",
    worker: "SYSTEM",
    template: "Hi {{firstName}}, {{company}} came up in research - timing better now to connect? {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName", "company"],
  },
  {
    id: "nurt_fri_01",
    stage: "nurture",
    tone: "friendly",
    intent: "get_response",
    worker: "SYSTEM",
    template: "{{firstName}}! Thought of you - just helped a {{industry}} company hit big goals. {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName", "industry"],
  },
  {
    id: "nurt_fri_02",
    stage: "nurture",
    tone: "friendly",
    intent: "get_response",
    worker: "SYSTEM",
    template: "Hey {{firstName}}, hope 2026 is treating you well! Still here if you need anything. {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName"],
  },
  {
    id: "nurt_cas_01",
    stage: "nurture",
    tone: "casual",
    intent: "get_response",
    worker: "SYSTEM",
    template: "{{firstName}}, been a while! Anything new at {{company}} I should know about? {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName", "company"],
  },
  {
    id: "nurt_wrm_01",
    stage: "nurture",
    tone: "warm",
    intent: "get_response",
    worker: "SYSTEM",
    template: "{{firstName}}, just wanted to check in and see how things are going. Need anything? {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName"],
  },
];

// =============================================================================
// STAGE 4: RETARGET (Re-engage Cold Leads)
// =============================================================================

export const RETARGET_CARTRIDGES: Cartridge[] = [
  {
    id: "retar_pro_01",
    stage: "retarget",
    tone: "professional",
    intent: "re_engage",
    worker: "CATHY",
    template: "{{firstName}}, we spoke {{daysSince}} days ago. Things have changed - worth revisiting? {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName", "daysSince"],
  },
  {
    id: "retar_pro_02",
    stage: "retarget",
    tone: "professional",
    intent: "book_call",
    worker: "CATHY",
    template: "Hi {{firstName}}, reaching back out - is {{company}} still looking to grow? {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName", "company"],
  },
  {
    id: "retar_fri_01",
    stage: "retarget",
    tone: "friendly",
    intent: "re_engage",
    worker: "CATHY",
    template: "{{firstName}}! Long time - we've added new features you'd love. Quick catch-up? {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName"],
  },
  {
    id: "retar_fri_02",
    stage: "retarget",
    tone: "friendly",
    intent: "get_response",
    worker: "CATHY",
    template: "Hey {{firstName}}, remember me? Thought I'd check back in on {{company}}. {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName", "company"],
  },
  {
    id: "retar_cas_01",
    stage: "retarget",
    tone: "casual",
    intent: "re_engage",
    worker: "CATHY",
    template: "{{firstName}}, it's been a while! Timing better now for that chat? {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName"],
  },
  {
    id: "retar_urg_01",
    stage: "retarget",
    tone: "urgent",
    intent: "book_call",
    worker: "CATHY",
    template: "{{firstName}}, Q1 is here - is {{company}} ready to grow this year? Let's talk! {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName", "company"],
  },
];

// =============================================================================
// STAGE 5: CLOSER (SABRINA - Final Push)
// =============================================================================

export const CLOSER_CARTRIDGES: Cartridge[] = [
  {
    id: "close_pro_01",
    stage: "closer",
    tone: "professional",
    intent: "close_deal",
    worker: "SABRINA",
    template: "{{firstName}}, ready to move forward? I can get you started today. {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName"],
  },
  {
    id: "close_pro_02",
    stage: "closer",
    tone: "professional",
    intent: "close_deal",
    worker: "SABRINA",
    template: "Hi {{firstName}}, based on our chat, I think we're a great fit. Next steps? {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName"],
  },
  {
    id: "close_fri_01",
    stage: "closer",
    tone: "friendly",
    intent: "close_deal",
    worker: "SABRINA",
    template: "{{firstName}}! Excited to work together - shall I send over the details? {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName"],
  },
  {
    id: "close_fri_02",
    stage: "closer",
    tone: "friendly",
    intent: "close_deal",
    worker: "SABRINA",
    template: "Hey {{firstName}}, ready to make this happen? Let's lock in your spot! {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName"],
  },
  {
    id: "close_urg_01",
    stage: "closer",
    tone: "urgent",
    intent: "close_deal",
    worker: "SABRINA",
    template: "{{firstName}}, offer expires soon - can we finalize today? {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName"],
  },
  {
    id: "close_urg_02",
    stage: "closer",
    tone: "urgent",
    intent: "close_deal",
    worker: "SABRINA",
    template: "{{firstName}}, last day for our special rate - should I hold your spot? {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName"],
  },
  {
    id: "close_wrm_01",
    stage: "closer",
    tone: "warm",
    intent: "close_deal",
    worker: "SABRINA",
    template: "{{firstName}}, it was great talking - feel confident we can help {{company}}. Ready? {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName", "company"],
  },
  {
    id: "close_wrm_02",
    stage: "closer",
    tone: "warm",
    intent: "close_deal",
    worker: "SABRINA",
    template: "Hi {{firstName}}, thanks for your time! Ready to get started when you are. {{OPT_OUT}}",
    maxChars: 160,
    variables: ["firstName"],
  },
];

// =============================================================================
// ALL CARTRIDGES COMBINED
// =============================================================================

export const ALL_CARTRIDGES: Cartridge[] = [
  ...INITIAL_CARTRIDGES,
  ...NUDGER_CARTRIDGES,
  ...NURTURE_CARTRIDGES,
  ...RETARGET_CARTRIDGES,
  ...CLOSER_CARTRIDGES,
];

// =============================================================================
// CARTRIDGE FUNCTIONS
// =============================================================================

/**
 * Get cartridges by stage
 */
export function getCartridgesByStage(stage: Stage): Cartridge[] {
  return ALL_CARTRIDGES.filter((c) => c.stage === stage);
}

/**
 * Get cartridges by tone
 */
export function getCartridgesByTone(tone: Tone): Cartridge[] {
  return ALL_CARTRIDGES.filter((c) => c.tone === tone);
}

/**
 * Get cartridges by worker
 */
export function getCartridgesByWorker(worker: Cartridge["worker"]): Cartridge[] {
  return ALL_CARTRIDGES.filter((c) => c.worker === worker);
}

/**
 * Render cartridge with variables
 */
export function renderCartridge(
  cartridge: Cartridge,
  vars: CartridgeVariables
): { message: string; charCount: number; valid: boolean } {
  let message = cartridge.template;

  // Replace variables
  message = message.replace(/\{\{firstName\}\}/g, vars.firstName || "there");
  message = message.replace(/\{\{company\}\}/g, vars.company || "your company");
  message = message.replace(/\{\{industry\}\}/g, vars.industry || "your industry");
  message = message.replace(/\{\{city\}\}/g, vars.city || "your area");
  message = message.replace(/\{\{daysSince\}\}/g, String(vars.daysSince || 30));
  message = message.replace(/\{\{brand\}\}/g, vars.brand || "NEXTIER");
  message = message.replace(/\{\{OPT_OUT\}\}/g, OPT_OUT);

  const charCount = message.length;

  return {
    message,
    charCount,
    valid: charCount <= 160,
  };
}

/**
 * Get random cartridge for stage
 */
export function getRandomCartridge(stage: Stage): Cartridge {
  const stageCartridges = getCartridgesByStage(stage);
  return stageCartridges[Math.floor(Math.random() * stageCartridges.length)];
}

/**
 * Remix cartridge - swap tone while keeping structure
 */
export function remixCartridge(cartridgeId: string, newTone: Tone): Cartridge | null {
  const original = ALL_CARTRIDGES.find((c) => c.id === cartridgeId);
  if (!original) return null;

  // Find similar cartridge with new tone
  const alternatives = ALL_CARTRIDGES.filter(
    (c) => c.stage === original.stage && c.tone === newTone && c.intent === original.intent
  );

  return alternatives.length > 0
    ? alternatives[Math.floor(Math.random() * alternatives.length)]
    : null;
}

/**
 * Validate cartridge length after rendering
 */
export function validateCartridge(cartridge: Cartridge, vars: CartridgeVariables): {
  valid: boolean;
  charCount: number;
  overflow: number;
  suggestion?: string;
} {
  const { message, charCount, valid } = renderCartridge(cartridge, vars);

  return {
    valid,
    charCount,
    overflow: valid ? 0 : charCount - 160,
    suggestion: valid
      ? undefined
      : "Try shorter variable values or a different template",
  };
}

// =============================================================================
// STAGE WORKFLOW
// =============================================================================

/**
 * Standard stage sequence
 */
export const STAGE_SEQUENCE: Stage[] = [
  "initial",   // Day 0 - First touch (GIANNA)
  "nudger",    // Day 2 - Follow-up (CATHY)
  "nudger",    // Day 5 - Second follow-up (CATHY)
  "nurture",   // Day 14 - Nurture touch
  "retarget",  // Day 30+ - Re-engagement
  "closer",    // After positive response (SABRINA)
];

/**
 * Get next stage in sequence
 */
export function getNextStage(currentStage: Stage, daysSinceFirst: number): Stage {
  if (daysSinceFirst < 2) return "initial";
  if (daysSinceFirst < 7) return "nudger";
  if (daysSinceFirst < 30) return "nurture";
  return "retarget";
}

/**
 * Get worker for stage
 */
export function getWorkerForStage(stage: Stage): "GIANNA" | "CATHY" | "SABRINA" | "SYSTEM" {
  switch (stage) {
    case "initial":
      return "GIANNA";
    case "nudger":
    case "retarget":
      return "CATHY";
    case "closer":
      return "SABRINA";
    case "nurture":
    default:
      return "SYSTEM";
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default ALL_CARTRIDGES;
