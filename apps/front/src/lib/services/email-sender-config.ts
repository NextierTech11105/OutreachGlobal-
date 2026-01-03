/**
 * Email Sender Configuration
 *
 * Manages multiple sending addresses for different purposes:
 * - Lead Generation Follow-up: tb@outreachglobal.io
 * - Cold Campaigns: campaigns@outreachglobal.io (future)
 * - Transactional: noreply@outreachglobal.io
 *
 * All addresses must be verified in SendGrid before use.
 */

export interface SenderProfile {
  id: string;
  email: string;
  name: string;
  replyTo?: string;
  purpose: "lead_generation" | "cold_campaign" | "transactional" | "support";
  isActive: boolean;
  description: string;
}

// Sender profiles configuration
export const SENDER_PROFILES: Record<string, SenderProfile> = {
  // Lead Generation Follow-up - for responding to inbound leads
  lead_generation: {
    id: "lead_generation",
    email: "tb@outreachglobal.io",
    name: "Tyler Baughman",
    replyTo: "tb@outreachglobal.io",
    purpose: "lead_generation",
    isActive: true,
    description: "Lead generation follow-up emails (inbound responses)",
  },

  // Cold Campaign (future use)
  cold_campaign: {
    id: "cold_campaign",
    email: "campaigns@outreachglobal.io",
    name: "OutreachGlobal Team",
    replyTo: "campaigns@outreachglobal.io",
    purpose: "cold_campaign",
    isActive: false, // Not active yet per user request
    description: "Cold outreach campaigns (disabled)",
  },

  // Transactional emails (receipts, notifications, etc.)
  transactional: {
    id: "transactional",
    email: "noreply@outreachglobal.io",
    name: "OutreachGlobal",
    purpose: "transactional",
    isActive: true,
    description: "System notifications and transactional emails",
  },

  // Support/Help emails
  support: {
    id: "support",
    email: "support@outreachglobal.io",
    name: "OutreachGlobal Support",
    replyTo: "support@outreachglobal.io",
    purpose: "support",
    isActive: true,
    description: "Customer support communications",
  },
};

/**
 * Get sender profile by purpose
 */
export function getSenderByPurpose(
  purpose: SenderProfile["purpose"],
): SenderProfile | null {
  const profile = Object.values(SENDER_PROFILES).find(
    (p) => p.purpose === purpose && p.isActive,
  );
  return profile || null;
}

/**
 * Get sender profile by ID
 */
export function getSenderById(id: string): SenderProfile | null {
  return SENDER_PROFILES[id] || null;
}

/**
 * Get all active senders
 */
export function getActiveSenders(): SenderProfile[] {
  return Object.values(SENDER_PROFILES).filter((p) => p.isActive);
}

/**
 * Get sender for lead generation follow-up (tb@outreachglobal.io)
 */
export function getLeadGenSender(): SenderProfile {
  return SENDER_PROFILES.lead_generation;
}

/**
 * Check if a sender is authorized for a given purpose
 */
export function isSenderAuthorized(
  email: string,
  purpose: SenderProfile["purpose"],
): boolean {
  const profile = Object.values(SENDER_PROFILES).find(
    (p) => p.email === email && p.isActive,
  );
  return profile?.purpose === purpose;
}

// Default sender for different contexts
export const DEFAULT_SENDERS = {
  // Inbox replies to inbound leads
  inbox_reply: SENDER_PROFILES.lead_generation,

  // Follow-up sequences for engaged leads
  lead_followup: SENDER_PROFILES.lead_generation,

  // System notifications
  system: SENDER_PROFILES.transactional,

  // Cold campaigns (disabled for now)
  cold_campaign: SENDER_PROFILES.cold_campaign,
};

/**
 * Email categories for tracking in SendGrid
 */
export const EMAIL_CATEGORIES = {
  lead_generation: ["lead-gen", "follow-up", "inbound"],
  cold_campaign: ["cold-campaign", "outbound"],
  transactional: ["transactional", "system"],
  support: ["support", "customer-service"],
};
