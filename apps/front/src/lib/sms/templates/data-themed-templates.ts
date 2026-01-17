/**
 * GIANNA Data-Themed SMS Templates
 * Format: Hey {firstName}, Gianna here. [message] Reply STOP to opt out – NEXTIER
 *
 * Approved for SignalHouse Campaign: CJRCU60
 * Use Case: LOW_VOLUME
 * Target: B2B Data-Conscious Prospects
 */

export interface GiannaTemplate {
  id: string;
  category: "data" | "general" | "followup" | "nurture";
  vertical?: string; // Optional vertical targeting
  body: string; // The message content (without intro/outro)
  fullMessage: string; // Complete message with GIANNA format
  charCount: number;
  approved: boolean;
}

/**
 * Available template variables:
 * - {firstName} - Recipient's first name
 * - {companyName} - Recipient's company name
 * - {neighborhood} - Recipient's neighborhood/area
 * - {county} - Recipient's county
 * - {industry} - Recipient's industry vertical
 */
export interface TemplateVariables {
  firstName: string;
  companyName?: string;
  neighborhood?: string;
  county?: string;
  industry?: string;
}

// Replace all variables in a template
export function interpolateTemplate(
  template: string,
  vars: TemplateVariables
): string {
  let result = template;
  result = result.replace(/{firstName}/g, vars.firstName || "there");
  result = result.replace(/{companyName}/g, vars.companyName || "your team");
  result = result.replace(/{neighborhood}/g, vars.neighborhood || "your area");
  result = result.replace(/{county}/g, vars.county || "your county");
  result = result.replace(/{industry}/g, vars.industry || "your industry");
  return result;
}

// Standard GIANNA intro/outro (160 char limit)
export const GIANNA_INTRO = (firstName: string) =>
  `Hey ${firstName} Gianna again!`;
export const GIANNA_OUTRO = "Reply STOP to opt out – NEXTIER";

// Max characters for body = 160 - intro(~25) - outro(32) - spaces(2) = ~101 chars for body
export const MAX_BODY_CHARS = 100;

// Build full message
export function buildGiannaMessage(firstName: string, body: string): string {
  return `${GIANNA_INTRO(firstName)} ${body} ${GIANNA_OUTRO}`;
}

/**
 * Data-themed templates (Approved 01/16/2026) - 160 char max
 * Sender: GIANNA (AI with human oversight)
 * Variable: {firstName} = recipient's first name
 * Format varies: "Hi {firstName}, Gianna here." / "{firstName}—Gianna again." / etc.
 */
export const DATA_THEMED_TEMPLATES: GiannaTemplate[] = [
  {
    id: "data_001",
    category: "data",
    body: "Data decay happens quietly. We help teams catch it early and save time. Free for a short call?",
    fullMessage: "Hi {firstName}, Gianna here. Data decay happens quietly. We help teams catch it early and save time. Free for a short call? Reply STOP to opt out – NEXTIER",
    charCount: 160,
    approved: true,
  },
  {
    id: "data_002",
    category: "data",
    body: "If data health slips, everything downstream suffers. We help fix it early. Open to a quick call?",
    fullMessage: "{firstName}—Gianna again. If data health slips, everything downstream suffers. We help fix it early. Open to a quick call? Reply STOP to opt out – NEXTIER",
    charCount: 160,
    approved: true,
  },
  {
    id: "data_003",
    category: "data",
    body: "Most teams scale before fixing data issues. We help prevent that. Quick call?",
    fullMessage: "Hey {firstName}, Gianna here. Most teams scale before fixing data issues. We help prevent that. Quick call? Reply STOP to opt out – NEXTIER",
    charCount: 150,
    approved: true,
  },
  {
    id: "data_004",
    category: "data",
    body: "Bad data costs time before anyone notices. We make it visible fast. Free to talk briefly?",
    fullMessage: "{firstName}, Gianna again. Bad data costs time before anyone notices. We make it visible fast. Free to talk briefly? Reply STOP to opt out – NEXTIER",
    charCount: 158,
    approved: true,
  },
  {
    id: "data_005",
    category: "data",
    body: "You can't fix what you can't see. We give visibility into data health. Quick call?",
    fullMessage: "Hi {firstName}—Gianna here. You can't fix what you can't see. We give visibility into data health. Quick call? Reply STOP to opt out – NEXTIER",
    charCount: 152,
    approved: true,
  },
  {
    id: "data_006",
    category: "data",
    body: "When replies slow, data is usually the issue. We help diagnose early. Open to chat?",
    fullMessage: "{firstName}, Gianna again. When replies slow, data is usually the issue. We help diagnose early. Open to chat? Reply STOP to opt out – NEXTIER",
    charCount: 152,
    approved: true,
  },
  {
    id: "data_007",
    category: "data",
    body: "Data problems compound quietly. We surface them before they scale. Short call?",
    fullMessage: "Hey {firstName}, Gianna here. Data problems compound quietly. We surface them before they scale. Short call? Reply STOP to opt out – NEXTIER",
    charCount: 150,
    approved: true,
  },
  {
    id: "data_008",
    category: "data",
    body: "Clean data saves time and money downstream. Happy to explain quickly.",
    fullMessage: "{firstName}—Gianna again. Clean data saves time and money downstream. Happy to explain quickly. Reply STOP to opt out – NEXTIER",
    charCount: 138,
    approved: true,
  },
  {
    id: "data_009",
    category: "data",
    body: "Most teams don't know their data is failing. We help catch it early. Free for a call?",
    fullMessage: "Hi {firstName}, Gianna here. Most teams don't know their data is failing. We help catch it early. Free for a call? Reply STOP to opt out – NEXTIER",
    charCount: 156,
    approved: true,
  },
  {
    id: "data_010",
    category: "data",
    body: "Better data clarity leads to better outcomes. Want a quick walkthrough?",
    fullMessage: "{firstName}, Gianna again. Better data clarity leads to better outcomes. Want a quick walkthrough? Reply STOP to opt out – NEXTIER",
    charCount: 138,
    approved: true,
  },
  {
    id: "data_011",
    category: "data",
    body: "Visibility into data health changes how teams scale. Open to a brief call?",
    fullMessage: "Hey {firstName}—Gianna here. Visibility into data health changes how teams scale. Open to a brief call? Reply STOP to opt out – NEXTIER",
    charCount: 148,
    approved: true,
  },
  {
    id: "data_012",
    category: "data",
    body: "If outreach feels noisy, data is often why. We help clean it up. Quick call?",
    fullMessage: "{firstName}, Gianna again. If outreach feels noisy, data is often why. We help clean it up. Quick call? Reply STOP to opt out – NEXTIER",
    charCount: 144,
    approved: true,
  },
  {
    id: "data_013",
    category: "data",
    body: "Scaling without data clarity gets expensive fast. We help prevent that. Free to connect?",
    fullMessage: "Hi {firstName}, Gianna here. Scaling without data clarity gets expensive fast. We help prevent that. Free to connect? Reply STOP to opt out – NEXTIER",
    charCount: 158,
    approved: true,
  },
  {
    id: "data_014",
    category: "data",
    body: "Most systems fail at the data layer first. We help teams fix that early. Short call?",
    fullMessage: "{firstName}—Gianna again. Most systems fail at the data layer first. We help teams fix that early. Short call? Reply STOP to opt out – NEXTIER",
    charCount: 154,
    approved: true,
  },
  {
    id: "data_015",
    category: "data",
    body: "Data health drives response rates more than volume. Want to discuss briefly?",
    fullMessage: "Hey {firstName}, Gianna here. Data health drives response rates more than volume. Want to discuss briefly? Reply STOP to opt out – NEXTIER",
    charCount: 150,
    approved: true,
  },
  {
    id: "data_016",
    category: "data",
    body: "We help teams see what's broken before campaigns stall. Open to a quick call?",
    fullMessage: "{firstName}, Gianna again. We help teams see what's broken before campaigns stall. Open to a quick call? Reply STOP to opt out – NEXTIER",
    charCount: 150,
    approved: true,
  },
  {
    id: "data_017",
    category: "data",
    body: "Strong data foundations reduce effort everywhere else. Happy to explain.",
    fullMessage: "Hi {firstName}—Gianna here. Strong data foundations reduce effort everywhere else. Happy to explain. Reply STOP to opt out – NEXTIER",
    charCount: 142,
    approved: true,
  },
  {
    id: "data_018",
    category: "data",
    body: "If results feel inconsistent, data is usually the reason. We help fix that early. Quick call?",
    fullMessage: "{firstName}, Gianna again. If results feel inconsistent, data is usually the reason. We help fix that early. Quick call? Reply STOP to opt out – NEXTIER",
    charCount: 160,
    approved: true,
  },
  {
    id: "data_019",
    category: "data",
    body: "Data clarity beats guesswork every time. Want a short conversation?",
    fullMessage: "Hey {firstName}—Gianna here. Data clarity beats guesswork every time. Want a short conversation? Reply STOP to opt out – NEXTIER",
    charCount: 138,
    approved: true,
  },
  {
    id: "data_020",
    category: "data",
    body: "We surface data issues before they scale. Free for a quick call?",
    fullMessage: "{firstName}, Gianna again. We surface data issues before they scale. Free for a quick call? Reply STOP to opt out – NEXTIER",
    charCount: 130,
    approved: true,
  },
];

// Get random template
export function getRandomDataTemplate(): GiannaTemplate {
  const idx = Math.floor(Math.random() * DATA_THEMED_TEMPLATES.length);
  return DATA_THEMED_TEMPLATES[idx];
}

// Get template by ID
export function getTemplateById(id: string): GiannaTemplate | undefined {
  return DATA_THEMED_TEMPLATES.find((t) => t.id === id);
}

// Build personalized message from template
export function buildPersonalizedMessage(
  templateId: string,
  firstName: string
): string | null {
  const template = getTemplateById(templateId);
  if (!template) return null;
  return buildGiannaMessage(firstName, template.body);
}

// All approved templates
export function getApprovedTemplates(): GiannaTemplate[] {
  return DATA_THEMED_TEMPLATES.filter((t) => t.approved);
}
