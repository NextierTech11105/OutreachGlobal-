/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CONTACT SEQUENCE ENGINE - Smart Multi-Channel Outreach
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * CONTACT ORDER:
 * 1. PRIMARY PHONE (SMS) - First attempt
 * 2. MOBILE 1-5 (SMS) - Tracerfy alternate mobiles
 * 3. EMAIL - If no SMS response
 * 4. CALL QUEUE - Human override always available
 *
 * THREAD TRACKING:
 * - Each channel attempt is logged
 * - Conversation threads preserved per channel
 * - Human can click-to-call at ANY point (override)
 */

import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { sendSMS } from "@/lib/signalhouse/client";
import { Logger } from "@/lib/logger";

const log = new Logger("ContactSequence");

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ContactChannel = "sms" | "email" | "call" | "whatsapp";

export interface ContactAttempt {
  channel: ContactChannel;
  phoneOrEmail: string;
  phoneLabel?: string; // "primary" | "mobile1" | "mobile2" etc
  timestamp: string;
  status: "sent" | "delivered" | "failed" | "responded" | "no_response";
  messageId?: string;
  error?: string;
}

export interface ContactThread {
  leadId: string;
  channel: ContactChannel;
  phoneOrEmail: string;
  attempts: ContactAttempt[];
  lastAttemptAt: string;
  totalAttempts: number;
  hasResponse: boolean;
  responseAt?: string;
}

export interface LeadContactInfo {
  id: string;
  firstName: string;
  lastName: string;
  company?: string;
  // Phone sequence (in order)
  primaryPhone?: string;
  mobile1?: string;
  mobile2?: string;
  mobile3?: string;
  mobile4?: string;
  mobile5?: string;
  landline1?: string;
  landline2?: string;
  landline3?: string;
  // Emails
  email1?: string;
  email2?: string;
  email3?: string;
  // Current contact state
  contactThreads?: ContactThread[];
  currentSequenceStep: number;
  inCallQueue: boolean;
}

export interface SequenceConfig {
  maxSmsAttempts: number; // Max attempts per phone
  waitBetweenPhones: number; // Hours before trying next phone
  waitBeforeEmail: number; // Hours before trying email
  autoAddToCallQueue: boolean; // Auto-add after all attempts
  humanOverrideEnabled: boolean; // Allow click-to-call anytime
}

const DEFAULT_CONFIG: SequenceConfig = {
  maxSmsAttempts: 2, // Try each phone 2x
  waitBetweenPhones: 24, // 24 hours between phone attempts
  waitBeforeEmail: 48, // 48 hours before trying email
  autoAddToCallQueue: true,
  humanOverrideEnabled: true, // ALWAYS allow human override
};

// ═══════════════════════════════════════════════════════════════════════════════
// GET PHONE SEQUENCE - Returns phones in priority order
// ═══════════════════════════════════════════════════════════════════════════════

export function getPhoneSequence(lead: LeadContactInfo): Array<{
  phone: string;
  label: string;
  type: "mobile" | "landline";
}> {
  const phones: Array<{ phone: string; label: string; type: "mobile" | "landline" }> = [];

  // Primary first
  if (lead.primaryPhone) {
    phones.push({ phone: lead.primaryPhone, label: "primary", type: "mobile" });
  }

  // Mobiles next (highest priority for SMS)
  if (lead.mobile1) phones.push({ phone: lead.mobile1, label: "mobile1", type: "mobile" });
  if (lead.mobile2) phones.push({ phone: lead.mobile2, label: "mobile2", type: "mobile" });
  if (lead.mobile3) phones.push({ phone: lead.mobile3, label: "mobile3", type: "mobile" });
  if (lead.mobile4) phones.push({ phone: lead.mobile4, label: "mobile4", type: "mobile" });
  if (lead.mobile5) phones.push({ phone: lead.mobile5, label: "mobile5", type: "mobile" });

  // Landlines last (call queue only, not SMS)
  if (lead.landline1) phones.push({ phone: lead.landline1, label: "landline1", type: "landline" });
  if (lead.landline2) phones.push({ phone: lead.landline2, label: "landline2", type: "landline" });
  if (lead.landline3) phones.push({ phone: lead.landline3, label: "landline3", type: "landline" });

  return phones;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET EMAIL SEQUENCE - Returns emails in priority order
// ═══════════════════════════════════════════════════════════════════════════════

export function getEmailSequence(lead: LeadContactInfo): string[] {
  const emails: string[] = [];
  if (lead.email1) emails.push(lead.email1);
  if (lead.email2) emails.push(lead.email2);
  if (lead.email3) emails.push(lead.email3);
  return emails;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTE CONTACT SEQUENCE - Run through the sequence
// ═══════════════════════════════════════════════════════════════════════════════

export async function executeContactSequence(
  leadId: string,
  message: string,
  config: Partial<SequenceConfig> = {},
): Promise<{
  success: boolean;
  channel: ContactChannel;
  phoneOrEmail: string;
  phoneLabel?: string;
  messageId?: string;
  error?: string;
  nextStep?: string;
  addedToCallQueue?: boolean;
}> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Get lead with all contact info
  const [lead] = await db
    .select({
      id: leads.id,
      firstName: leads.firstName,
      lastName: leads.lastName,
      company: leads.company,
      primaryPhone: leads.primaryPhone,
      mobile1: leads.mobile1,
      mobile2: leads.mobile2,
      mobile3: leads.mobile3,
      mobile4: leads.mobile4,
      mobile5: leads.mobile5,
      landline1: leads.landline1,
      landline2: leads.landline2,
      landline3: leads.landline3,
      email1: leads.email1,
      email2: leads.email2,
      email3: leads.email3,
      customFields: leads.customFields,
    })
    .from(leads)
    .where(eq(leads.id, leadId));

  if (!lead) {
    return { success: false, channel: "sms", phoneOrEmail: "", error: "Lead not found" };
  }

  // Get contact threads from customFields
  const customFields = (lead.customFields as Record<string, unknown>) || {};
  const contactThreads = (customFields.contactThreads as ContactThread[]) || [];
  const currentStep = (customFields.currentSequenceStep as number) || 0;

  // Get phone sequence
  const phones = getPhoneSequence(lead as LeadContactInfo);
  const mobilePhones = phones.filter((p) => p.type === "mobile");

  // Find next phone to try (that hasn't been exhausted)
  for (let i = 0; i < mobilePhones.length; i++) {
    const phoneInfo = mobilePhones[i];
    const thread = contactThreads.find(
      (t) => t.phoneOrEmail === phoneInfo.phone && t.channel === "sms"
    );

    // Check if this phone has been exhausted
    const attempts = thread?.totalAttempts || 0;
    if (attempts >= cfg.maxSmsAttempts) {
      continue; // Try next phone
    }

    // Check if we got a response on this phone
    if (thread?.hasResponse) {
      // Don't try other numbers if we got a response
      return {
        success: true,
        channel: "sms",
        phoneOrEmail: phoneInfo.phone,
        phoneLabel: phoneInfo.label,
        nextStep: "responded",
      };
    }

    // Try this phone
    try {
      log.info(`[ContactSequence] Trying ${phoneInfo.label}: ${phoneInfo.phone}`);

      const result = await sendSMS({
        to: phoneInfo.phone,
        message: personalizeMessage(message, lead),
      });

      // Log the attempt
      const newAttempt: ContactAttempt = {
        channel: "sms",
        phoneOrEmail: phoneInfo.phone,
        phoneLabel: phoneInfo.label,
        timestamp: new Date().toISOString(),
        status: result.success ? "sent" : "failed",
        messageId: result.data?.messageId,
        error: result.error,
      };

      // Update thread
      await updateContactThread(leadId, phoneInfo.phone, "sms", newAttempt);

      if (result.success) {
        return {
          success: true,
          channel: "sms",
          phoneOrEmail: phoneInfo.phone,
          phoneLabel: phoneInfo.label,
          messageId: result.data?.messageId,
          nextStep: i < mobilePhones.length - 1 ? `next: ${mobilePhones[i + 1].label}` : "email",
        };
      }
    } catch (error) {
      log.error(`[ContactSequence] Failed on ${phoneInfo.label}`, error);
    }
  }

  // All phones exhausted, try email
  const emails = getEmailSequence(lead as LeadContactInfo);
  if (emails.length > 0) {
    log.info(`[ContactSequence] SMS exhausted, moving to email: ${emails[0]}`);
    // TODO: Implement email sending
    return {
      success: false,
      channel: "email",
      phoneOrEmail: emails[0],
      nextStep: "email_pending",
      error: "Email sending not yet implemented - adding to call queue",
      addedToCallQueue: cfg.autoAddToCallQueue,
    };
  }

  // No email, add to call queue
  if (cfg.autoAddToCallQueue) {
    await addToCallQueue(leadId);
    return {
      success: false,
      channel: "call",
      phoneOrEmail: phones[0]?.phone || "",
      nextStep: "call_queue",
      addedToCallQueue: true,
    };
  }

  return {
    success: false,
    channel: "sms",
    phoneOrEmail: "",
    error: "All contact methods exhausted",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE CONTACT THREAD - Track all communication
// ═══════════════════════════════════════════════════════════════════════════════

async function updateContactThread(
  leadId: string,
  phoneOrEmail: string,
  channel: ContactChannel,
  attempt: ContactAttempt,
): Promise<void> {
  const [lead] = await db.select({ customFields: leads.customFields }).from(leads).where(eq(leads.id, leadId));

  const customFields = (lead?.customFields as Record<string, unknown>) || {};
  const threads = (customFields.contactThreads as ContactThread[]) || [];

  // Find or create thread
  let thread = threads.find((t) => t.phoneOrEmail === phoneOrEmail && t.channel === channel);

  if (!thread) {
    thread = {
      leadId,
      channel,
      phoneOrEmail,
      attempts: [],
      lastAttemptAt: attempt.timestamp,
      totalAttempts: 0,
      hasResponse: false,
    };
    threads.push(thread);
  }

  // Add attempt
  thread.attempts.push(attempt);
  thread.totalAttempts++;
  thread.lastAttemptAt = attempt.timestamp;

  // Update lead
  await db
    .update(leads)
    .set({
      customFields: sql`
        jsonb_set(
          COALESCE(custom_fields, '{}'::jsonb),
          '{contactThreads}',
          ${JSON.stringify(threads)}::jsonb
        )
      `,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, leadId));
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADD TO CALL QUEUE - Human override / escalation
// ═══════════════════════════════════════════════════════════════════════════════

export async function addToCallQueue(
  leadId: string,
  priority: "high" | "normal" | "low" = "normal",
  reason?: string,
): Promise<void> {
  await db
    .update(leads)
    .set({
      leadState: "in_call_queue",
      customFields: sql`
        jsonb_set(
          jsonb_set(
            COALESCE(custom_fields, '{}'::jsonb),
            '{inCallQueue}',
            'true'::jsonb
          ),
          '{callQueueMeta}',
          ${JSON.stringify({
            addedAt: new Date().toISOString(),
            priority,
            reason: reason || "sequence_exhausted",
          })}::jsonb
        )
      `,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, leadId));

  log.info(`[ContactSequence] Lead ${leadId} added to call queue (${priority})`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HUMAN OVERRIDE - Click to call (always available)
// ═══════════════════════════════════════════════════════════════════════════════

export async function humanOverrideCall(
  leadId: string,
  phoneToCall?: string,
): Promise<{
  phone: string;
  allPhones: Array<{ phone: string; label: string }>;
  leadInfo: { firstName: string; company?: string };
}> {
  const [lead] = await db
    .select({
      id: leads.id,
      firstName: leads.firstName,
      lastName: leads.lastName,
      company: leads.company,
      primaryPhone: leads.primaryPhone,
      mobile1: leads.mobile1,
      mobile2: leads.mobile2,
      mobile3: leads.mobile3,
      landline1: leads.landline1,
      landline2: leads.landline2,
    })
    .from(leads)
    .where(eq(leads.id, leadId));

  if (!lead) {
    throw new Error("Lead not found");
  }

  const phones = getPhoneSequence(lead as LeadContactInfo);
  const phoneToUse = phoneToCall || phones[0]?.phone || "";

  // Log the call attempt
  await updateContactThread(leadId, phoneToUse, "call", {
    channel: "call",
    phoneOrEmail: phoneToUse,
    timestamp: new Date().toISOString(),
    status: "sent", // Will be updated by voice webhook
  });

  return {
    phone: phoneToUse,
    allPhones: phones.map((p) => ({ phone: p.phone, label: p.label })),
    leadInfo: {
      firstName: lead.firstName || "",
      company: lead.company || undefined,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MARK RESPONSE - When lead responds on any channel
// ═══════════════════════════════════════════════════════════════════════════════

export async function markResponse(
  leadId: string,
  channel: ContactChannel,
  phoneOrEmail: string,
): Promise<void> {
  const [lead] = await db.select({ customFields: leads.customFields }).from(leads).where(eq(leads.id, leadId));

  const customFields = (lead?.customFields as Record<string, unknown>) || {};
  const threads = (customFields.contactThreads as ContactThread[]) || [];

  // Find thread and mark responded
  const thread = threads.find((t) => t.phoneOrEmail === phoneOrEmail && t.channel === channel);
  if (thread) {
    thread.hasResponse = true;
    thread.responseAt = new Date().toISOString();
  }

  await db
    .update(leads)
    .set({
      leadState: "responded",
      customFields: sql`
        jsonb_set(
          COALESCE(custom_fields, '{}'::jsonb),
          '{contactThreads}',
          ${JSON.stringify(threads)}::jsonb
        )
      `,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, leadId));
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET CONTACT SUMMARY - For UI display
// ═══════════════════════════════════════════════════════════════════════════════

export async function getContactSummary(leadId: string): Promise<{
  phones: Array<{ phone: string; label: string; attempts: number; lastAttempt?: string; hasResponse: boolean }>;
  emails: Array<{ email: string; attempts: number; lastAttempt?: string; hasResponse: boolean }>;
  inCallQueue: boolean;
  totalAttempts: number;
  lastChannel: ContactChannel | null;
  hasAnyResponse: boolean;
}> {
  const [lead] = await db
    .select({
      primaryPhone: leads.primaryPhone,
      mobile1: leads.mobile1,
      mobile2: leads.mobile2,
      mobile3: leads.mobile3,
      mobile4: leads.mobile4,
      mobile5: leads.mobile5,
      email1: leads.email1,
      email2: leads.email2,
      email3: leads.email3,
      customFields: leads.customFields,
    })
    .from(leads)
    .where(eq(leads.id, leadId));

  if (!lead) {
    return {
      phones: [],
      emails: [],
      inCallQueue: false,
      totalAttempts: 0,
      lastChannel: null,
      hasAnyResponse: false,
    };
  }

  const customFields = (lead.customFields as Record<string, unknown>) || {};
  const threads = (customFields.contactThreads as ContactThread[]) || [];
  const inCallQueue = (customFields.inCallQueue as boolean) || false;

  const phones = getPhoneSequence(lead as LeadContactInfo).map((p) => {
    const thread = threads.find((t) => t.phoneOrEmail === p.phone && t.channel === "sms");
    return {
      phone: p.phone,
      label: p.label,
      attempts: thread?.totalAttempts || 0,
      lastAttempt: thread?.lastAttemptAt,
      hasResponse: thread?.hasResponse || false,
    };
  });

  const emails = getEmailSequence(lead as LeadContactInfo).map((email) => {
    const thread = threads.find((t) => t.phoneOrEmail === email && t.channel === "email");
    return {
      email,
      attempts: thread?.totalAttempts || 0,
      lastAttempt: thread?.lastAttemptAt,
      hasResponse: thread?.hasResponse || false,
    };
  });

  const totalAttempts = threads.reduce((sum, t) => sum + t.totalAttempts, 0);
  const hasAnyResponse = threads.some((t) => t.hasResponse);
  const lastThread = threads.sort((a, b) =>
    new Date(b.lastAttemptAt).getTime() - new Date(a.lastAttemptAt).getTime()
  )[0];

  return {
    phones,
    emails,
    inCallQueue,
    totalAttempts,
    lastChannel: lastThread?.channel || null,
    hasAnyResponse,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function personalizeMessage(
  template: string,
  lead: { firstName?: string | null; lastName?: string | null; company?: string | null },
): string {
  let message = template;
  message = message.replace(/\{firstName\}/gi, lead.firstName || "there");
  message = message.replace(/\{lastName\}/gi, lead.lastName || "");
  message = message.replace(/\{company\}/gi, lead.company || "your business");
  message = message.replace(/\{name\}/gi, lead.firstName || "there");
  return message.trim();
}

log.info("[ContactSequence] Contact Sequence Engine loaded");
