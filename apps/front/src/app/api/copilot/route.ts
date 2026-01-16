/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AI COPILOT API - Central Processing Hub
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * POST /api/copilot - Process inbound message through AI Copilot
 * GET /api/copilot - Get copilot status and analytics
 *
 * The AI Copilot:
 * - Classifies inbound SMS (POSITIVE, NEGATIVE, QUESTION, etc.)
 * - Assigns priority (HOT, WARM, COLD)
 * - Generates auto-responses
 * - Routes HOT leads to call queue
 * - Updates lead stage in THE LOOP
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from "next/server";
import {
  processCopilotDecision,
  createHotCallQueueItem,
  type Lead,
} from "@/lib/ai/copilot-engine";
import { checkOpenAIHealth } from "@/lib/ai/openai-client";
import { sendSMS } from "@/lib/signalhouse/client";
import {
  calculateResponseDelay,
  shouldAutoRespond,
} from "@/lib/ai/cadence-engine";
import { db } from "@/lib/db";
import { leads, smsMessages } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

// Phone numbers
const GIANNA_NUMBER =
  process.env.GIANNA_PHONE_NUMBER ||
  process.env.SIGNALHOUSE_FROM_NUMBER ||
  "+15164079249";

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Process inbound message through AI Copilot
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      leadId,
      message,
      from,
      to,
      context,
      autoReplyCount = 0,
    } = body as {
      leadId?: string;
      message: string;
      from: string;
      to?: string;
      context?: {
        previousMessages?: string[];
        campaignType?: string;
      };
      autoReplyCount?: number;
    };

    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 },
      );
    }

    // Get or create lead from phone number
    let lead: Lead;

    if (leadId) {
      // Fetch existing lead
      const existingLead = await db
        .select()
        .from(leads)
        .where(eq(leads.id, leadId))
        .limit(1);

      if (existingLead.length > 0) {
        const dbLead = existingLead[0];
        lead = {
          id: dbLead.id,
          firstName: dbLead.firstName || "Friend",
          lastName: dbLead.lastName || undefined,
          phone: from,
          email: dbLead.email || undefined,
          company: dbLead.company || undefined,
          stage: (dbLead.status as Lead["stage"]) || "inbound_response",
          source: dbLead.source || undefined,
          loopDay: 1,
          touchCount: 0,
        };
      } else {
        // Lead not found, create minimal lead
        lead = {
          id: `lead_${Date.now()}`,
          firstName: "Friend",
          phone: from,
          stage: "inbound_response",
          loopDay: 1,
          touchCount: 0,
        };
      }
    } else {
      // Try to find lead by phone number
      const existingByPhone = await db
        .select()
        .from(leads)
        .where(eq(leads.phone, from))
        .limit(1);

      if (existingByPhone.length > 0) {
        const dbLead = existingByPhone[0];
        lead = {
          id: dbLead.id,
          firstName: dbLead.firstName || "Friend",
          lastName: dbLead.lastName || undefined,
          phone: from,
          email: dbLead.email || undefined,
          company: dbLead.company || undefined,
          stage: (dbLead.status as Lead["stage"]) || "inbound_response",
          source: dbLead.source || undefined,
          loopDay: 1,
          touchCount: 0,
        };
      } else {
        // Unknown contact
        lead = {
          id: `lead_${Date.now()}`,
          firstName: "Friend",
          phone: from,
          stage: "inbound_response",
          loopDay: 1,
          touchCount: 0,
        };
      }
    }

    // Process through AI Copilot
    const decision = await processCopilotDecision(lead, message, context);

    // Check if we should auto-respond
    const autoRespondCheck = shouldAutoRespond(message, autoReplyCount);

    let sentResponse = false;
    let responseMessageId: string | undefined;

    // Handle the decision
    if (
      decision.action === "auto_respond" &&
      decision.response &&
      autoRespondCheck.should
    ) {
      // Add human-like delay
      const delay = calculateResponseDelay();

      // Send auto-response via SignalHouse
      setTimeout(async () => {
        const result = await sendSMS({
          from: to || GIANNA_NUMBER,
          to: from,
          message: decision.response!.message,
        });

        if (result.success) {
          // Log the response
          console.log(
            `[Copilot] Auto-responded to ${from}: ${decision.response!.message}`,
          );
        }
      }, delay);

      sentResponse = true;
    }

    // Route to call queue if needed
    let callQueueItem = null;
    if (decision.action === "route_to_call") {
      callQueueItem = createHotCallQueueItem(lead, decision);
      console.log(
        `[Copilot] HOT LEAD routed to call queue: ${lead.firstName} (${from})`,
      );
    }

    // Update lead in database if exists
    if (leadId) {
      await db
        .update(leads)
        .set({
          status: decision.nextStage,
          customFields: sql`
            jsonb_set(
              jsonb_set(
                jsonb_set(
                  jsonb_set(
                    COALESCE(custom_fields, '{}'::jsonb),
                    '{lastCopilotAction}',
                    ${JSON.stringify(decision.action)}::jsonb
                  ),
                  '{lastCopilotDecision}',
                  ${JSON.stringify(decision.reason)}::jsonb
                ),
                '{classification}',
                ${JSON.stringify(decision.classification.classification)}::jsonb
              ),
              '{priority}',
              ${JSON.stringify(decision.classification.priority)}::jsonb
            )
          `,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, leadId));
    }

    return NextResponse.json({
      success: true,
      decision: {
        action: decision.action,
        classification: decision.classification.classification,
        priority: decision.classification.priority,
        confidence: decision.classification.confidence,
        intent: decision.classification.intent,
        suggestedAction: decision.classification.suggestedAction,
        nextStage: decision.nextStage,
        assignedWorker: decision.assignedWorker,
        shouldNotify: decision.shouldNotify,
        reason: decision.reason,
      },
      response: decision.response
        ? {
            message: decision.response.message,
            charCount: decision.response.charCount,
            sent: sentResponse,
            delayed: sentResponse,
          }
        : null,
      callQueue: callQueueItem
        ? {
            id: callQueueItem.id,
            priority: callQueueItem.priority,
            reason: callQueueItem.reason,
          }
        : null,
      autoRespond: {
        enabled: autoRespondCheck.should,
        reason: autoRespondCheck.reason,
        replyCount: autoReplyCount,
      },
    });
  } catch (error) {
    console.error("[Copilot API] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Copilot processing failed",
      },
      { status: 500 },
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Copilot status and health check
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "status";

    if (action === "health") {
      // Check OpenAI health
      const openaiHealth = await checkOpenAIHealth();

      return NextResponse.json({
        success: true,
        health: {
          openai: openaiHealth,
          signalhouse: {
            configured: !!process.env.SIGNALHOUSE_API_KEY,
            fromNumber: GIANNA_NUMBER,
          },
          database: {
            configured: !!process.env.DATABASE_URL,
          },
        },
        workers: {
          GIANNA: { status: "active", role: "Opener" },
          CATHY: { status: "active", role: "Nurturer" },
          SABRINA: { status: "active", role: "Closer" },
          COPILOT: { status: "active", role: "Central Brain" },
        },
      });
    }

    // Default status
    return NextResponse.json({
      success: true,
      status: "operational",
      version: "1.0.0",
      capabilities: [
        "classify_messages",
        "generate_responses",
        "route_to_call_queue",
        "auto_respond",
        "cadence_management",
      ],
      theLoop: {
        lifecycleDays: 30,
        touchSchedule: [1, 3, 5, 7, 10, 14, 21, 28, 30],
        goal: "15_MIN_INTENT_MEETING",
      },
    });
  } catch (error) {
    console.error("[Copilot API] GET Error:", error);
    return NextResponse.json(
      { error: "Failed to get copilot status" },
      { status: 500 },
    );
  }
}
