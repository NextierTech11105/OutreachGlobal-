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
 *
 * ENFORCEMENT: All sends go through ExecutionRouter with templateId.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, smsMessages, campaignAttempts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { executeSMS, isRouterConfigured, previewSMS } from "@/lib/sms/ExecutionRouter";
import { SABRINA } from "@/lib/ai-workers/digital-workers";
import { SABRINA_OBJECTION_CARTRIDGE } from "@/lib/sms/template-cartridges";

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

// Map objection type to template ID prefix
const OBJECTION_TEMPLATE_MAP: Record<ObjectionType, string> = {
  too_busy: "sabrina-obj-busy",
  not_interested: "sabrina-obj-interest",
  need_to_think: "sabrina-obj-think",
  bad_timing: "sabrina-obj-timing",
  already_have: "sabrina-obj-have",
  too_expensive: "sabrina-obj-cost",
  spouse_decision: "sabrina-obj-spouse",
  unknown: "sabrina-obj-unknown",
};

// Max rebuttals per objection type
const MAX_REBUTTALS: Record<ObjectionType, number> = {
  too_busy: 3,
  not_interested: 2,
  need_to_think: 3,
  bad_timing: 2,
  already_have: 2,
  too_expensive: 3,
  spouse_decision: 2,
  unknown: 2,
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

// Get template IDs for an objection type
function getTemplatesForObjection(objectionType: ObjectionType): string[] {
  const prefix = OBJECTION_TEMPLATE_MAP[objectionType];
  return SABRINA_OBJECTION_CARTRIDGE.templates
    .filter((t) => t.id.startsWith(prefix))
    .map((t) => t.id);
}

interface ObjectionRequest {
  leadId: string;
  objectionMessage: string;
  objectionType?: ObjectionType;
  rebuttalNumber?: number;
  templateId?: string; // CANONICAL: Use templateId from CARTRIDGE_LIBRARY
  send?: boolean;
  teamId?: string;
  trainingMode?: boolean;
}

// POST - Handle objection and generate response via ExecutionRouter
export async function POST(request: NextRequest) {
  try {
    const body: ObjectionRequest = await request.json();
    const {
      leadId,
      objectionMessage,
      objectionType: forcedType,
      rebuttalNumber = 1,
      templateId,
      send = false,
      teamId,
      trainingMode,
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
    const maxRebuttals = MAX_REBUTTALS[objectionType];

    // Check if we should back off
    if (rebuttalNumber > maxRebuttals) {
      return NextResponse.json({
        success: true,
        backOff: true,
        message: "Maximum rebuttals reached. Recommend backing off.",
        objectionType,
        rebuttalNumber,
        maxRebuttals,
        suggestion: "Schedule a follow-up with CATHY in 7 days",
      });
    }

    // Determine which template to use
    const availableTemplates = getTemplatesForObjection(objectionType);
    let effectiveTemplateId = templateId;

    if (!effectiveTemplateId && availableTemplates.length > 0) {
      // Rotate through available templates based on rebuttal number
      const templateIndex = (rebuttalNumber - 1) % availableTemplates.length;
      effectiveTemplateId = availableTemplates[templateIndex];
    }

    if (!effectiveTemplateId) {
      return NextResponse.json(
        { success: false, error: "No template available for this objection type" },
        { status: 400 },
      );
    }

    // Build variables
    const variables: Record<string, string> = {
      firstName: lead.firstName || "there",
      first_name: lead.firstName || "there",
    };

    // If not sending, return preview
    if (!send) {
      const preview = previewSMS(effectiveTemplateId, variables);

      return NextResponse.json({
        success: true,
        preview: true,
        objectionType,
        rebuttalNumber,
        maxRebuttals,
        templateId: effectiveTemplateId,
        templateName: preview.templateName,
        message: preview.message,
        lead: {
          id: lead.id,
          firstName: lead.firstName,
          phone: lead.phone,
        },
        worker: "sabrina",
      });
    }

    // SEND the response
    if (!lead.phone) {
      return NextResponse.json(
        { success: false, error: "Lead has no phone number" },
        { status: 400 },
      );
    }

    // Check router configuration
    const routerStatus = isRouterConfigured();
    if (!routerStatus.configured) {
      return NextResponse.json(
        { success: false, error: "SMS provider not configured" },
        { status: 503 },
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CANONICAL: Route through ExecutionRouter
    // ═══════════════════════════════════════════════════════════════════════
    const result = await executeSMS({
      templateId: effectiveTemplateId,
      to: lead.phone,
      variables,
      leadId,
      teamId,
      worker: "SABRINA",
      trainingMode,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to send SMS" },
        { status: 500 },
      );
    }

    // Log to database
    const messageId = result.messageId || crypto.randomUUID();
    try {
      await db.insert(smsMessages).values({
        id: messageId,
        leadId,
        direction: "outbound",
        fromNumber: result.sentFrom,
        toNumber: lead.phone,
        body: result.renderedMessage,
        status: result.trainingMode ? "training" : "sent",
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
        messageContent: result.renderedMessage,
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
      `[Sabrina Objection] Handled "${objectionType}" (rebuttal ${rebuttalNumber}) for ${lead.firstName} via ${result.provider}`,
    );

    return NextResponse.json({
      success: true,
      sent: true,
      messageId,
      objectionType,
      rebuttalNumber,
      maxRebuttals,
      templateId: effectiveTemplateId,
      templateName: result.templateName,
      provider: result.provider,
      trainingMode: result.trainingMode,
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

// GET - Get objection types and templates from CARTRIDGE_LIBRARY
export async function GET() {
  const objectionInfo = Object.entries(OBJECTION_TEMPLATE_MAP).map(
    ([type, prefix]) => {
      const templates = SABRINA_OBJECTION_CARTRIDGE.templates.filter((t) =>
        t.id.startsWith(prefix)
      );
      return {
        type,
        keywords: OBJECTION_KEYWORDS[type as ObjectionType],
        maxRebuttals: MAX_REBUTTALS[type as ObjectionType],
        templateCount: templates.length,
        templateIds: templates.map((t) => t.id),
      };
    }
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
    cartridge: {
      id: SABRINA_OBJECTION_CARTRIDGE.id,
      name: SABRINA_OBJECTION_CARTRIDGE.name,
      templateCount: SABRINA_OBJECTION_CARTRIDGE.templates.length,
    },
    signaturePhrases: SABRINA.linguistic.signaturePhrases,
  });
}
