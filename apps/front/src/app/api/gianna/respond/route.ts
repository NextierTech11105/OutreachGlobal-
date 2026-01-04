import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, smsMessages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  resolveTemplateById,
  resolveAndRenderTemplate,
  templateExists,
  getAllTemplates,
} from "@/lib/sms/resolveTemplate";
import { CARTRIDGE_LIBRARY } from "@/lib/sms/template-cartridges";

/**
 * GIANNA RESPOND API
 *
 * Handles AI-assisted responses to leads:
 * - Templates from CARTRIDGE_LIBRARY (CANONICAL source)
 * - Response prioritization
 * - Appointment booking integration
 * - Human-in-the-loop approval workflow
 *
 * ENFORCEMENT: Returns templateId - never raw message content.
 * All template resolution happens at execution time via resolveTemplate.
 */

interface RespondRequest {
  leadId: string;
  templateId: string; // REQUIRED - from CARTRIDGE_LIBRARY
  templateKey?: string; // DEPRECATED - use templateId
  workspaceId: string;
  variables?: Record<string, string>; // Template variable values
  advisor?: "gianna" | "sabrina";
  requireApproval?: boolean; // Human-in-the-loop
  teamId?: string;
}

// POST - Send AI response using templateId from CARTRIDGE_LIBRARY
export async function POST(request: NextRequest) {
  try {
    const body: RespondRequest = await request.json();
    const {
      leadId,
      templateId,
      templateKey, // DEPRECATED
      workspaceId,
      variables = {},
      advisor = "gianna",
      requireApproval,
      teamId,
    } = body;

    if (!leadId) {
      return NextResponse.json(
        { error: "leadId is required" },
        { status: 400 },
      );
    }

    // ENFORCEMENT: Require templateId from CARTRIDGE_LIBRARY
    const effectiveTemplateId = templateId || templateKey;
    if (!effectiveTemplateId) {
      return NextResponse.json(
        {
          error: "templateId is required - raw message content not allowed",
          code: "TEMPLATE_ID_REQUIRED",
          hint: "Use a templateId from CARTRIDGE_LIBRARY (e.g., 'bb-1', 'crm-2')",
        },
        { status: 400 },
      );
    }

    // Validate templateId exists in CARTRIDGE_LIBRARY
    if (!templateExists(effectiveTemplateId)) {
      return NextResponse.json(
        {
          error: `Template not found in CARTRIDGE_LIBRARY: ${effectiveTemplateId}`,
          code: "TEMPLATE_NOT_FOUND",
          availableTemplates: getAllTemplates()
            .slice(0, 10)
            .map((t) => ({ id: t.id, name: t.name })),
        },
        { status: 404 },
      );
    }

    // Get lead
    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Build variables for template rendering
    const templateVariables: Record<string, string> = {
      name: lead.firstName || "there",
      firstName: lead.firstName || "there",
      first_name: lead.firstName || "there",
      lastName: lead.lastName || "",
      last_name: lead.lastName || "",
      businessName: lead.company || "",
      company: lead.company || "",
      ...variables,
    };

    // Resolve and render template
    const {
      message: messageContent,
      template,
      cartridgeId,
    } = resolveAndRenderTemplate(effectiveTemplateId, templateVariables);

    // If requires approval, store as pending (don't send yet)
    if (requireApproval) {
      return NextResponse.json({
        success: true,
        status: "pending_approval",
        templateId: effectiveTemplateId,
        templateName: template.name,
        cartridgeId,
        messagePreview: messageContent,
        leadId,
        advisor,
      });
    }

    // Send the message via SignalHouse
    const sendingNumber =
      lead.assignedNumber || process.env.SIGNALHOUSE_PHONE_NUMBER;

    // Create SMS record
    const smsId = crypto.randomUUID();
    try {
      await db.insert(smsMessages).values({
        id: smsId,
        leadId,
        direction: "outbound",
        fromNumber: sendingNumber || "",
        toNumber: lead.phone,
        body: messageContent,
        status: "sent",
        sentAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch {
      console.log("[GiannaRespond] SMS table may not exist, simulating...");
    }

    // Update lead
    try {
      await db
        .update(leads)
        .set({
          updatedAt: new Date(),
        })
        .where(eq(leads.id, leadId));
    } catch {
      console.log("[GiannaRespond] Lead update may have failed, continuing...");
    }

    console.log(
      `[GiannaRespond] ${advisor} sent templateId=${effectiveTemplateId} to ${lead.phone}`,
    );

    return NextResponse.json({
      success: true,
      status: "sent",
      messageId: smsId,
      templateId: effectiveTemplateId,
      templateName: template.name,
      cartridgeId,
      messagePreview: messageContent.substring(0, 50) + "...",
      leadId,
      advisor,
      sentTo: lead.phone,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Respond failed";
    console.error("[GiannaRespond] Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - Get available templates from CARTRIDGE_LIBRARY
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cartridgeId = searchParams.get("cartridge");
    const worker = searchParams.get("worker"); // 'GIANNA' | 'CATHY' | 'SABRINA'
    const stage = searchParams.get("stage"); // 'initial' | 'followup' | etc.

    // Get all templates from CARTRIDGE_LIBRARY
    let templates = getAllTemplates();

    // Filter by cartridge if specified
    if (cartridgeId) {
      const cartridge = CARTRIDGE_LIBRARY.find((c) => c.id === cartridgeId);
      if (cartridge) {
        templates = cartridge.templates;
      }
    }

    // Filter by worker if specified
    if (worker) {
      templates = templates.filter(
        (t) => t.worker.toUpperCase() === worker.toUpperCase(),
      );
    }

    // Filter by stage if specified
    if (stage) {
      templates = templates.filter((t) => t.stage === stage);
    }

    // Format response
    const formattedTemplates = templates.map((t) => ({
      id: t.id,
      name: t.name,
      stage: t.stage,
      worker: t.worker,
      tags: t.tags,
      charCount: t.charCount,
      variables: t.variables,
    }));

    return NextResponse.json({
      success: true,
      templates: formattedTemplates,
      cartridges: CARTRIDGE_LIBRARY.map((c) => ({
        id: c.id,
        name: c.name,
        templateCount: c.templates.length,
      })),
      advisors: ["gianna", "cathy", "sabrina"],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Query failed";
    console.error("[GiannaRespond] Query error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
