/**
 * SABRINA OBJECTION API - Objection Handling
 *
 * Implements SABRINA's Agree-Overcome-Close strategy:
 * 1. AGREE: Validate their concern
 * 2. OVERCOME: Reframe gently
 * 3. CLOSE: Offer specific times
 *
 * Handles first 3 rebuttals before backing off.
 * Most people say yes by rebuttal 2.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, smsMessages, campaignAttempts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { signalHouseService } from "@/lib/services/signalhouse-service";
import { SABRINA } from "@/lib/ai-workers/digital-workers";

// Common objection types
type ObjectionType =
  | "too_busy"
  | "not_interested"
  | "need_to_think"
  | "bad_timing"
  | "already_have"
  | "too_expensive"
  | "spouse_decision"
  | "unknown";

// Objection response templates using Agree-Overcome-Close
const OBJECTION_RESPONSES: Record<
  ObjectionType,
  {
    agree: string;
    overcome: string;
    close: string;
    maxRebuttals: number;
  }[]
> = {
  too_busy: [
    {
      agree: "Totally get it, your time is valuable.",
      overcome: "What if we did just 10 mins? I'll make it worth it.",
      close: "Would 7am before your day gets crazy work, or is 8pm easier?",
      maxRebuttals: 3,
    },
    {
      agree: "I hear you — everyone's calendar is packed these days.",
      overcome: "That's exactly why I keep these calls short and focused.",
      close:
        "How about a quick call Thursday or Friday? I'll work around your schedule.",
      maxRebuttals: 3,
    },
  ],
  not_interested: [
    {
      agree: "No pressure at all, I respect that.",
      overcome:
        "Curious though — what would need to change for it to make sense?",
      close: "Even just 5 mins to share what I'm seeing in your area?",
      maxRebuttals: 2,
    },
    {
      agree: "Totally fair.",
      overcome:
        "Most folks I talk to felt the same way... until they saw the numbers.",
      close:
        "10 mins, no commitment. If it's not relevant, you've lost nothing. Worth a shot?",
      maxRebuttals: 2,
    },
  ],
  need_to_think: [
    {
      agree: "Makes sense — big decisions deserve thought.",
      overcome: "What questions can I answer now to help you decide?",
      close:
        "Or we could chat through it together? Sometimes talking helps clarify.",
      maxRebuttals: 3,
    },
    {
      agree: "Absolutely, take your time.",
      overcome:
        "While you're thinking, let me share one thing that might help...",
      close: "Quick call this week to walk through the details?",
      maxRebuttals: 3,
    },
  ],
  bad_timing: [
    {
      agree: "I get it — timing is everything.",
      overcome:
        "When would be better timing? I'll set a reminder to reach out.",
      close: "Should I check back in a month, or after the holidays?",
      maxRebuttals: 2,
    },
    {
      agree: "Totally understand, there's always a lot going on.",
      overcome:
        "The thing is, market conditions keep changing. Better to know your options now.",
      close: "Even a quick 15-min call to get the lay of the land?",
      maxRebuttals: 2,
    },
  ],
  already_have: [
    {
      agree: "Great that you're already working with someone!",
      overcome: "Just curious — are they showing you all your options?",
      close:
        "No harm in a second opinion. 10 mins, and I'll show you what else is out there.",
      maxRebuttals: 2,
    },
  ],
  too_expensive: [
    {
      agree: "I hear you, cost matters.",
      overcome:
        "Here's the thing — this call is free, and it might save you money.",
      close: "Let's at least look at the numbers together. What's a good time?",
      maxRebuttals: 3,
    },
  ],
  spouse_decision: [
    {
      agree: "Totally understand — important to be on the same page.",
      overcome: "Would it help if we all hopped on together?",
      close: "I can do evenings or weekends too. When works for both of you?",
      maxRebuttals: 2,
    },
  ],
  unknown: [
    {
      agree: "I appreciate you being upfront.",
      overcome: "Mind if I ask — what's the hesitation?",
      close:
        "Maybe a quick chat would clear things up. No pressure, just perspective.",
      maxRebuttals: 2,
    },
  ],
};

// Keywords to detect objection type
const OBJECTION_KEYWORDS: Record<ObjectionType, string[]> = {
  too_busy: [
    "busy",
    "no time",
    "swamped",
    "hectic",
    "crazy schedule",
    "tied up",
  ],
  not_interested: [
    "not interested",
    "no thanks",
    "don't want",
    "pass",
    "no need",
  ],
  need_to_think: [
    "think about",
    "consider",
    "decide",
    "talk it over",
    "sleep on it",
  ],
  bad_timing: [
    "bad time",
    "not now",
    "later",
    "wrong time",
    "not a good time",
    "after",
  ],
  already_have: ["already have", "working with", "got someone", "have one"],
  too_expensive: ["expensive", "cost", "afford", "money", "budget", "price"],
  spouse_decision: [
    "spouse",
    "wife",
    "husband",
    "partner",
    "together",
    "both of us",
  ],
  unknown: [],
};

function detectObjectionType(message: string): ObjectionType {
  const lowerMessage = message.toLowerCase();

  for (const [type, keywords] of Object.entries(OBJECTION_KEYWORDS)) {
    if (type === "unknown") continue;
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword)) {
        return type as ObjectionType;
      }
    }
  }

  return "unknown";
}

interface ObjectionRequest {
  leadId: string;
  objectionMessage: string; // The objection they gave
  objectionType?: ObjectionType; // Override auto-detection
  rebuttalNumber?: number; // Which rebuttal attempt (1-3)
  send?: boolean; // Actually send the response
}

// POST - Handle objection and generate response
export async function POST(request: NextRequest) {
  try {
    const body: ObjectionRequest = await request.json();
    const {
      leadId,
      objectionMessage,
      objectionType: forcedType,
      rebuttalNumber = 1,
      send = false,
    } = body;

    if (!leadId || !objectionMessage) {
      return NextResponse.json(
        { success: false, error: "leadId and objectionMessage required" },
        { status: 400 },
      );
    }

    // Get lead
    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (!lead) {
      return NextResponse.json(
        { success: false, error: "Lead not found" },
        { status: 404 },
      );
    }

    // Detect objection type
    const objectionType = forcedType || detectObjectionType(objectionMessage);
    const responses = OBJECTION_RESPONSES[objectionType];

    // Get response template (rotate through available ones)
    const templateIndex = (rebuttalNumber - 1) % responses.length;
    const template = responses[templateIndex];

    // Check if we should back off
    if (rebuttalNumber > template.maxRebuttals) {
      return NextResponse.json({
        success: true,
        backOff: true,
        message: "Maximum rebuttals reached. Recommend backing off.",
        objectionType,
        rebuttalNumber,
        maxRebuttals: template.maxRebuttals,
        suggestion: "Schedule a follow-up with CATHY in 7 days",
      });
    }

    // Build response message
    let message = `${template.agree} ${template.overcome} ${template.close}`;
    message = message.replace(/\{\{first_name\}\}/g, lead.firstName || "there");

    // If not sending, return preview
    if (!send) {
      return NextResponse.json({
        success: true,
        preview: true,
        objectionType,
        rebuttalNumber,
        maxRebuttals: template.maxRebuttals,
        response: {
          agree: template.agree,
          overcome: template.overcome,
          close: template.close,
          full: message,
        },
        lead: {
          id: lead.id,
          firstName: lead.firstName,
          phone: lead.phone,
        },
        worker: "sabrina",
      });
    }

    // Send the response
    if (!lead.phone) {
      return NextResponse.json(
        { success: false, error: "Lead has no phone number" },
        { status: 400 },
      );
    }

    let smsResult;
    try {
      smsResult = await signalHouseService.sendSMS({
        to: lead.phone,
        message,
        tags: [
          "sabrina",
          "objection",
          objectionType,
          `rebuttal_${rebuttalNumber}`,
        ],
      });
    } catch (smsError) {
      console.error("[Sabrina Objection] SMS error:", smsError);
      return NextResponse.json(
        { success: false, error: "Failed to send SMS" },
        { status: 500 },
      );
    }

    // Log to database
    const messageId = crypto.randomUUID();
    try {
      await db.insert(smsMessages).values({
        id: messageId,
        leadId,
        direction: "outbound",
        fromNumber: process.env.SIGNALHOUSE_PHONE_NUMBER || "",
        toNumber: lead.phone,
        body: message,
        status: "sent",
        sentAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Record objection handling attempt
      await db.insert(campaignAttempts).values({
        id: crypto.randomUUID(),
        leadId,
        campaignContext: "objection_handling",
        attemptNumber: rebuttalNumber,
        channel: "sms",
        agent: "sabrina",
        status: "sent",
        messageContent: message,
        responseReceived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db
        .update(leads)
        .set({
          lastContactDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(leads.id, leadId));
    } catch (dbError) {
      console.log("[Sabrina Objection] DB logging error (non-fatal):", dbError);
    }

    console.log(
      `[Sabrina Objection] Handled "${objectionType}" (rebuttal ${rebuttalNumber}) for ${lead.firstName}`,
    );

    return NextResponse.json({
      success: true,
      sent: true,
      messageId,
      signalHouseId: smsResult?.messageId,
      objectionType,
      rebuttalNumber,
      maxRebuttals: template.maxRebuttals,
      response: {
        agree: template.agree,
        overcome: template.overcome,
        close: template.close,
        full: message,
      },
      lead: {
        id: lead.id,
        firstName: lead.firstName,
        phone: lead.phone,
      },
      worker: "sabrina",
    });
  } catch (error) {
    console.error("[Sabrina Objection] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Objection handling failed",
      },
      { status: 500 },
    );
  }
}

// GET - Get objection types and templates
export async function GET() {
  const objectionInfo = Object.entries(OBJECTION_RESPONSES).map(
    ([type, templates]) => ({
      type,
      keywords: OBJECTION_KEYWORDS[type as ObjectionType],
      maxRebuttals: templates[0].maxRebuttals,
      templateCount: templates.length,
    }),
  );

  return NextResponse.json({
    success: true,
    worker: {
      id: SABRINA.id,
      name: SABRINA.name,
      role: SABRINA.role,
      tagline: SABRINA.tagline,
    },
    strategy: {
      name: "Agree-Overcome-Close",
      steps: [
        "AGREE: Validate their concern",
        "OVERCOME: Reframe gently",
        "CLOSE: Offer specific times",
      ],
      maxRebuttals: "Handle first 3 rebuttals before backing off",
    },
    objectionTypes: objectionInfo,
    signaturePhrases: SABRINA.linguistic.signaturePhrases,
  });
}
