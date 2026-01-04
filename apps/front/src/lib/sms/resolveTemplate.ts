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
  TemplateLifecycle,
  type TemplateCartridge,
  type SMSTemplate,
  type CampaignStage,
  type AIWorker,
} from "./template-cartridges";

// ═══════════════════════════════════════════════════════════════════════════════
// RESOLUTION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ResolvedTemplate {
  template: SMSTemplate;
  cartridgeId: string;
  cartridgeName: string;
  lifecycle: TemplateLifecycle;
  isSendable: boolean; // true only for APPROVED templates
}

export interface TemplateResolutionError extends Error {
  code:
    | "TEMPLATE_NOT_FOUND"
    | "TEMPLATE_ID_MISSING"
    | "CARTRIDGE_NOT_FOUND"
    | "TEMPLATE_DISABLED"
    | "TEMPLATE_NOT_SENDABLE"
    | "TEMPLATE_DEPRECATED"
    | "TENANT_MISMATCH";
  templateId?: string;
  cartridgeId?: string;
  lifecycle?: TemplateLifecycle;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIFECYCLE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get effective lifecycle - defaults to APPROVED for CARTRIDGE_LIBRARY templates
 */
function getEffectiveLifecycle(template: SMSTemplate): TemplateLifecycle {
  return template.lifecycle ?? TemplateLifecycle.APPROVED;
}

/**
 * Check if template can be sent via SignalHouse/Twilio
 */
export function isTemplateSendable(template: SMSTemplate): boolean {
  const lifecycle = getEffectiveLifecycle(template);
  return lifecycle === TemplateLifecycle.APPROVED;
}

/**
 * Check if template is disabled (should throw on resolution)
 */
export function isTemplateDisabled(template: SMSTemplate): boolean {
  return getEffectiveLifecycle(template) === TemplateLifecycle.DISABLED;
}

/**
 * Check if template is deprecated (preview only)
 */
export function isTemplateDeprecated(template: SMSTemplate): boolean {
  return getEffectiveLifecycle(template) === TemplateLifecycle.DEPRECATED;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE RESOLUTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resolve a template by ID from CARTRIDGE_LIBRARY
 * Throws hard error if templateId is missing, not found, or DISABLED
 *
 * LIFECYCLE ENFORCEMENT:
 * - DISABLED templates throw hard error on resolution
 * - DEPRECATED templates resolve but isSendable=false
 * - DRAFT templates resolve but isSendable=false
 * - APPROVED templates resolve with isSendable=true
 *
 * @param templateId - The template ID to resolve
 * @param options - Optional resolution options
 * @returns ResolvedTemplate with template, cartridge context, and lifecycle info
 * @throws TemplateResolutionError if template not found or DISABLED
 */
export function resolveTemplateById(
  templateId: string,
  options?: { allowDisabled?: boolean; teamId?: string },
): ResolvedTemplate {
  // HARD ERROR: templateId is required
  if (!templateId || templateId.trim() === "") {
    const error = new Error(
      "Template resolution failed: templateId is required",
    ) as TemplateResolutionError;
    error.code = "TEMPLATE_ID_MISSING";
    throw error;
  }

  // Search all cartridges for the template
  for (const cartridge of CARTRIDGE_LIBRARY) {
    const template = cartridge.templates.find((t) => t.id === templateId);
    if (template) {
      const lifecycle = getEffectiveLifecycle(template);

      // HARD ERROR: DISABLED templates cannot be resolved
      if (lifecycle === TemplateLifecycle.DISABLED && !options?.allowDisabled) {
        const error = new Error(
          `Template resolution failed: templateId "${templateId}" is DISABLED`,
        ) as TemplateResolutionError;
        error.code = "TEMPLATE_DISABLED";
        error.templateId = templateId;
        error.lifecycle = lifecycle;
        throw error;
      }

      // TENANT GUARD: Check tenant scope if teamId provided
      if (
        template.tenantId &&
        options?.teamId &&
        template.tenantId !== options.teamId
      ) {
        const error = new Error(
          `Template resolution failed: templateId "${templateId}" belongs to different tenant`,
        ) as TemplateResolutionError;
        error.code = "TENANT_MISMATCH";
        error.templateId = templateId;
        throw error;
      }

      return {
        template,
        cartridgeId: cartridge.id,
        cartridgeName: cartridge.name,
        lifecycle,
        isSendable: lifecycle === TemplateLifecycle.APPROVED,
      };
    }
  }

  // HARD ERROR: Template not found
  const error = new Error(
    `Template resolution failed: templateId "${templateId}" not found in CARTRIDGE_LIBRARY`,
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
  cartridgeId: string,
  options?: { teamId?: string },
): ResolvedTemplate {
  if (!templateId) {
    const error = new Error(
      "Template resolution failed: templateId is required",
    ) as TemplateResolutionError;
    error.code = "TEMPLATE_ID_MISSING";
    throw error;
  }

  const cartridge = CARTRIDGE_LIBRARY.find((c) => c.id === cartridgeId);
  if (!cartridge) {
    const error = new Error(
      `Template resolution failed: cartridge "${cartridgeId}" not found`,
    ) as TemplateResolutionError;
    error.code = "CARTRIDGE_NOT_FOUND";
    error.cartridgeId = cartridgeId;
    throw error;
  }

  const template = cartridge.templates.find((t) => t.id === templateId);
  if (!template) {
    const error = new Error(
      `Template resolution failed: templateId "${templateId}" not found in cartridge "${cartridgeId}"`,
    ) as TemplateResolutionError;
    error.code = "TEMPLATE_NOT_FOUND";
    error.templateId = templateId;
    error.cartridgeId = cartridgeId;
    throw error;
  }

  const lifecycle = getEffectiveLifecycle(template);

  // HARD ERROR: DISABLED templates cannot be resolved
  if (lifecycle === TemplateLifecycle.DISABLED) {
    const error = new Error(
      `Template resolution failed: templateId "${templateId}" is DISABLED`,
    ) as TemplateResolutionError;
    error.code = "TEMPLATE_DISABLED";
    error.templateId = templateId;
    error.lifecycle = lifecycle;
    throw error;
  }

  // TENANT GUARD
  if (
    template.tenantId &&
    options?.teamId &&
    template.tenantId !== options.teamId
  ) {
    const error = new Error(
      `Template resolution failed: templateId "${templateId}" belongs to different tenant`,
    ) as TemplateResolutionError;
    error.code = "TENANT_MISMATCH";
    error.templateId = templateId;
    throw error;
  }

  return {
    template,
    cartridgeId: cartridge.id,
    cartridgeName: cartridge.name,
    lifecycle,
    isSendable: lifecycle === TemplateLifecycle.APPROVED,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// VARIABLE SUBSTITUTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resolve template and apply variables in one step
 * This is what ExecutionRouter should use before sending to SignalHouse/Twilio
 *
 * LIFECYCLE ENFORCEMENT:
 * - Throws if template is not APPROVED (unless allowNonSendable=true)
 * - Throws if teamId doesn't match tenant scope
 */
export function resolveAndRenderTemplate(
  templateId: string,
  variables: Record<string, string>,
  options?: { teamId?: string; allowNonSendable?: boolean },
): {
  message: string;
  template: SMSTemplate;
  cartridgeId: string;
  lifecycle: TemplateLifecycle;
  isSendable: boolean;
} {
  const resolved = resolveTemplateById(templateId, { teamId: options?.teamId });

  // LIFECYCLE ENFORCEMENT: Reject non-sendable templates by default
  if (!resolved.isSendable && !options?.allowNonSendable) {
    const error = new Error(
      `Template "${templateId}" is ${resolved.lifecycle} and cannot be sent. Only APPROVED templates can be sent via SignalHouse.`,
    ) as TemplateResolutionError;
    error.code = "TEMPLATE_NOT_SENDABLE";
    error.templateId = templateId;
    error.lifecycle = resolved.lifecycle;
    throw error;
  }

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
    lifecycle: resolved.lifecycle,
    isSendable: resolved.isSendable,
  };
}

/**
 * Validate template can be sent before ExecutionRouter sends
 * Throws if template is not sendable
 */
export function validateSendable(
  templateId: string,
  teamId?: string,
): ResolvedTemplate {
  const resolved = resolveTemplateById(templateId, { teamId });

  if (!resolved.isSendable) {
    const error = new Error(
      `Template "${templateId}" is ${resolved.lifecycle} and cannot be sent. Only APPROVED templates can be sent via SignalHouse.`,
    ) as TemplateResolutionError;
    error.code = "TEMPLATE_NOT_SENDABLE";
    error.templateId = templateId;
    error.lifecycle = resolved.lifecycle;
    throw error;
  }

  return resolved;
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
    c.templates.filter((t) => t.stage === stage),
  );
}

/**
 * Get templates by worker
 */
export function getTemplatesByWorker(worker: AIWorker): SMSTemplate[] {
  return CARTRIDGE_LIBRARY.flatMap((c) =>
    c.templates.filter((t) => t.worker === worker),
  );
}

/**
 * Get templates by tag
 */
export function getTemplatesByTag(tag: string): SMSTemplate[] {
  const lowerTag = tag.toLowerCase();
  return CARTRIDGE_LIBRARY.flatMap((c) =>
    c.templates.filter((t) =>
      t.tags.some((tt) => tt.toLowerCase() === lowerTag),
    ),
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
export function validateTemplateId(
  templateId: unknown,
): asserts templateId is string {
  if (typeof templateId !== "string" || !templateId.trim()) {
    const error = new Error(
      "Invalid templateId: must be a non-empty string",
    ) as TemplateResolutionError;
    error.code = "TEMPLATE_ID_MISSING";
    throw error;
  }

  if (!templateExists(templateId)) {
    const error = new Error(
      `Invalid templateId: "${templateId}" does not exist in CARTRIDGE_LIBRARY`,
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
      `[${context}] Raw message text rejected. Must use templateId from CARTRIDGE_LIBRARY.`,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

// Re-export TemplateLifecycle for convenience
export { TemplateLifecycle } from "./template-cartridges";

export default {
  // Core resolution
  resolveTemplateById,
  resolveTemplateWithGroup,
  getTemplate,
  templateExists,
  resolveTemplateFromCartridge,
  resolveAndRenderTemplate,

  // Lifecycle enforcement
  isTemplateSendable,
  isTemplateDisabled,
  isTemplateDeprecated,
  validateSendable,

  // Query functions
  getAllTemplates,
  getTemplatesByStage,
  getTemplatesByWorker,
  getTemplatesByTag,
  searchTemplates,

  // Validation
  validateTemplateId,
  isRawMessage,
  rejectRawMessage,
};
