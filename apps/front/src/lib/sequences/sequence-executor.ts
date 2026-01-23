/**
 * SEQUENCE EXECUTOR
 *
 * The missing orchestration layer that actually executes sequence steps.
 * Connects sequences → SMS/Email/Call channels → SignalHouse/Gmail/Twilio
 *
 * Flow:
 * 1. Lead enrolled in sequence
 * 2. Cron triggers executor
 * 3. Executor finds leads ready for next step
 * 4. Executor executes step (SMS/Email/Call)
 * 5. Executor schedules next step
 */

import { db } from "@/lib/db";
import { leads, sequenceEnrollments } from "@/lib/db/schema";
import { eq, and, lte, isNotNull, ne } from "drizzle-orm";
import { smsQueueService } from "@/lib/services/sms-queue-service";
import { signalHouseService } from "@/lib/services/signalhouse-service";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ChannelContent {
  enabled: boolean;
  templateId?: string;
  subject?: string;
  message: string;
}

export interface SequenceStep {
  id: string;
  name: string;
  order: number;
  delayDays: number;
  delayHours: number;
  sms: ChannelContent;
  email: ChannelContent;
  voice: ChannelContent;
  condition?: {
    skipIf: "responded" | "opted_out" | "email_captured" | "appointment_set";
  };
}

export interface SequenceDefinition {
  id: string;
  teamId: string;
  name: string;
  status: "active" | "paused" | "draft";
  worker: "gianna" | "cathy" | "sabrina";
  steps: SequenceStep[];
}

export interface ExecutionResult {
  leadId: string;
  stepId: string;
  channels: {
    sms?: { success: boolean; messageId?: string; error?: string };
    email?: { success: boolean; messageId?: string; error?: string };
    voice?: { success: boolean; callId?: string; error?: string };
  };
  nextStepAt?: Date;
  completed: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// IN-MEMORY SEQUENCE STORE (until DB migration)
// ═══════════════════════════════════════════════════════════════════════════

const SEQUENCES: Map<string, SequenceDefinition> = new Map();

// ═══════════════════════════════════════════════════════════════════════════
// SEQUENCE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

export function registerSequence(sequence: SequenceDefinition): void {
  SEQUENCES.set(sequence.id, sequence);
  console.log(`[SequenceExecutor] Registered sequence: ${sequence.id} - ${sequence.name}`);
}

export function getSequence(sequenceId: string): SequenceDefinition | undefined {
  return SEQUENCES.get(sequenceId);
}

export function listSequences(teamId?: string): SequenceDefinition[] {
  const all = Array.from(SEQUENCES.values());
  if (teamId) {
    return all.filter(s => s.teamId === teamId || s.teamId === "default");
  }
  return all;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE RENDERING
// ═══════════════════════════════════════════════════════════════════════════

function renderTemplate(template: string, variables: Record<string, string>): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`{{${key}}}`, "gi"), value || "");
    rendered = rendered.replace(new RegExp(`{${key}}`, "gi"), value || "");
  }
  return rendered;
}

// ═══════════════════════════════════════════════════════════════════════════
// CHANNEL EXECUTORS
// ═══════════════════════════════════════════════════════════════════════════

async function executeSMS(
  phone: string,
  message: string,
  leadId: string,
  sequenceId: string,
  stepId: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Check opt-out first
    if (smsQueueService.isOptedOut(phone)) {
      return { success: false, error: "Phone is opted out" };
    }

    // Send directly via SignalHouse
    const response = await signalHouseService.sendSMS({
      to: phone,
      message,
      tags: [`sequence:${sequenceId}`, `step:${stepId}`, `lead:${leadId}`],
    });

    return {
      success: true,
      messageId: response.messageId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "SMS send failed",
    };
  }
}

async function executeEmail(
  email: string,
  subject: string,
  body: string,
  leadId: string,
  sequenceId: string,
  stepId: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Use Gmail via nodemailer
    const nodemailer = await import("nodemailer");

    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;
    const gmailName = process.env.GMAIL_NAME || "Nextier";

    if (!gmailUser || !gmailPassword) {
      return { success: false, error: "Gmail not configured" };
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPassword,
      },
    });

    const info = await transporter.sendMail({
      from: `"${gmailName}" <${gmailUser}>`,
      to: email,
      subject,
      html: body,
      headers: {
        "X-Sequence-ID": sequenceId,
        "X-Step-ID": stepId,
        "X-Lead-ID": leadId,
      },
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Email send failed",
    };
  }
}

async function executeVoice(
  phone: string,
  leadId: string,
  sequenceId: string,
  stepId: string
): Promise<{ success: boolean; callId?: string; error?: string }> {
  try {
    // Use Twilio for voice
    const twilio = await import("twilio");

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return { success: false, error: "Twilio not configured" };
    }

    const client = twilio.default(accountSid, authToken);

    // Create call - connects to agent or voicemail
    const call = await client.calls.create({
      to: phone,
      from: fromNumber,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice/sequence?sequenceId=${sequenceId}&stepId=${stepId}&leadId=${leadId}`,
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice/status`,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    });

    return {
      success: true,
      callId: call.sid,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Voice call failed",
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════

export async function executeStep(
  enrollment: {
    id: string;
    sequenceId: string;
    leadId: string;
    currentStep: number;
    teamId: string;
  },
  lead: {
    phone?: string | null;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    companyName?: string | null;
  }
): Promise<ExecutionResult> {
  const sequence = getSequence(enrollment.sequenceId);

  if (!sequence) {
    console.error(`[SequenceExecutor] Sequence not found: ${enrollment.sequenceId}`);
    return {
      leadId: enrollment.leadId,
      stepId: "unknown",
      channels: {},
      completed: true,
    };
  }

  // Get current step
  const step = sequence.steps[enrollment.currentStep];

  if (!step) {
    // Sequence complete
    console.log(`[SequenceExecutor] Sequence complete for lead ${enrollment.leadId}`);
    return {
      leadId: enrollment.leadId,
      stepId: "complete",
      channels: {},
      completed: true,
    };
  }

  // Build variables for template rendering
  const variables: Record<string, string> = {
    firstName: lead.firstName || "there",
    lastName: lead.lastName || "",
    fullName: `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || "there",
    companyName: lead.companyName || "",
    phone: lead.phone || "",
    email: lead.email || "",
  };

  const result: ExecutionResult = {
    leadId: enrollment.leadId,
    stepId: step.id,
    channels: {},
    completed: false,
  };

  // Execute SMS if enabled
  if (step.sms.enabled && lead.phone) {
    const smsMessage = renderTemplate(step.sms.message, variables);
    result.channels.sms = await executeSMS(
      lead.phone,
      smsMessage,
      enrollment.leadId,
      enrollment.sequenceId,
      step.id
    );
  }

  // Execute Email if enabled
  if (step.email.enabled && lead.email) {
    const emailSubject = renderTemplate(step.email.subject || "Message from Nextier", variables);
    const emailBody = renderTemplate(step.email.message, variables);
    result.channels.email = await executeEmail(
      lead.email,
      emailSubject,
      emailBody,
      enrollment.leadId,
      enrollment.sequenceId,
      step.id
    );
  }

  // Execute Voice if enabled
  if (step.voice.enabled && lead.phone) {
    result.channels.voice = await executeVoice(
      lead.phone,
      enrollment.leadId,
      enrollment.sequenceId,
      step.id
    );
  }

  // Calculate next step timing
  const nextStepIndex = enrollment.currentStep + 1;
  if (nextStepIndex < sequence.steps.length) {
    const nextStep = sequence.steps[nextStepIndex];
    const nextStepAt = new Date();
    nextStepAt.setDate(nextStepAt.getDate() + (nextStep.delayDays || 0));
    nextStepAt.setHours(nextStepAt.getHours() + (nextStep.delayHours || 0));
    result.nextStepAt = nextStepAt;
  } else {
    result.completed = true;
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// BATCH PROCESSOR
// ═══════════════════════════════════════════════════════════════════════════

export interface BatchProcessResult {
  processed: number;
  succeeded: number;
  failed: number;
  completed: number;
  results: ExecutionResult[];
  duration: number;
}

export async function processEnrolledLeads(limit: number = 50): Promise<BatchProcessResult> {
  const startTime = Date.now();
  const now = new Date();
  const results: ExecutionResult[] = [];

  if (!db) {
    console.error("[SequenceExecutor] Database not available");
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      completed: 0,
      results: [],
      duration: Date.now() - startTime,
    };
  }

  try {
    // Find enrollments ready for processing
    const enrollments = await db
      .select({
        id: sequenceEnrollments.id,
        sequenceId: sequenceEnrollments.sequenceId,
        leadId: sequenceEnrollments.leadId,
        teamId: sequenceEnrollments.teamId,
        currentStep: sequenceEnrollments.currentStep,
        status: sequenceEnrollments.status,
      })
      .from(sequenceEnrollments)
      .where(
        and(
          eq(sequenceEnrollments.status, "active"),
          lte(sequenceEnrollments.nextStepAt, now)
        )
      )
      .limit(limit);

    console.log(`[SequenceExecutor] Found ${enrollments.length} enrollments to process`);

    for (const enrollment of enrollments) {
      // Fetch lead data
      const [lead] = await db
        .select({
          phone: leads.phone,
          email: leads.email,
          firstName: leads.firstName,
          lastName: leads.lastName,
          companyName: leads.companyName,
          status: leads.status,
        })
        .from(leads)
        .where(eq(leads.id, enrollment.leadId))
        .limit(1);

      if (!lead) {
        console.warn(`[SequenceExecutor] Lead not found: ${enrollment.leadId}`);
        continue;
      }

      // Skip if lead is opted out
      if (lead.status === "opted_out" || lead.status === "do_not_contact") {
        await db
          .update(sequenceEnrollments)
          .set({
            status: "cancelled",
            updatedAt: now,
          })
          .where(eq(sequenceEnrollments.id, enrollment.id));
        continue;
      }

      // Execute the step
      const result = await executeStep(enrollment, lead);
      results.push(result);

      // Update enrollment
      if (result.completed) {
        await db
          .update(sequenceEnrollments)
          .set({
            status: "completed",
            currentStep: enrollment.currentStep + 1,
            lastStepAt: now,
            updatedAt: now,
          })
          .where(eq(sequenceEnrollments.id, enrollment.id));
      } else if (result.nextStepAt) {
        await db
          .update(sequenceEnrollments)
          .set({
            currentStep: enrollment.currentStep + 1,
            nextStepAt: result.nextStepAt,
            lastStepAt: now,
            updatedAt: now,
          })
          .where(eq(sequenceEnrollments.id, enrollment.id));
      }
    }

    const succeeded = results.filter(r =>
      Object.values(r.channels).some(c => c?.success)
    ).length;

    const failed = results.filter(r =>
      Object.values(r.channels).every(c => c && !c.success)
    ).length;

    const completed = results.filter(r => r.completed).length;

    return {
      processed: results.length,
      succeeded,
      failed,
      completed,
      results,
      duration: Date.now() - startTime,
    };

  } catch (error) {
    console.error("[SequenceExecutor] Batch processing error:", error);
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      completed: 0,
      results: [],
      duration: Date.now() - startTime,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ENROLLMENT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

export async function enrollLead(
  sequenceId: string,
  leadId: string,
  teamId: string,
  startAt?: Date
): Promise<{ success: boolean; enrollmentId?: string; error?: string }> {
  const sequence = getSequence(sequenceId);

  if (!sequence) {
    return { success: false, error: "Sequence not found" };
  }

  if (sequence.status !== "active") {
    return { success: false, error: "Sequence is not active" };
  }

  if (!db) {
    return { success: false, error: "Database not available" };
  }

  try {
    const enrollmentId = `enr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // Calculate first step timing
    const firstStep = sequence.steps[0];
    const nextStepAt = startAt || new Date();
    if (firstStep) {
      nextStepAt.setDate(nextStepAt.getDate() + (firstStep.delayDays || 0));
      nextStepAt.setHours(nextStepAt.getHours() + (firstStep.delayHours || 0));
    }

    await db.insert(sequenceEnrollments).values({
      id: enrollmentId,
      sequenceId,
      leadId,
      teamId,
      status: "active",
      currentStep: 0,
      nextStepAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`[SequenceExecutor] Enrolled lead ${leadId} in sequence ${sequenceId}`);

    return { success: true, enrollmentId };

  } catch (error) {
    console.error("[SequenceExecutor] Enrollment error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Enrollment failed",
    };
  }
}

export async function unenrollLead(
  sequenceId: string,
  leadId: string
): Promise<{ success: boolean; error?: string }> {
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  try {
    await db
      .update(sequenceEnrollments)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(sequenceEnrollments.sequenceId, sequenceId),
          eq(sequenceEnrollments.leadId, leadId),
          ne(sequenceEnrollments.status, "completed")
        )
      );

    return { success: true };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unenrollment failed",
    };
  }
}

// Export singleton-style functions
export const sequenceExecutor = {
  registerSequence,
  getSequence,
  listSequences,
  executeStep,
  processEnrolledLeads,
  enrollLead,
  unenrollLead,
};
