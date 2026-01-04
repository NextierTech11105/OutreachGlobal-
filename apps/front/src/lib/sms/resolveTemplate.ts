/**
 * TEMPLATE RESOLUTION UTILITY
 * ============================
 * CANONICAL template resolution - this is the ONLY way templates are resolved at runtime.
 *
 * All template lookups MUST go through this utility.
 * - Campaign prep saves templateId → resolved here before send
 * - AI SDR outputs templateId → resolved here before ExecutionRouter
 * - ExecutionRouter binds template → via this utility
 *
 * Source of truth: template-cartridges.ts (CARTRIDGE_LIBRARY)
 */

import {
  CARTRIDGE_LIBRARY,
  type TemplateCartridge,
} from "./template-cartridges";
import type { SMSTemplate, CampaignStage, AIWorker } from "./campaign-templates";

// ═══════════════════════════════════════════════════════════════════════════════
// RESOLUTION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ResolvedTemplate {
  template: SMSTemplate;
  cartridgeId: string;
  cartridgeName: string;
}

export interface TemplateResolutionError extends Error {
  code: "TEMPLATE_NOT_FOUND" | "TEMPLATE_ID_MISSING" | "CARTRIDGE_NOT_FOUND";
  templateId?: string;
  cartridgeId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE RESOLUTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resolve a template by ID from CARTRIDGE_LIBRARY
 * Throws hard error if templateId is missing or not found
 *
 * @param templateId - The template ID to resolve
 * @returns ResolvedTemplate with template and cartridge context
 * @throws TemplateResolutionError if template not found
 */
export function resolveTemplateById(templateId: string): ResolvedTemplate {
  // HARD ERROR: templateId is required
  if (!templateId || templateId.trim() === "") {
    const error = new Error(
      "Template resolution failed: templateId is required"
    ) as TemplateResolutionError;
    error.code = "TEMPLATE_ID_MISSING";
    throw error;
  }

  // Search all cartridges for the template
  for (const cartridge of CARTRIDGE_LIBRARY) {
    const template = cartridge.templates.find((t) => t.id === templateId);
    if (template) {
      return {
        template,
        cartridgeId: cartridge.id,
        cartridgeName: cartridge.name,
      };
    }
  }

  // HARD ERROR: Template not found
  const error = new Error(
    `Template resolution failed: templateId "${templateId}" not found in CARTRIDGE_LIBRARY`
  ) as TemplateResolutionError;
  error.code = "TEMPLATE_NOT_FOUND";
  error.templateId = templateId;
  throw error;
}

/**
 * Alias for resolveTemplateById - includes group info
 */
export function resolveTemplateWithGroup(templateId: string): ResolvedTemplate {
  return resolveTemplateById(templateId);
}

/**
 * Get just the template (without cartridge context)
 * Still throws if not found
 */
export function getTemplate(templateId: string): SMSTemplate {
  const resolved = resolveTemplateById(templateId);
  return resolved.template;
}

/**
 * Check if a templateId exists (safe, no throw)
 */
export function templateExists(templateId: string): boolean {
  if (!templateId) return false;

  for (const cartridge of CARTRIDGE_LIBRARY) {
    if (cartridge.templates.some((t) => t.id === templateId)) {
      return true;
    }
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CARTRIDGE-SCOPED RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resolve template from a specific cartridge only
 */
export function resolveTemplateFromCartridge(
  templateId: string,
  cartridgeId: string
): ResolvedTemplate {
  if (!templateId) {
    const error = new Error(
      "Template resolution failed: templateId is required"
    ) as TemplateResolutionError;
    error.code = "TEMPLATE_ID_MISSING";
    throw error;
  }

  const cartridge = CARTRIDGE_LIBRARY.find((c) => c.id === cartridgeId);
  if (!cartridge) {
    const error = new Error(
      `Template resolution failed: cartridge "${cartridgeId}" not found`
    ) as TemplateResolutionError;
    error.code = "CARTRIDGE_NOT_FOUND";
    error.cartridgeId = cartridgeId;
    throw error;
  }

  const template = cartridge.templates.find((t) => t.id === templateId);
  if (!template) {
    const error = new Error(
      `Template resolution failed: templateId "${templateId}" not found in cartridge "${cartridgeId}"`
    ) as TemplateResolutionError;
    error.code = "TEMPLATE_NOT_FOUND";
    error.templateId = templateId;
    error.cartridgeId = cartridgeId;
    throw error;
  }

  return {
    template,
    cartridgeId: cartridge.id,
    cartridgeName: cartridge.name,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// VARIABLE SUBSTITUTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resolve template and apply variables in one step
 * This is what ExecutionRouter should use before sending to SignalHouse/Twilio
 */
export function resolveAndRenderTemplate(
  templateId: string,
  variables: Record<string, string>
): { message: string; template: SMSTemplate; cartridgeId: string } {
  const resolved = resolveTemplateById(templateId);

  let message = resolved.template.message;

  // Replace all {{variable}} patterns
  for (const [key, value] of Object.entries(variables)) {
    const patterns = [
      new RegExp(`\\{\\{${key}\\}\\}`, "g"),
      new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"),
    ];
    for (const pattern of patterns) {
      message = message.replace(pattern, value || "");
    }
  }

  // Clean up any remaining unreplaced variables
  message = message.replace(/\{\{[^}]+\}\}/g, "");

  return {
    message: message.trim(),
    template: resolved.template,
    cartridgeId: resolved.cartridgeId,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all templates from all cartridges
 */
export function getAllTemplates(): SMSTemplate[] {
  return CARTRIDGE_LIBRARY.flatMap((c) => c.templates);
}

/**
 * Get templates by stage
 */
export function getTemplatesByStage(stage: CampaignStage): SMSTemplate[] {
  return CARTRIDGE_LIBRARY.flatMap((c) =>
    c.templates.filter((t) => t.stage === stage)
  );
}

/**
 * Get templates by worker
 */
export function getTemplatesByWorker(worker: AIWorker): SMSTemplate[] {
  return CARTRIDGE_LIBRARY.flatMap((c) =>
    c.templates.filter((t) => t.worker === worker)
  );
}

/**
 * Get templates by tag
 */
export function getTemplatesByTag(tag: string): SMSTemplate[] {
  const lowerTag = tag.toLowerCase();
  return CARTRIDGE_LIBRARY.flatMap((c) =>
    c.templates.filter((t) => t.tags.some((tt) => tt.toLowerCase() === lowerTag))
  );
}

/**
 * Search templates by name or message content
 */
export function searchTemplates(query: string): ResolvedTemplate[] {
  const lowerQuery = query.toLowerCase();
  const results: ResolvedTemplate[] = [];

  for (const cartridge of CARTRIDGE_LIBRARY) {
    for (const template of cartridge.templates) {
      if (
        template.name.toLowerCase().includes(lowerQuery) ||
        template.message.toLowerCase().includes(lowerQuery) ||
        template.tags.some((t) => t.toLowerCase().includes(lowerQuery))
      ) {
        results.push({
          template,
          cartridgeId: cartridge.id,
          cartridgeName: cartridge.name,
        });
      }
    }
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate that a templateId is valid before saving to database
 * Call this in campaign prep handlers to enforce templateId-only saves
 */
export function validateTemplateId(templateId: unknown): asserts templateId is string {
  if (typeof templateId !== "string" || !templateId.trim()) {
    const error = new Error(
      "Invalid templateId: must be a non-empty string"
    ) as TemplateResolutionError;
    error.code = "TEMPLATE_ID_MISSING";
    throw error;
  }

  if (!templateExists(templateId)) {
    const error = new Error(
      `Invalid templateId: "${templateId}" does not exist in CARTRIDGE_LIBRARY`
    ) as TemplateResolutionError;
    error.code = "TEMPLATE_NOT_FOUND";
    error.templateId = templateId;
    throw error;
  }
}

/**
 * Check if input looks like a raw message (instead of templateId)
 * Used to reject raw message saves in campaign prep
 */
export function isRawMessage(input: string): boolean {
  if (!input) return false;

  // Raw messages are typically:
  // - Longer than 50 chars (templateIds are short like "bb-1", "crm-3")
  // - Contain spaces
  // - Contain punctuation like periods, question marks
  // - DON'T match the templateId pattern

  const templateIdPattern = /^[a-z]{2,4}-\d+$/i;
  if (templateIdPattern.test(input)) {
    return false; // Looks like a templateId
  }

  // If it has spaces or is long, it's probably a raw message
  if (input.includes(" ") || input.length > 30) {
    return true;
  }

  return false;
}

/**
 * Reject raw messages - throws if input looks like a raw message
 */
export function rejectRawMessage(input: string, context: string): void {
  if (isRawMessage(input)) {
    throw new Error(
      `[${context}] Raw message text rejected. Must use templateId from CARTRIDGE_LIBRARY.`
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  resolveTemplateById,
  resolveTemplateWithGroup,
  getTemplate,
  templateExists,
  resolveTemplateFromCartridge,
  resolveAndRenderTemplate,
  getAllTemplates,
  getTemplatesByStage,
  getTemplatesByWorker,
  getTemplatesByTag,
  searchTemplates,
  validateTemplateId,
  isRawMessage,
  rejectRawMessage,
};
