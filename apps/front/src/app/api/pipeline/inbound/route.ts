/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * INBOUND RESPONSE API - Capture & Classify Inbound Responses
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * POST /api/pipeline/inbound - Process inbound SMS response
 * GET  /api/pipeline/inbound - Get classification rules
 *
 * THE COMPOUNDING INBOUND ENGINE:
 * - Every response is classified
 * - Classifications trigger auto-tags and labels
 * - Captures (email, permission, booking) are extracted
 * - Worker routing: GIANNA → CATHY → SABRINA
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from "next/server";
import {
  Classification,
  getClassificationAction,
  detectCaptures,
  extractEmailFromMessage,
} from "@/lib/execution-flow";
import { Logger } from "@/lib/logger";

const log = new Logger("InboundAPI");

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Classification rules and capture mechanics
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET() {
  return NextResponse.json({
    success: true,
    name: "Inbound Response Engine",
    description: "Classify, capture, and route inbound responses",
    classifications: {
      POSITIVE: {
        description: "Interest expressed, ready to engage",
        examples: ["Sure, tell me more", "I'm interested", "Sounds good"],
        action: "Escalate to SABRINA - book meeting",
        label: "hot",
      },
      QUESTION: {
        description: "Has questions, needs answers",
        examples: ["How does it work?", "What's the price?", "Who is this?"],
        action: "GIANNA answers and re-engages",
        label: "warm",
      },
      NEUTRAL: {
        description: "Non-committal response",
        examples: ["Ok", "Thanks", "Got it"],
        action: "CATHY sends value touch",
        label: "warm",
      },
      OBJECTION: {
        description: "Has concerns or objections",
        examples: ["Too busy", "Not interested right now", "Maybe later"],
        action: "CATHY overcomes objection",
        label: "cold",
      },
      NEGATIVE: {
        description: "Clear rejection",
        examples: ["No thanks", "Don't contact me", "Not interested"],
        action: "Remove from active campaign",
        label: "dnc",
      },
      OPT_OUT: {
        description: "STOP or unsubscribe request",
        examples: ["STOP", "Unsubscribe", "Remove me"],
        action: "Immediate removal - compliance",
        label: "opted_out",
      },
      BOOKING_REQUEST: {
        description: "Wants to schedule a call",
        examples: ["Let's chat", "Can we talk?", "Send calendar link"],
        action: "SABRINA sends calendar link",
        label: "hot",
      },
    },
    captures: {
      email: {
        description: "Email address captured from response",
        pattern: "Standard email format detection",
        tag: "email_captured",
      },
      permission: {
        description: "Explicit permission to continue",
        patterns: ["yes", "sure", "ok", "sounds good", "interested"],
        tag: "permission_granted",
      },
      booking: {
        description: "Request to schedule meeting",
        patterns: ["book", "schedule", "calendar", "call", "when available"],
        tag: "booking_requested",
      },
    },
    workers: {
      GIANNA: "Opener - handles questions and initial engagement",
      CATHY: "Nurturer - handles objections and value touches",
      SABRINA: "Closer - handles bookings and conversions",
    },
    endpoint: "POST /api/pipeline/inbound { from: '+1...', message: '...' }",
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Process inbound response
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { from, message, leadId, pipelineId } = body;

    if (!from || !message) {
      return NextResponse.json(
        { error: "from and message required" },
        { status: 400 }
      );
    }

    log.info("Processing inbound response", { from, messageLength: message.length });

    // Step 1: Classify the response
    const classification = await classifyMessage(message);
    const action = getClassificationAction(classification);

    // Step 2: Detect captures
    const captureTypes = detectCaptures(message);
    const captures: { type: string; value: string }[] = [];

    if (captureTypes.includes("email")) {
      const email = extractEmailFromMessage(message);
      if (email) {
        captures.push({ type: "email", value: email });
      }
    }

    if (captureTypes.includes("permission")) {
      captures.push({ type: "permission", value: "granted" });
    }

    if (captureTypes.includes("booking")) {
      captures.push({ type: "booking", value: "requested" });
    }

    // Step 3: Determine next action
    const result = {
      success: true,
      from,
      message,
      classification: {
        type: classification,
        confidence: action.confidence,
        label: action.label,
      },
      captures,
      autoTags: action.autoTags,
      routing: {
        worker: action.worker,
        action: action.nextAction,
      },
      suggestedReply: getSuggestedReply(classification, captures),
    };

    log.info("Response classified", {
      from,
      classification,
      captures: captures.length,
      worker: action.worker,
    });

    return NextResponse.json(result);
  } catch (error) {
    log.error("Inbound processing error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Processing failed" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSIFICATION LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

async function classifyMessage(message: string): Promise<Classification> {
  const lower = message.toLowerCase().trim();

  // OPT_OUT - highest priority (compliance)
  if (/\b(stop|unsubscribe|remove|opt.?out)\b/i.test(lower)) {
    return "OPT_OUT";
  }

  // BOOKING_REQUEST
  if (/\b(book|schedule|calendar|call|chat|talk|meet|when.*available|what time)\b/i.test(lower)) {
    return "BOOKING_REQUEST";
  }

  // POSITIVE
  if (/\b(yes|sure|okay|ok|interested|sounds good|tell me more|let's|love to)\b/i.test(lower)) {
    return "POSITIVE";
  }

  // NEGATIVE
  if (/\b(no|not interested|don't|stop|leave me|spam|scam|fake)\b/i.test(lower)) {
    return "NEGATIVE";
  }

  // OBJECTION
  if (/\b(busy|later|maybe|not now|don't need|already have|too expensive)\b/i.test(lower)) {
    return "OBJECTION";
  }

  // QUESTION
  if (/\?$/.test(lower) || /\b(what|how|who|when|where|why|which|can you|could you|is this)\b/i.test(lower)) {
    return "QUESTION";
  }

  // Default to NEUTRAL
  return "NEUTRAL";
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUGGESTED REPLIES
// ═══════════════════════════════════════════════════════════════════════════════

function getSuggestedReply(
  classification: Classification,
  captures: { type: string; value: string }[]
): string {
  const hasBookingRequest = captures.some((c) => c.type === "booking");

  switch (classification) {
    case "POSITIVE":
    case "BOOKING_REQUEST":
      return "Great! Here's my calendar for a quick 15-min call: {CALENDLY_LINK}. What works best for you?";

    case "QUESTION":
      return "Great question! [Answer their specific question]. Would a quick 15-min call help clarify? Here's my calendar: {CALENDLY_LINK}";

    case "NEUTRAL":
      return "Thanks for the response! Let me know if you'd like to learn more about how we're helping businesses like yours save 20+ hrs/week.";

    case "OBJECTION":
      return "Totally understand - timing is everything. When would be a better time to reconnect? Happy to circle back when it makes sense.";

    case "NEGATIVE":
      return ""; // No reply - remove from campaign

    case "OPT_OUT":
      return "You've been removed from our list. We respect your privacy.";

    default:
      return "";
  }
}
