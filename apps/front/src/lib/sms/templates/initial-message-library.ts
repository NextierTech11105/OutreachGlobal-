/**
 * Initial Message Library
 *
 * AGNOSTIC TEMPLATE STRUCTURE based on SignalHouse Campaign CJRCU60
 *
 * Approved Campaign:
 * - Brand: BZOYPIH (NEXTIER)
 * - Use Case: LOW_VOLUME (Marketing)
 * - Compliance: STOP opt-out required
 *
 * Template Structure:
 * {{HOOK}} + {{VALUE_PROP}} + {{CTA}} + {{COMPLIANCE_FOOTER}}
 *
 * Variables Available:
 * - {{firstName}} - Lead's first name
 * - {{lastName}} - Lead's last name
 * - {{company}} - Company name
 * - {{industry}} - Industry/vertical
 * - {{city}} - City
 * - {{state}} - State
 * - {{workerName}} - AI worker name (GIANNA, CATHY, SABRINA)
 * - {{brandName}} - Sending brand (NEXTIER or custom)
 */

// =============================================================================
// COMPLIANCE FOOTERS (REQUIRED FOR 10DLC)
// =============================================================================

export const COMPLIANCE_FOOTERS = {
  standard: "Reply STOP to opt out",
  branded: (brand: string) => `Reply STOP to opt out from ${brand}`,
  full: (brand: string) =>
    `Msg&data rates apply. Reply STOP to opt out from ${brand}`,
  help: (brand: string) =>
    `Reply HELP for info or STOP to opt out from ${brand}`,
} as const;

// =============================================================================
// VARIABLE DEFINITIONS
// =============================================================================

export interface TemplateVariables {
  firstName?: string;
  lastName?: string;
  company?: string;
  industry?: string;
  city?: string;
  state?: string;
  workerName?: string;
  brandName?: string;
  customValue1?: string;
  customValue2?: string;
}

export const DEFAULT_VARIABLES: TemplateVariables = {
  firstName: "there",
  lastName: "",
  company: "your company",
  industry: "your industry",
  city: "your area",
  state: "",
  workerName: "GIANNA",
  brandName: "NEXTIER",
};

// =============================================================================
// TEMPLATE STRUCTURE
// =============================================================================

export type TemplateStage =
  | "initial"      // GIANNA - First contact
  | "reminder1"    // GIANNA - First follow-up
  | "reminder2"    // GIANNA - Second follow-up
  | "nudge3"       // CATHY - Qualifying nudge
  | "followUp"     // SABRINA - Warm lead booking
  | "retention"    // CATHY - Nurture
  | "coldCall"     // SABRINA - Phone scripts
  | "breakup";     // CATHY - Graceful exit

export type VerticalType =
  | "universal"    // Works for any industry
  | "plumbing"     // Plumbing/HVAC contractors
  | "consulting"   // Business management consultants
  | "realtor";     // Real estate agents

export type WorkerType = "gianna" | "cathy" | "sabrina";

export interface InitialMessageTemplate {
  id: string;
  name: string;
  category: "opener" | "value" | "question" | "curiosity" | "direct" | "authority" | "problem";
  stage: TemplateStage;
  vertical: VerticalType;
  worker: WorkerType;
  tone: "professional" | "friendly" | "casual" | "urgent" | "direct" | "humor";
  template: string;
  variables: string[];
  charCount: number;
  segments: number;
  compliance: boolean;
}

// =============================================================================
// INITIAL MESSAGE TEMPLATES - CLEARED FOR PRODUCTION DATA
// =============================================================================
// Add templates via admin panel or campaign configuration
//
// TEMPLATE EXAMPLE:
// {
//   id: "init-univ-01",
//   name: "Business Value Direct",
//   category: "direct",
//   stage: "initial",
//   vertical: "universal",
//   worker: "gianna",
//   tone: "professional",
//   template: "{{firstName}}, running a {{industry}} business? Worth a chat? STOP to opt out",
//   variables: ["firstName", "industry"],
//   charCount: 80,
//   segments: 1,
//   compliance: true,
// }
//

export const INITIAL_MESSAGE_LIBRARY: InitialMessageTemplate[] = [
  // Add templates via admin panel
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: InitialMessageTemplate["category"],
): InitialMessageTemplate[] {
  return INITIAL_MESSAGE_LIBRARY.filter((t) => t.category === category);
}

/**
 * Get templates by tone
 */
export function getTemplatesByTone(
  tone: InitialMessageTemplate["tone"],
): InitialMessageTemplate[] {
  return INITIAL_MESSAGE_LIBRARY.filter((t) => t.tone === tone);
}

/**
 * Render template with variables
 */
export function renderTemplate(
  template: InitialMessageTemplate,
  variables: TemplateVariables,
  brandName: string = "NEXTIER",
): string {
  let rendered = template.template;

  // Replace variables
  const vars = { ...DEFAULT_VARIABLES, ...variables, brandName };

  rendered = rendered.replace(/\{\{firstName\}\}/g, vars.firstName || "there");
  rendered = rendered.replace(/\{\{lastName\}\}/g, vars.lastName || "");
  rendered = rendered.replace(
    /\{\{company\}\}/g,
    vars.company || "your company",
  );
  rendered = rendered.replace(
    /\{\{industry\}\}/g,
    vars.industry || "your industry",
  );
  rendered = rendered.replace(/\{\{city\}\}/g, vars.city || "your area");
  rendered = rendered.replace(/\{\{state\}\}/g, vars.state || "");
  rendered = rendered.replace(
    /\{\{workerName\}\}/g,
    vars.workerName || "GIANNA",
  );
  rendered = rendered.replace(
    /\{\{brandName\}\}/g,
    vars.brandName || "NEXTIER",
  );
  rendered = rendered.replace(/\{\{customValue1\}\}/g, vars.customValue1 || "");
  rendered = rendered.replace(/\{\{customValue2\}\}/g, vars.customValue2 || "");

  // Replace compliance footer
  rendered = rendered.replace(
    /\{\{compliance\}\}/g,
    COMPLIANCE_FOOTERS.branded(brandName),
  );

  return rendered.trim();
}

/**
 * Validate template length (must be <= 160 for single segment)
 */
export function validateTemplateLength(rendered: string): {
  valid: boolean;
  charCount: number;
  segments: number;
  warning?: string;
} {
  const charCount = rendered.length;
  const segments = Math.ceil(charCount / 160);

  return {
    valid: charCount <= 160,
    charCount,
    segments,
    warning:
      charCount > 160
        ? `Message is ${charCount} chars (${segments} segments) - may cost more`
        : undefined,
  };
}

/**
 * Get random template from category
 */
export function getRandomTemplate(
  category?: InitialMessageTemplate["category"],
): InitialMessageTemplate | null {
  const templates = category
    ? getTemplatesByCategory(category)
    : INITIAL_MESSAGE_LIBRARY;
  if (templates.length === 0) return null;
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Search templates by keyword
 */
export function searchTemplates(keyword: string): InitialMessageTemplate[] {
  const lower = keyword.toLowerCase();
  return INITIAL_MESSAGE_LIBRARY.filter(
    (t) =>
      t.name.toLowerCase().includes(lower) ||
      t.template.toLowerCase().includes(lower) ||
      t.category.includes(lower) ||
      t.tone.includes(lower),
  );
}

// =============================================================================
// SIGNALHOUSE CAMPAIGN ALIGNMENT
// =============================================================================

/**
 * SignalHouse Campaign Configuration
 * Campaign ID: CJRCU60
 * Brand: BZOYPIH (NEXTIER)
 */
export const SIGNALHOUSE_CAMPAIGN_CONFIG = {
  campaignId: "CJRCU60",
  brandId: "BZOYPIH",
  brandName: "NEXTIER",
  useCase: "LOW_VOLUME",
  groupId: "GM7CEB",
  subGroupId: "S7ZI7S",
  phoneNumber: "15164079249",

  // Approved sample messages - Add via admin panel
  approvedSamples: [],

  // Compliance requirements
  compliance: {
    optInRequired: true,
    optOutRequired: true,
    helpRequired: true,
    embedLinksAllowed: true,
    embedPhoneAllowed: true,
    ageGated: false,
  },

  // Rate limits (10DLC)
  rateLimits: {
    attSmsTPM: 75,
    attMmsTPM: 50,
    tmobileTier: "LOW",
  },
};

// =============================================================================
// EXPORTS
// =============================================================================

export default INITIAL_MESSAGE_LIBRARY;
