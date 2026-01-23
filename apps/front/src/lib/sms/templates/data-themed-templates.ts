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
// Templates cleared - add your custom data-themed templates here
// Available variables: {firstName}, {companyName}, {neighborhood}, {county}, {industry}
export const DATA_THEMED_TEMPLATES: GiannaTemplate[] = [];

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
