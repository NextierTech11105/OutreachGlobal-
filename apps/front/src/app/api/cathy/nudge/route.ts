/**
 * CATHY NUDGE API - The Nudger
 *
 * Generates and sends follow-up nudge messages with humor:
 * - POST: Generate nudge message and optionally send via ExecutionRouter
 * - GET: Get nudge templates from CARTRIDGE_LIBRARY
 *
 * CATHY uses Leslie Nielsen / Henny Youngman style humor to re-engage leads.
 * Humor temperature increases with attempt number:
 * - Attempt 1-2: Mild (light, safe jokes)
 * - Attempt 3-4: Medium (more playful, wittier)
 * - Attempt 5+: Spicy (absurdist, go for broke)
 *
 * ENFORCEMENT: All sends go through ExecutionRouter with templateId.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, smsMessages, campaignAttempts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { executeSMS, isRouterConfigured, previewSMS } from "@/lib/sms/ExecutionRouter";
import { CATHY } from "@/lib/ai-workers/digital-workers";
import { CATHY_NUDGE_CARTRIDGE } from "@/lib/sms/template-cartridges";

// Humor temperature levels
type HumorLevel = "mild" | "medium" | "spicy";

function getHumorLevel(attemptNumber: number): HumorLevel {
  if (attemptNumber <= 2) return "mild";
  if (attemptNumber <= 4) return "medium";
  return "spicy";
}

// Map humor level to template prefix for lookup
const HUMOR_TEMPLATE_PREFIX: Record<HumorLevel, string> = {
  mild: "cathy-nudge-mild",
  medium: "cathy-nudge-med",
  spicy: "cathy-nudge-spicy",
};

// Get template IDs by humor level from the cartridge
function getTemplatesByLevel(level: HumorLevel): string[] {
  const prefix = HUMOR_TEMPLATE_PREFIX[level];
  return CATHY_NUDGE_CARTRIDGE.templates
    .filter((t) => t.id.startsWith(prefix))
    .map((t) => t.id);
}

interface NudgeRequest {
  leadId: string;
  attemptNumber?: number;
  templateId?: string; // CANONICAL: Use templateId from CARTRIDGE_LIBRARY
  send?: boolean;
  context?: string;
  teamId?: string;
  trainingMode?: boolean;
}

// POST - Generate and optionally send nudge via ExecutionRouter
export async function POST(request: NextRequest) {
  try {
    const body: NudgeRequest = await request.json();
    const {
      leadId,
      attemptNumber,
      templateId,
      send = false,
      context,
      teamId,
      trainingMode,
    } = body;

    if (!leadId) {
      return NextResponse.json(
        { success: false, error: "leadId is required" },
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

    // Calculate attempt number if not provided
    let currentAttempt = attemptNumber || 1;
    if (!attemptNumber) {
      const existingAttempts = await db
        .select()
        .from(campaignAttempts)
        .where(eq(campaignAttempts.leadId, leadId));
      currentAttempt = existingAttempts.length + 1;
    }

    // Get humor level and available templates
    const humorLevel = getHumorLevel(currentAttempt);
    const availableTemplates = getTemplatesByLevel(humorLevel);

    // Determine which template to use
    let effectiveTemplateId = templateId;
    if (!effectiveTemplateId) {
      // If context provided, try to find matching template
      if (context) {
        const contextMatch = CATHY_NUDGE_CARTRIDGE.templates.find(
          (t) => t.id.startsWith(HUMOR_TEMPLATE_PREFIX[humorLevel]) &&
                 t.tags?.includes(context)
        );
        if (contextMatch) {
          effectiveTemplateId = contextMatch.id;
        }
      }

      // Random selection from humor level if no specific match
      if (!effectiveTemplateId && availableTemplates.length > 0) {
        effectiveTemplateId = availableTemplates[
          Math.floor(Math.random() * availableTemplates.length)
        ];
      }
    }

    if (!effectiveTemplateId) {
      return NextResponse.json(
        { success: false, error: "No template available for this context" },
        { status: 400 },
      );
    }

    // Build variables for template
    const variables: Record<string, string> = {
      firstName: lead.firstName || "there",
      first_name: lead.firstName || "there",
      lastName: lead.lastName || "",
    };

    // If not sending, return preview
    if (!send) {
      const preview = previewSMS(effectiveTemplateId, variables);

      return NextResponse.json({
        success: true,
        preview: true,
        message: preview.message,
        templateId: effectiveTemplateId,
        templateName: preview.templateName,
        lead: {
          id: lead.id,
          firstName: lead.firstName,
          phone: lead.phone,
        },
        worker: "cathy",
        humorLevel,
        attemptNumber: currentAttempt,
      });
    }

    // SEND via ExecutionRouter
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
      worker: "CATHY",
      trainingMode,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to send SMS" },
        { status: 500 },
      );
    }

    // Record in database
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

      // Record campaign attempt
      await db.insert(campaignAttempts).values({
        id: crypto.randomUUID(),
        leadId,
        campaignContext: "follow_up",
        attemptNumber: currentAttempt,
        channel: "sms",
        agent: "cathy",
        status: "sent",
        messageContent: result.renderedMessage,
        responseReceived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Update lead
      await db
        .update(leads)
        .set({
          lastContactDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(leads.id, leadId));
    } catch (dbError) {
      console.log("[Cathy Nudge] DB logging error (non-fatal):", dbError);
    }

    console.log(
      `[Cathy Nudge] Sent ${humorLevel} nudge (attempt ${currentAttempt}) to ${lead.phone} via ${result.provider}`,
    );

    return NextResponse.json({
      success: true,
      sent: true,
      messageId,
      templateId: effectiveTemplateId,
      templateName: result.templateName,
      provider: result.provider,
      trainingMode: result.trainingMode,
      lead: {
        id: lead.id,
        firstName: lead.firstName,
        phone: lead.phone,
      },
      worker: "cathy",
      humorLevel,
      attemptNumber: currentAttempt,
    });
  } catch (error) {
    console.error("[Cathy Nudge] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Nudge failed",
      },
      { status: 500 },
    );
  }
}

// GET - Get templates from CARTRIDGE_LIBRARY
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const level = searchParams.get("level") as HumorLevel | null;

  // Get templates from the cartridge
  const allTemplates = CATHY_NUDGE_CARTRIDGE.templates;

  const templatesByLevel: Record<HumorLevel, typeof allTemplates> = {
    mild: allTemplates.filter((t) => t.tags?.includes("mild")),
    medium: allTemplates.filter((t) => t.tags?.includes("medium")),
    spicy: allTemplates.filter((t) => t.tags?.includes("spicy")),
  };

  const templates = level
    ? { [level]: templatesByLevel[level] }
    : templatesByLevel;

  return NextResponse.json({
    success: true,
    worker: {
      id: CATHY.id,
      name: CATHY.name,
      role: CATHY.role,
      tagline: CATHY.tagline,
    },
    humorLevels: {
      mild: "Attempts 1-2: Light, safe jokes",
      medium: "Attempts 3-4: More playful, wittier",
      spicy: "Attempts 5+: Absurdist, go for broke",
    },
    templates,
    cartridge: {
      id: CATHY_NUDGE_CARTRIDGE.id,
      name: CATHY_NUDGE_CARTRIDGE.name,
      templateCount: CATHY_NUDGE_CARTRIDGE.templates.length,
    },
    signaturePhrases: CATHY.linguistic.signaturePhrases,
  });
}
