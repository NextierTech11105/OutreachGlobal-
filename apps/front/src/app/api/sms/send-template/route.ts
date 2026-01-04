import { NextRequest, NextResponse } from "next/server";
import { executeSMS, isRouterConfigured } from "@/lib/sms/ExecutionRouter";
import { templateExists } from "@/lib/sms/resolveTemplate";

/**
 * SMS SEND TEMPLATE API
 *
 * CANONICAL template resolution - uses CARTRIDGE_LIBRARY only.
 * Routes ALL sends through ExecutionRouter.
 *
 * Raw message text is REJECTED - must use templateId.
 */

interface SendTemplateRequest {
  template_id: string; // REQUIRED - templateId from CARTRIDGE_LIBRARY
  templateId?: string; // Alias for template_id
  to: string;
  from?: string;
  variables: {
    name?: string;
    first_name?: string;
    firstName?: string;
    lastName?: string;
    company_name?: string;
    businessName?: string;
    [key: string]: string | undefined;
  };
  campaign_id?: string;
  lead_id?: string;
  teamId?: string;
  trainingMode?: boolean;
}

// POST /api/sms/send-template - Send SMS using a template from CARTRIDGE_LIBRARY
export async function POST(request: NextRequest) {
  try {
    const body: SendTemplateRequest = await request.json();
    const {
      template_id,
      templateId: templateIdAlias,
      to,
      from,
      variables,
      campaign_id,
      lead_id,
      teamId,
      trainingMode,
    } = body;

    // Accept either template_id or templateId
    const templateId = template_id || templateIdAlias;

    // ENFORCEMENT: templateId is REQUIRED
    if (!templateId) {
      return NextResponse.json(
        {
          error: "templateId is required - raw message text not allowed",
          code: "TEMPLATE_ID_REQUIRED",
        },
        { status: 400 },
      );
    }

    if (!to) {
      return NextResponse.json(
        { error: "to (phone number) is required" },
        { status: 400 },
      );
    }

    // Check ExecutionRouter configuration
    const routerStatus = isRouterConfigured();
    if (!routerStatus.configured) {
      return NextResponse.json(
        { error: "SMS provider not configured" },
        { status: 503 },
      );
    }

    // CANONICAL: Validate template exists in CARTRIDGE_LIBRARY
    if (!templateExists(templateId)) {
      return NextResponse.json(
        {
          error: `Template not found in CARTRIDGE_LIBRARY: ${templateId}`,
          code: "TEMPLATE_NOT_FOUND",
          hint: "Use a valid templateId from the Template Library",
        },
        { status: 404 },
      );
    }

    // Normalize variable keys (support both snake_case and camelCase)
    const normalizedVariables: Record<string, string> = {};
    for (const [key, value] of Object.entries(variables || {})) {
      if (value) {
        normalizedVariables[key] = value;
        // Add common aliases
        if (key === "first_name") normalizedVariables["firstName"] = value;
        if (key === "firstName") normalizedVariables["first_name"] = value;
        if (key === "company_name") normalizedVariables["businessName"] = value;
        if (key === "businessName") normalizedVariables["company_name"] = value;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CANONICAL: Route through ExecutionRouter
    // This is the ONLY approved way to send SMS
    // ═══════════════════════════════════════════════════════════════════════
    const result = await executeSMS({
      templateId,
      to,
      from,
      variables: normalizedVariables,
      leadId: lead_id,
      teamId,
      campaignId: campaign_id,
      worker: "SYSTEM",
      trainingMode,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send message" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message_id: result.messageId,
      template: {
        id: result.templateId,
        name: result.templateName,
        cartridgeId: result.cartridgeId,
      },
      message_preview: result.renderedMessage.substring(0, 50) + "...",
      character_count: result.renderedMessage.length,
      provider: result.provider,
      trainingMode: result.trainingMode,
    });
  } catch (error) {
    console.error("[SMS Send Template] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to send message",
      },
      { status: 500 },
    );
  }
}
