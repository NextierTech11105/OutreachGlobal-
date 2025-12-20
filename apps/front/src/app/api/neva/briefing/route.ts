/**
 * NEVA BRIEFING API - Pre-Call Preparation
 *
 * Generates formatted briefings for appointments:
 * - POST: Generate briefing for a scheduled appointment
 * - GET: Get briefing templates and formats
 *
 * NEVA's output is always structured with emojis for quick scanning.
 * The briefing arms the team with exactly what they need to close.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, smsMessages, campaignAttempts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { NEVA } from "@/lib/ai-workers/digital-workers";

interface BriefingRequest {
  leadId: string;
  appointmentDate?: string;
  meetingType?: "call" | "video" | "in_person";
  focusAreas?: string[];
}

interface BriefingOutput {
  header: {
    leadName: string;
    appointmentDate: string;
    meetingType: string;
    preparedBy: string;
    preparedAt: string;
  };
  sections: {
    context: string;
    keyInsight: string;
    talkingPoints: string[];
    objectionPrep: Array<{ objection: string; response: string }>;
    conversationHistory: Array<{ date: string; summary: string; direction: "inbound" | "outbound" }>;
    nextSteps: string[];
  };
  quickGlance: string; // One-liner summary
  formatted: string; // Full formatted briefing text
}

// Format briefing into NEVA's structured style
function formatBriefing(briefing: BriefingOutput): string {
  const lines: string[] = [];

  lines.push("═══════════════════════════════════════════════════");
  lines.push(`📋 PRE-CALL BRIEFING: ${briefing.header.leadName.toUpperCase()}`);
  lines.push("═══════════════════════════════════════════════════");
  lines.push("");
  lines.push(`📅 ${briefing.header.appointmentDate} | ${briefing.header.meetingType}`);
  lines.push(`🤖 Prepared by NEVA at ${briefing.header.preparedAt}`);
  lines.push("");
  lines.push("───────────────────────────────────────────────────");
  lines.push("📍 CONTEXT");
  lines.push("───────────────────────────────────────────────────");
  lines.push(briefing.sections.context);
  lines.push("");
  lines.push("───────────────────────────────────────────────────");
  lines.push("💡 KEY INSIGHT");
  lines.push("───────────────────────────────────────────────────");
  lines.push(briefing.sections.keyInsight);
  lines.push("");
  lines.push("───────────────────────────────────────────────────");
  lines.push("🎯 TALKING POINTS");
  lines.push("───────────────────────────────────────────────────");
  for (const point of briefing.sections.talkingPoints) {
    lines.push(`• ${point}`);
  }
  lines.push("");
  lines.push("───────────────────────────────────────────────────");
  lines.push("⚠️ POTENTIAL OBJECTIONS");
  lines.push("───────────────────────────────────────────────────");
  for (const obj of briefing.sections.objectionPrep) {
    lines.push(`❓ ${obj.objection}`);
    lines.push(`   → ${obj.response}`);
    lines.push("");
  }

  if (briefing.sections.conversationHistory.length > 0) {
    lines.push("───────────────────────────────────────────────────");
    lines.push("💬 CONVERSATION HISTORY");
    lines.push("───────────────────────────────────────────────────");
    for (const msg of briefing.sections.conversationHistory) {
      const arrow = msg.direction === "inbound" ? "←" : "→";
      lines.push(`${arrow} [${msg.date}] ${msg.summary}`);
    }
    lines.push("");
  }

  lines.push("───────────────────────────────────────────────────");
  lines.push("📅 NEXT STEPS");
  lines.push("───────────────────────────────────────────────────");
  for (const step of briefing.sections.nextSteps) {
    lines.push(`□ ${step}`);
  }
  lines.push("");
  lines.push("═══════════════════════════════════════════════════");
  lines.push(`⚡ QUICK GLANCE: ${briefing.quickGlance}`);
  lines.push("═══════════════════════════════════════════════════");

  return lines.join("\n");
}

// POST - Generate briefing
export async function POST(request: NextRequest) {
  try {
    const body: BriefingRequest = await request.json();
    const {
      leadId,
      appointmentDate,
      meetingType = "call",
      focusAreas = [],
    } = body;

    if (!leadId) {
      return NextResponse.json(
        { success: false, error: "leadId required" },
        { status: 400 }
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
        { status: 404 }
      );
    }

    // Get conversation history
    let conversationHistory: Array<{ date: string; summary: string; direction: "inbound" | "outbound" }> = [];
    try {
      const messages = await db
        .select()
        .from(smsMessages)
        .where(eq(smsMessages.leadId, leadId))
        .orderBy(desc(smsMessages.createdAt))
        .limit(5);

      conversationHistory = messages.map((msg) => ({
        date: new Date(msg.createdAt).toLocaleDateString(),
        summary: (msg.body?.substring(0, 80) + (msg.body && msg.body.length > 80 ? "..." : "")) || "No content",
        direction: msg.direction as "inbound" | "outbound",
      }));
    } catch {
      // Table might not exist
    }

    // Get campaign attempts for context
    let attemptCount = 0;
    let lastAttemptContext = "";
    try {
      const attempts = await db
        .select()
        .from(campaignAttempts)
        .where(eq(campaignAttempts.leadId, leadId))
        .orderBy(desc(campaignAttempts.createdAt));

      attemptCount = attempts.length;
      if (attempts[0]) {
        lastAttemptContext = attempts[0].campaignContext || "unknown";
      }
    } catch {
      // Table might not exist
    }

    // Build context
    let context = "";
    if (lead.company) {
      context += `Business: ${lead.company}. `;
    }
    if (lead.address) {
      context += `Property: ${lead.address}. `;
    }
    if (lead.source) {
      context += `Source: ${lead.source}. `;
    }
    context += `Previous attempts: ${attemptCount}. `;
    if (lastAttemptContext) {
      context += `Last context: ${lastAttemptContext}.`;
    }

    if (!context.trim()) {
      context = "Limited context available. Use discovery questions to learn more.";
    }

    // Generate insight based on lead data
    let keyInsight = "Standard lead profile. Focus on building rapport and understanding their needs.";
    if (attemptCount > 3) {
      keyInsight = `Persistent engagement (${attemptCount} attempts) suggests genuine interest but possible hesitation. Address underlying concerns.`;
    } else if (lead.status === "appointment") {
      keyInsight = "Already committed to meeting - they're interested. Focus on value delivery, not more selling.";
    } else if (lead.email && lead.phone) {
      keyInsight = "Good contact info captured. Lead is engaged enough to share details. Ready for deeper conversation.";
    }

    // Build talking points
    const talkingPoints = [
      lead.firstName ? `Open with their name ("Hi ${lead.firstName}") - personal touch` : "Ask for their name to personalize",
      "Acknowledge their time is valuable - get to the point",
      lead.company ? `Reference their business (${lead.company}) to show you did research` : "Ask about their business/situation",
      "Ask open-ended questions: \"What's driving your interest?\"",
      "Listen for pain points - don't jump to solutions too fast",
    ];

    // Build objection prep
    const objectionPrep = [
      {
        objection: "\"What's this about again?\"",
        response: `I'm following up on our previous conversation. Wanted to share some ideas that might help with [reference their situation].`,
      },
      {
        objection: "\"I'm not sure this is for me\"",
        response: "Totally fair. Let me ask - what would make it more relevant? I might be able to tailor this to your actual needs.",
      },
      {
        objection: "\"I need to think about it\"",
        response: "Makes sense. What specifically would you want to think through? Maybe I can help clarify right now.",
      },
    ];

    // Build next steps
    const nextSteps = [
      "Confirm their current situation and goals",
      "Present 2-3 options (don't overwhelm)",
      "Ask which option resonates most",
      "Get commitment on next step (another call, docs to review, etc.)",
      "Set follow-up date before ending call",
    ];

    // Quick glance
    const quickGlance = `${lead.firstName || "Lead"} | ${lead.company || lead.address || "Unknown"} | ${attemptCount} touches | ${lead.status || "new"}`;

    // Format appointment date
    const formattedDate = appointmentDate
      ? new Date(appointmentDate).toLocaleString()
      : "Not scheduled";

    // Build briefing
    const briefing: BriefingOutput = {
      header: {
        leadName: `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || "Unknown",
        appointmentDate: formattedDate,
        meetingType: meetingType.charAt(0).toUpperCase() + meetingType.slice(1),
        preparedBy: "NEVA",
        preparedAt: new Date().toLocaleString(),
      },
      sections: {
        context,
        keyInsight,
        talkingPoints,
        objectionPrep,
        conversationHistory,
        nextSteps,
      },
      quickGlance,
      formatted: "", // Will be filled below
    };

    // Generate formatted version
    briefing.formatted = formatBriefing(briefing);

    console.log(`[Neva Briefing] Generated briefing for ${briefing.header.leadName}`);

    return NextResponse.json({
      success: true,
      briefing,
      lead: {
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        phone: lead.phone,
        email: lead.email,
        status: lead.status,
      },
      worker: "neva",
    });
  } catch (error) {
    console.error("[Neva Briefing] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Briefing failed",
      },
      { status: 500 }
    );
  }
}

// GET - Get briefing info and template
export async function GET() {
  const exampleBriefing = `
═══════════════════════════════════════════════════
📋 PRE-CALL BRIEFING: JOHN SMITH
═══════════════════════════════════════════════════

📅 Tuesday, Jan 14 at 2:00 PM | Call
🤖 Prepared by NEVA at 1:45 PM

───────────────────────────────────────────────────
📍 CONTEXT
───────────────────────────────────────────────────
Business: Smith & Sons Plumbing. Property: 123 Main St.
Previous attempts: 3. Last context: follow_up.

───────────────────────────────────────────────────
💡 KEY INSIGHT
───────────────────────────────────────────────────
Long-term business owner (20+ years). Likely thinking
about succession or exit strategy.

───────────────────────────────────────────────────
🎯 TALKING POINTS
───────────────────────────────────────────────────
• Open with "Hi John" - he responded to personal approach
• Reference their business longevity - show respect
• Ask about future plans - retirement? passing to kids?

───────────────────────────────────────────────────
⚠️ POTENTIAL OBJECTIONS
───────────────────────────────────────────────────
❓ "I'm not ready to sell"
   → No pressure. Just wanted to share what options exist
      when you are ready.

───────────────────────────────────────────────────
📅 NEXT STEPS
───────────────────────────────────────────────────
□ Confirm current situation and goals
□ Present 2-3 options
□ Set follow-up date before ending call

═══════════════════════════════════════════════════
⚡ QUICK GLANCE: John Smith | Plumber | 3 touches | interested
═══════════════════════════════════════════════════`;

  return NextResponse.json({
    success: true,
    worker: {
      id: NEVA.id,
      name: NEVA.name,
      role: NEVA.role,
      tagline: NEVA.tagline,
    },
    briefingFormat: {
      header: "Lead name, appointment date, meeting type, prepared by/at",
      sections: [
        "📍 CONTEXT - Property/business background",
        "💡 KEY INSIGHT - What makes this lead special",
        "🎯 TALKING POINTS - What to lead with",
        "⚠️ POTENTIAL OBJECTIONS - Prep for pushback",
        "💬 CONVERSATION HISTORY - Previous interactions",
        "📅 NEXT STEPS - Action items",
      ],
      quickGlance: "One-liner summary for at-a-glance reference",
    },
    exampleBriefing,
    signaturePhrases: NEVA.linguistic.signaturePhrases,
  });
}
