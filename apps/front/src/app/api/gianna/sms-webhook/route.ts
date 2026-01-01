import { NextRequest, NextResponse } from "next/server";
import { gianna, type GiannaContext } from "@/lib/gianna/gianna-service";
import {
  classifyResponse,
  extractEmail,
  isOptOut,
  type ClassificationResult,
} from "@/lib/response-classifications";
import { db } from "@/lib/db";
import { aiDecisionLogs } from "@/lib/db/schema";
import crypto from "crypto";

/**
 * GIANNA AI SMS WEBHOOK HANDLER
 *
 * Receives inbound SMS messages and generates AI responses using
 * the full Gianna personality DNA system.
 *
 * Features:
 * - Intent classification (interested, objection, opt-out, etc.)
 * - Personality-based response generation
 * - Email capture automation trigger
 * - Human-in-loop for first 3 rebuttals
 * - Opt-out compliance
 * - Client-specific response classifications (Homeowner Advisor: Email Capture)
 */

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://monkfish-app-mb7h3.ondigitalocean.app";
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;
const OPT_OUT_KEYWORDS = [
  "stop",
  "unsubscribe",
  "opt out",
  "opt-out",
  "remove",
  "cancel",
  "quit",
  "end",
];

// Conversation context store (would be DB in production)
const conversationContextStore = new Map<
  string,
  {
    firstName?: string;
    lastName?: string;
    companyName?: string;
    industry?: string;
    propertyAddress?: string;
    propertyId?: string;
    leadType?: string;
    clientId?: string; // Which client this conversation belongs to
    lastMessageAt: string;
    messageCount: number;
    lastIntent?: string;
    history: Array<{
      role: "user" | "assistant";
      content: string;
      timestamp: string;
    }>;
  }
>();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract Twilio webhook parameters
    const from = formData.get("From") as string;
    const to = formData.get("To") as string;
    const body = formData.get("Body") as string;
    const messageSid = formData.get("MessageSid") as string;

    console.log("[Gianna SMS] Inbound message:", {
      from,
      to,
      body: body?.slice(0, 50),
      messageSid,
    });

    if (!from || !body) {
      return emptyTwimlResponse();
    }

    // Get or create conversation context
    const storedContext = conversationContextStore.get(from) || {
      lastMessageAt: "",
      messageCount: 0,
      history: [],
    };

    // Update context
    storedContext.lastMessageAt = new Date().toISOString();
    storedContext.messageCount++;
    storedContext.history.push({
      role: "user",
      content: body,
      timestamp: new Date().toISOString(),
    });

    // Build Gianna context
    const giannaContext: GiannaContext = {
      firstName: storedContext.firstName,
      lastName: storedContext.lastName,
      companyName: storedContext.companyName,
      industry: storedContext.industry,
      propertyAddress: storedContext.propertyAddress,
      phone: from,
      channel: "sms",
      stage: determineStage(storedContext),
      messageNumber: storedContext.messageCount,
      conversationHistory: storedContext.history,
      leadType: storedContext.leadType as any,
      agentName: "Gianna",
    };

    // ═════════════════════════════════════════════════
    // STEP 1: Check for opt-out (immediate compliance)
    // ═════════════════════════════════════════════════
    if (OPT_OUT_KEYWORDS.some((kw) => body.toLowerCase().includes(kw))) {
      console.log("[Gianna SMS] Opt-out detected from:", from);

      // Add to DNC list
      await addToDNCList(from);

      // Clear context
      conversationContextStore.delete(from);

      return twimlResponse("You've been removed from our list. Take care!");
    }

    // ═════════════════════════════════════════════════
    // STEP 2: Classify response (AI Copilot Gianna - Inbound Response Handling)
    // ═════════════════════════════════════════════════
    const clientId = storedContext.clientId || "homeowner-advisor"; // Default to Homeowner Advisor
    const classification = classifyResponse(clientId, body);

    if (classification) {
      console.log(
        `[Gianna SMS] Classification: ${classification.classificationName} (${classification.classificationId}) for client: ${clientId}`,
      );
    }

    // ═════════════════════════════════════════════════
    // STEP 3: Handle Email Capture (Homeowner Advisor)
    // ═════════════════════════════════════════════════
    const emailMatch = body.match(EMAIL_REGEX);
    if (emailMatch) {
      const email = emailMatch[0].toLowerCase();
      console.log(
        `[Gianna SMS] EMAIL CAPTURE: ${email} from ${from} | Client: ${clientId}`,
      );

      // Trigger email capture automation (async)
      // Deliverable: PROPERTY VALUATION REPORT for Homeowner Advisor
      triggerEmailCaptureAutomation({
        email,
        smsMessage: body,
        fromPhone: from,
        toPhone: to,
        firstName: storedContext.firstName,
        propertyId: storedContext.propertyId,
        propertyAddress: storedContext.propertyAddress,
        clientId,
        classification: classification?.classificationId || "email-capture",
        deliverable: "property-valuation-report",
      });

      // Update context
      storedContext.history.push({
        role: "assistant",
        content: `Email captured: ${email}`,
        timestamp: new Date().toISOString(),
      });
      conversationContextStore.set(from, storedContext);

      const confirmMessage = `Perfect${storedContext.firstName ? ` ${storedContext.firstName}` : ""}! Just sent your property analysis to ${email}. Check your inbox (and spam folder just in case). When you're ready to talk strategy, my calendar link is in there too. 📧`;

      return twimlResponse(confirmMessage);
    }

    // ═════════════════════════════════════════════════
    // STEP 3: Generate AI response using Gianna
    // ═════════════════════════════════════════════════
    const giannaResponse = await gianna.generateResponse(body, giannaContext);

    console.log("[Gianna SMS] Response generated:", {
      intent: giannaResponse.intent,
      personality: giannaResponse.personality,
      confidence: giannaResponse.confidence,
      requiresHumanReview: giannaResponse.requiresHumanReview,
    });

    // ═════════════════════════════════════════════════
    // STEP 3.5: Log AI decision for compliance/audit
    // ═════════════════════════════════════════════════
    const leadId = storedContext.propertyId || from; // Use propertyId if available, else phone
    await logAiDecision({
      leadId,
      workerId: "gianna",
      inboundMessage: body,
      intent: giannaResponse.intent,
      confidence: giannaResponse.confidence,
      generatedResponse: giannaResponse.message,
      responseSent: false, // Will update below if sent
    });

    // ═════════════════════════════════════════════════
    // STEP 4: Handle human-in-loop requirement
    // ═════════════════════════════════════════════════
    if (giannaResponse.requiresHumanReview) {
      console.log("[Gianna SMS] Human review required, queuing for approval");

      // Queue for human review (async)
      await queueForHumanReview({
        from,
        to,
        incomingMessage: body,
        suggestedResponse: giannaResponse.message,
        alternatives: giannaResponse.alternatives,
        intent: giannaResponse.intent,
        confidence: giannaResponse.confidence,
        context: storedContext,
      });

      // Don't auto-respond - human will approve
      return emptyTwimlResponse();
    }

    // ═════════════════════════════════════════════════
    // STEP 5: Send response based on confidence level
    // ═════════════════════════════════════════════════

    // HIGH CONFIDENCE (70%+): Auto-send
    if (giannaResponse.confidence >= 70) {
      // Update conversation history
      storedContext.history.push({
        role: "assistant",
        content: giannaResponse.message,
        timestamp: new Date().toISOString(),
      });
      storedContext.lastIntent = giannaResponse.intent;
      conversationContextStore.set(from, storedContext);

      // Update AI log to mark as sent
      await logAiDecision({
        leadId,
        workerId: "gianna",
        inboundMessage: body,
        intent: giannaResponse.intent,
        confidence: giannaResponse.confidence,
        generatedResponse: giannaResponse.message,
        responseSent: true,
      });

      // Handle next action
      if (giannaResponse.nextAction) {
        handleNextAction(giannaResponse.nextAction, from, storedContext);
      }

      return twimlResponse(giannaResponse.message);
    }

    // MEDIUM CONFIDENCE (50-70%): Queue for human review with MEDIUM priority
    if (giannaResponse.confidence >= 50) {
      console.log(
        "[Gianna SMS] Medium confidence (50-70%), queuing for MEDIUM priority review:",
        giannaResponse.confidence,
      );

      await queueForHumanReview({
        from,
        to,
        incomingMessage: body,
        suggestedResponse: giannaResponse.message,
        alternatives: giannaResponse.alternatives,
        intent: giannaResponse.intent,
        confidence: giannaResponse.confidence,
        context: storedContext,
        priority: "MEDIUM", // Explicit medium priority
      });

      conversationContextStore.set(from, storedContext);
      return emptyTwimlResponse();
    }

    // LOW CONFIDENCE (<50%): Queue for HIGH priority human review
    console.log(
      "[Gianna SMS] Low confidence (<50%), queuing for HIGH priority review:",
      giannaResponse.confidence,
    );

    await queueForHumanReview({
      from,
      to,
      incomingMessage: body,
      suggestedResponse: giannaResponse.message,
      alternatives: giannaResponse.alternatives,
      intent: giannaResponse.intent,
      confidence: giannaResponse.confidence,
      context: storedContext,
      priority: "HIGH", // Needs immediate attention
    });

    conversationContextStore.set(from, storedContext);
    return emptyTwimlResponse();
  } catch (error) {
    console.error("[Gianna SMS] Error:", error);
    return emptyTwimlResponse();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function determineStage(context: {
  messageCount: number;
  lastIntent?: string;
}): GiannaContext["stage"] {
  if (context.messageCount === 1) return "cold_open";
  if (context.lastIntent === "interested") return "hot_response";
  if (context.lastIntent?.startsWith("objection")) return "handling_pushback";
  if (context.messageCount > 3) return "follow_up";
  return "warming_up";
}

function twimlResponse(message: string): NextResponse {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`;

  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml" },
  });
}

function emptyTwimlResponse(): NextResponse {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
    { headers: { "Content-Type": "text/xml" } },
  );
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function addToDNCList(phone: string): Promise<void> {
  try {
    await fetch(`${APP_URL}/api/suppression`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        reason: "sms_opt_out",
        source: "gianna_sms_webhook",
      }),
    });
  } catch (error) {
    console.error("[Gianna SMS] Failed to add to DNC:", error);
  }
}

function triggerEmailCaptureAutomation(data: {
  email: string;
  smsMessage: string;
  fromPhone: string;
  toPhone: string;
  firstName?: string;
  propertyId?: string;
  propertyAddress?: string;
  clientId?: string;
  classification?: string;
  deliverable?: string;
}): void {
  fetch(`${APP_URL}/api/automation/email-capture`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).catch((err) =>
    console.error("[Gianna SMS] Email automation trigger failed:", err),
  );
}

async function queueForHumanReview(data: {
  from: string;
  to: string;
  incomingMessage: string;
  suggestedResponse: string;
  alternatives?: string[];
  intent?: string;
  confidence: number;
  context: Record<string, unknown>;
  priority?: "HIGH" | "MEDIUM" | "LOW";
}): Promise<void> {
  try {
    // Use explicit priority if provided, otherwise calculate from confidence
    const priority =
      data.priority || (data.confidence < 50 ? "HIGH" : "MEDIUM");

    await fetch(`${APP_URL}/api/inbox/pending`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "sms_review",
        priority: priority.toLowerCase(),
        ...data,
      }),
    });

    console.log(
      `[Gianna SMS] Queued for ${priority} priority review: confidence=${data.confidence}%`,
    );
  } catch (error) {
    console.error("[Gianna SMS] Failed to queue for review:", error);
  }
}

/**
 * Log AI decision to database for compliance and debugging
 */
async function logAiDecision(data: {
  leadId: string;
  workerId: string;
  inboundMessage: string;
  intent?: string;
  confidence: number;
  generatedResponse: string;
  responseSent: boolean;
}): Promise<void> {
  if (!db) {
    console.warn("[Gianna SMS] Database not available for AI logging");
    return;
  }

  try {
    // Generate prompt hash for deduplication
    const promptHash = crypto
      .createHash("sha256")
      .update(data.inboundMessage + data.leadId)
      .digest("hex")
      .slice(0, 16);

    await db.insert(aiDecisionLogs).values({
      leadId: data.leadId,
      workerId: data.workerId,
      inboundMessage: data.inboundMessage,
      promptHash,
      intent: data.intent,
      confidence: data.confidence.toFixed(2),
      generatedResponse: data.generatedResponse,
      responseSent: data.responseSent,
    });

    console.log(
      `[Gianna SMS] AI decision logged: intent=${data.intent}, confidence=${data.confidence}%, sent=${data.responseSent}`,
    );
  } catch (error) {
    console.error("[Gianna SMS] Failed to log AI decision:", error);
    // Don't throw - logging failure shouldn't break the webhook
  }
}

function handleNextAction(
  action: {
    type: string;
    delayMinutes?: number;
    metadata?: Record<string, unknown>;
  },
  phone: string,
  context: Record<string, unknown>,
): void {
  if (action.type === "follow_up" && action.delayMinutes) {
    // Schedule follow-up
    fetch(`${APP_URL}/api/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "sms_follow_up",
        scheduledFor: new Date(
          Date.now() + action.delayMinutes * 60 * 1000,
        ).toISOString(),
        recipient: { phone },
        context,
      }),
    }).catch((err) =>
      console.error("[Gianna SMS] Follow-up scheduling failed:", err),
    );
  }

  if (action.type === "add_to_dnc") {
    addToDNCList(phone);
  }
}
