/**
 * CATHY NUDGE API - The Nudger
 *
 * Generates and sends follow-up nudge messages with humor:
 * - POST: Generate nudge message and optionally send
 * - GET: Get nudge templates and humor levels
 *
 * CATHY uses Leslie Nielsen / Henny Youngman style humor to re-engage leads.
 * Humor temperature increases with attempt number:
 * - Attempt 1-2: Mild (light, safe jokes)
 * - Attempt 3-4: Medium (more playful, wittier)
 * - Attempt 5+: Spicy (absurdist, go for broke)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, smsMessages, campaignAttempts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { signalHouseService } from "@/lib/services/signalhouse-service";
import { CATHY } from "@/lib/ai-workers/digital-workers";

// Humor temperature levels
type HumorLevel = "mild" | "medium" | "spicy";

function getHumorLevel(attemptNumber: number): HumorLevel {
  if (attemptNumber <= 2) return "mild";
  if (attemptNumber <= 4) return "medium";
  return "spicy";
}

// Pre-defined nudge templates by humor level
const NUDGE_TEMPLATES = {
  mild: [
    {
      id: "mild_1",
      content:
        "Hey {{first_name}}, just checking in! Did my last message get lost in the void? 😅",
      context: "first_followup",
    },
    {
      id: "mild_2",
      content:
        "{{first_name}} — hope you're having a good week! Still interested in chatting about your property?",
      context: "general",
    },
    {
      id: "mild_3",
      content:
        "Quick follow-up {{first_name}} — I know inboxes get crazy. Worth a chat?",
      context: "general",
    },
  ],
  medium: [
    {
      id: "med_1",
      content:
        "{{first_name}}... still there? I promise I'm more interesting than my messages make me seem 😂",
      context: "ghosted",
    },
    {
      id: "med_2",
      content:
        "{{first_name}} — at this point I should probably send flowers. Or pizza. Pizza usually works.",
      context: "ghosted",
    },
    {
      id: "med_3",
      content:
        "I've had better luck reaching my mother-in-law, {{first_name}}. And she ignores me on purpose!",
      context: "ghosted",
    },
    {
      id: "med_4",
      content:
        "Third time's the charm, right? That's what I told my third husband. {{first_name}}, got 5 mins?",
      context: "third_attempt",
    },
  ],
  spicy: [
    {
      id: "spicy_1",
      content:
        "{{first_name}}, either you're really busy or I'm really boring. Hoping it's the first one! 😅 Last shot — worth a quick call?",
      context: "final_attempt",
    },
    {
      id: "spicy_2",
      content:
        "{{first_name}} — if you don't respond, I'll assume you've been abducted by aliens. Blink twice if you need help... or just text back?",
      context: "ghosted",
    },
    {
      id: "spicy_3",
      content:
        "Not gonna lie {{first_name}}, I'm running out of clever things to say. At least I'm not selling extended warranties. 10 mins?",
      context: "final_attempt",
    },
    {
      id: "spicy_4",
      content:
        "{{first_name}}, I've now texted you more than I text my kids. They're jealous. Can we at least have a quick chat so I feel productive?",
      context: "persistent",
    },
  ],
};

interface NudgeRequest {
  leadId: string;
  attemptNumber?: number; // Auto-calculates if not provided
  templateId?: string; // Use specific template
  customMessage?: string; // Override with custom message
  send?: boolean; // Actually send the message (default: false = preview only)
  context?: string; // Additional context for template selection
}

// POST - Generate and optionally send nudge
export async function POST(request: NextRequest) {
  try {
    const body: NudgeRequest = await request.json();
    const {
      leadId,
      attemptNumber,
      templateId,
      customMessage,
      send = false,
      context,
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

    // Get humor level
    const humorLevel = getHumorLevel(currentAttempt);
    const templates = NUDGE_TEMPLATES[humorLevel];

    // Select template
    let message = customMessage;
    let usedTemplateId = templateId || null;

    if (!message) {
      // Find matching template
      let template;
      if (templateId) {
        template = templates.find((t) => t.id === templateId);
      }
      if (!template && context) {
        template = templates.find((t) => t.context === context);
      }
      if (!template) {
        // Random template from the level
        template = templates[Math.floor(Math.random() * templates.length)];
      }

      if (template) {
        message = template.content;
        usedTemplateId = template.id;
      }
    }

    if (!message) {
      return NextResponse.json(
        { success: false, error: "No template available for this context" },
        { status: 400 },
      );
    }

    // Personalize message
    message = message.replace(/\{\{first_name\}\}/g, lead.firstName || "there");
    message = message.replace(/\{\{last_name\}\}/g, lead.lastName || "");

    // If not sending, return preview
    if (!send) {
      return NextResponse.json({
        success: true,
        preview: true,
        message,
        lead: {
          id: lead.id,
          firstName: lead.firstName,
          phone: lead.phone,
        },
        worker: "cathy",
        humorLevel,
        attemptNumber: currentAttempt,
        templateId: usedTemplateId,
      });
    }

    // Send the message
    if (!lead.phone) {
      return NextResponse.json(
        { success: false, error: "Lead has no phone number" },
        { status: 400 },
      );
    }

    // Send via SignalHouse
    let smsResult;
    try {
      smsResult = await signalHouseService.sendSMS({
        to: lead.phone,
        message,
        tags: ["cathy", "nudge", `attempt_${currentAttempt}`, humorLevel],
      });
    } catch (smsError) {
      console.error("[Cathy Nudge] SMS send error:", smsError);
      return NextResponse.json(
        { success: false, error: "Failed to send SMS" },
        { status: 500 },
      );
    }

    // Record in database
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

      // Record campaign attempt
      await db.insert(campaignAttempts).values({
        id: crypto.randomUUID(),
        leadId,
        campaignContext: "follow_up",
        attemptNumber: currentAttempt,
        channel: "sms",
        agent: "cathy",
        status: "sent",
        messageContent: message,
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
      `[Cathy Nudge] Sent ${humorLevel} nudge (attempt ${currentAttempt}) to ${lead.phone}`,
    );

    return NextResponse.json({
      success: true,
      sent: true,
      messageId,
      signalHouseId: smsResult?.messageId,
      message,
      lead: {
        id: lead.id,
        firstName: lead.firstName,
        phone: lead.phone,
      },
      worker: "cathy",
      humorLevel,
      attemptNumber: currentAttempt,
      templateId: usedTemplateId,
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

// GET - Get templates and humor levels
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const level = searchParams.get("level") as HumorLevel | null;

  const templates = level
    ? { [level]: NUDGE_TEMPLATES[level] }
    : NUDGE_TEMPLATES;

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
    signaturePhrases: CATHY.linguistic.signaturePhrases,
  });
}
