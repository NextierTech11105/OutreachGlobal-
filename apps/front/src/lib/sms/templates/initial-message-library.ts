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
  full: (brand: string) => `Msg&data rates apply. Reply STOP to opt out from ${brand}`,
  help: (brand: string) => `Reply HELP for info or STOP to opt out from ${brand}`,
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

export interface InitialMessageTemplate {
  id: string;
  name: string;
  category: "opener" | "value" | "question" | "curiosity" | "direct";
  tone: "professional" | "friendly" | "casual" | "urgent";
  template: string;
  variables: string[];
  charCount: number;
  segments: number;
  compliance: boolean;
}

// =============================================================================
// INITIAL MESSAGE TEMPLATES (AGNOSTIC)
// =============================================================================

export const INITIAL_MESSAGE_LIBRARY: InitialMessageTemplate[] = [
  // ===== OPENER CATEGORY =====
  {
    id: "init_opener_01",
    name: "New Release Hook",
    category: "opener",
    tone: "friendly",
    template: "Hi {{firstName}}, we think you'll love our new release! Let's book a call and discuss soon. {{compliance}}",
    variables: ["firstName", "compliance"],
    charCount: 115,
    segments: 1,
    compliance: true,
  },
  {
    id: "init_opener_02",
    name: "Time & Money Value",
    category: "opener",
    tone: "professional",
    template: "{{firstName}}, we're here to save you time AND money. Let me know when you're free for a quick call. {{compliance}}",
    variables: ["firstName", "compliance"],
    charCount: 118,
    segments: 1,
    compliance: true,
  },
  {
    id: "init_opener_03",
    name: "Quick Question",
    category: "opener",
    tone: "casual",
    template: "Hey {{firstName}}, quick question about {{company}} - got 2 min for a call this week? {{compliance}}",
    variables: ["firstName", "company", "compliance"],
    charCount: 98,
    segments: 1,
    compliance: true,
  },
  {
    id: "init_opener_04",
    name: "Noticed Something",
    category: "opener",
    tone: "professional",
    template: "{{firstName}}, noticed {{company}} is growing - I help businesses like yours scale faster. Quick chat? {{compliance}}",
    variables: ["firstName", "company", "compliance"],
    charCount: 118,
    segments: 1,
    compliance: true,
  },
  {
    id: "init_opener_05",
    name: "Local Connection",
    category: "opener",
    tone: "friendly",
    template: "Hi {{firstName}}! Working with several {{industry}} companies in {{city}}. Would love to connect. {{compliance}}",
    variables: ["firstName", "industry", "city", "compliance"],
    charCount: 112,
    segments: 1,
    compliance: true,
  },

  // ===== VALUE CATEGORY =====
  {
    id: "init_value_01",
    name: "Results Focus",
    category: "value",
    tone: "professional",
    template: "{{firstName}}, businesses like {{company}} are seeing 3x results with our approach. Worth a quick call? {{compliance}}",
    variables: ["firstName", "company", "compliance"],
    charCount: 115,
    segments: 1,
    compliance: true,
  },
  {
    id: "init_value_02",
    name: "Efficiency Play",
    category: "value",
    tone: "professional",
    template: "{{firstName}}, we help {{industry}} businesses cut costs by 40%. Free to chat this week? {{compliance}}",
    variables: ["firstName", "industry", "compliance"],
    charCount: 102,
    segments: 1,
    compliance: true,
  },
  {
    id: "init_value_03",
    name: "Competitive Edge",
    category: "value",
    tone: "urgent",
    template: "{{firstName}}, your competitors are already using this. Don't get left behind - quick call? {{compliance}}",
    variables: ["firstName", "compliance"],
    charCount: 105,
    segments: 1,
    compliance: true,
  },
  {
    id: "init_value_04",
    name: "Revenue Impact",
    category: "value",
    tone: "professional",
    template: "{{firstName}}, I've helped similar {{industry}} companies add $50K+ monthly. Got 15 min? {{compliance}}",
    variables: ["firstName", "industry", "compliance"],
    charCount: 104,
    segments: 1,
    compliance: true,
  },
  {
    id: "init_value_05",
    name: "Pain Point",
    category: "value",
    tone: "friendly",
    template: "{{firstName}}, struggling with growth? We solve that for {{industry}} businesses daily. Let's talk! {{compliance}}",
    variables: ["firstName", "industry", "compliance"],
    charCount: 113,
    segments: 1,
    compliance: true,
  },

  // ===== QUESTION CATEGORY =====
  {
    id: "init_question_01",
    name: "Direct Ask",
    category: "question",
    tone: "casual",
    template: "{{firstName}}, are you the right person to talk to about growth at {{company}}? {{compliance}}",
    variables: ["firstName", "company", "compliance"],
    charCount: 94,
    segments: 1,
    compliance: true,
  },
  {
    id: "init_question_02",
    name: "Time Check",
    category: "question",
    tone: "friendly",
    template: "Hi {{firstName}}! Do you have 10 min this week for a quick intro call? {{compliance}}",
    variables: ["firstName", "compliance"],
    charCount: 83,
    segments: 1,
    compliance: true,
  },
  {
    id: "init_question_03",
    name: "Interest Gauge",
    category: "question",
    tone: "professional",
    template: "{{firstName}}, would you be open to exploring how we help {{industry}} businesses grow? {{compliance}}",
    variables: ["firstName", "industry", "compliance"],
    charCount: 102,
    segments: 1,
    compliance: true,
  },
  {
    id: "init_question_04",
    name: "Priority Check",
    category: "question",
    tone: "professional",
    template: "{{firstName}}, is scaling {{company}} a priority for you right now? Happy to share ideas. {{compliance}}",
    variables: ["firstName", "company", "compliance"],
    charCount: 104,
    segments: 1,
    compliance: true,
  },
  {
    id: "init_question_05",
    name: "Challenges Probe",
    category: "question",
    tone: "friendly",
    template: "Hey {{firstName}}, what's {{company}}'s biggest challenge right now? I might be able to help. {{compliance}}",
    variables: ["firstName", "company", "compliance"],
    charCount: 108,
    segments: 1,
    compliance: true,
  },

  // ===== CURIOSITY CATEGORY =====
  {
    id: "init_curiosity_01",
    name: "Intriguing Hook",
    category: "curiosity",
    tone: "casual",
    template: "{{firstName}}, saw something interesting about {{company}} - can I share on a quick call? {{compliance}}",
    variables: ["firstName", "company", "compliance"],
    charCount: 103,
    segments: 1,
    compliance: true,
  },
  {
    id: "init_curiosity_02",
    name: "Idea Tease",
    category: "curiosity",
    tone: "friendly",
    template: "{{firstName}}, I have an idea that could really help {{company}}. 5 min to chat? {{compliance}}",
    variables: ["firstName", "company", "compliance"],
    charCount: 95,
    segments: 1,
    compliance: true,
  },
  {
    id: "init_curiosity_03",
    name: "Research Find",
    category: "curiosity",
    tone: "professional",
    template: "{{firstName}}, did some research on {{industry}} in {{city}} - found something you'd want to know. Call? {{compliance}}",
    variables: ["firstName", "industry", "city", "compliance"],
    charCount: 117,
    segments: 1,
    compliance: true,
  },
  {
    id: "init_curiosity_04",
    name: "Secret Sauce",
    category: "curiosity",
    tone: "casual",
    template: "{{firstName}}, found the secret to {{industry}} growth - want me to share it? {{compliance}}",
    variables: ["firstName", "industry", "compliance"],
    charCount: 92,
    segments: 1,
    compliance: true,
  },
  {
    id: "init_curiosity_05",
    name: "Quick Insight",
    category: "curiosity",
    tone: "professional",
    template: "{{firstName}}, have a quick insight for {{company}} that's helped similar businesses. Interested? {{compliance}}",
    variables: ["firstName", "company", "compliance"],
    charCount: 113,
    segments: 1,
    compliance: true,
  },

  // ===== DIRECT CATEGORY =====
  {
    id: "init_direct_01",
    name: "Straight Shooter",
    category: "direct",
    tone: "professional",
    template: "{{firstName}}, I help {{industry}} businesses grow. Worth a 15 min call to see if we're a fit? {{compliance}}",
    variables: ["firstName", "industry", "compliance"],
    charCount: 108,
    segments: 1,
    compliance: true,
  },
  {
    id: "init_direct_02",
    name: "No BS",
    category: "direct",
    tone: "casual",
    template: "{{firstName}}, no sales pitch - just want to see if I can help {{company}}. Quick call? {{compliance}}",
    variables: ["firstName", "company", "compliance"],
    charCount: 101,
    segments: 1,
    compliance: true,
  },
  {
    id: "init_direct_03",
    name: "Decision Maker",
    category: "direct",
    tone: "professional",
    template: "{{firstName}}, I work with {{industry}} decision makers like you. Got time for a brief intro? {{compliance}}",
    variables: ["firstName", "industry", "compliance"],
    charCount: 108,
    segments: 1,
    compliance: true,
  },
  {
    id: "init_direct_04",
    name: "Value First",
    category: "direct",
    tone: "friendly",
    template: "{{firstName}}, I'll give you free insights on {{company}} - no strings attached. Call me? {{compliance}}",
    variables: ["firstName", "company", "compliance"],
    charCount: 106,
    segments: 1,
    compliance: true,
  },
  {
    id: "init_direct_05",
    name: "Partnership Ask",
    category: "direct",
    tone: "professional",
    template: "{{firstName}}, exploring partnerships with {{industry}} leaders in {{state}}. Interested in connecting? {{compliance}}",
    variables: ["firstName", "industry", "state", "compliance"],
    charCount: 118,
    segments: 1,
    compliance: true,
  },
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: InitialMessageTemplate["category"]): InitialMessageTemplate[] {
  return INITIAL_MESSAGE_LIBRARY.filter((t) => t.category === category);
}

/**
 * Get templates by tone
 */
export function getTemplatesByTone(tone: InitialMessageTemplate["tone"]): InitialMessageTemplate[] {
  return INITIAL_MESSAGE_LIBRARY.filter((t) => t.tone === tone);
}

/**
 * Render template with variables
 */
export function renderTemplate(
  template: InitialMessageTemplate,
  variables: TemplateVariables,
  brandName: string = "NEXTIER"
): string {
  let rendered = template.template;

  // Replace variables
  const vars = { ...DEFAULT_VARIABLES, ...variables, brandName };

  rendered = rendered.replace(/\{\{firstName\}\}/g, vars.firstName || "there");
  rendered = rendered.replace(/\{\{lastName\}\}/g, vars.lastName || "");
  rendered = rendered.replace(/\{\{company\}\}/g, vars.company || "your company");
  rendered = rendered.replace(/\{\{industry\}\}/g, vars.industry || "your industry");
  rendered = rendered.replace(/\{\{city\}\}/g, vars.city || "your area");
  rendered = rendered.replace(/\{\{state\}\}/g, vars.state || "");
  rendered = rendered.replace(/\{\{workerName\}\}/g, vars.workerName || "GIANNA");
  rendered = rendered.replace(/\{\{brandName\}\}/g, vars.brandName || "NEXTIER");
  rendered = rendered.replace(/\{\{customValue1\}\}/g, vars.customValue1 || "");
  rendered = rendered.replace(/\{\{customValue2\}\}/g, vars.customValue2 || "");

  // Replace compliance footer
  rendered = rendered.replace(/\{\{compliance\}\}/g, COMPLIANCE_FOOTERS.branded(brandName));

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
    warning: charCount > 160 ? `Message is ${charCount} chars (${segments} segments) - may cost more` : undefined,
  };
}

/**
 * Get random template from category
 */
export function getRandomTemplate(category?: InitialMessageTemplate["category"]): InitialMessageTemplate {
  const templates = category ? getTemplatesByCategory(category) : INITIAL_MESSAGE_LIBRARY;
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
      t.tone.includes(lower)
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

  // Approved sample messages (reference)
  approvedSamples: [
    "We think you'll love our new release, let's book a call and discuss soon! Respond STOP to opt out from NEXTIER",
    "We're here to save you time AND money. Let me know when you're free for a quick call. Respond STOP to opt out from NEXTIER",
  ],

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
