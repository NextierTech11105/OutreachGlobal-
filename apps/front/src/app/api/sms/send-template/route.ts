import { NextRequest, NextResponse } from "next/server";
import {
  resolveTemplateById,
  resolveAndRenderTemplate,
  templateExists,
} from "@/lib/sms/resolveTemplate";

/**
 * SMS SEND TEMPLATE API
 *
 * CANONICAL template resolution - uses CARTRIDGE_LIBRARY only.
 * This is the ONLY way to send templated SMS.
 *
 * Raw message text is REJECTED - must use templateId.
 */

const SIGNALHOUSE_API_BASE = "https://api.signalhouse.io/api/v1";
const SIGNALHOUSE_API_KEY = process.env.SIGNALHOUSE_API_KEY || "";
const SIGNALHOUSE_FROM_NUMBER = process.env.SIGNALHOUSE_FROM_NUMBER || "";

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

    if (!SIGNALHOUSE_API_KEY) {
      return NextResponse.json(
        { error: "SignalHouse API key not configured" },
        { status: 503 },
      );
    }

    // CANONICAL: Resolve template from CARTRIDGE_LIBRARY
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

    // Resolve and render template with variables
    const { message: messageText, template, cartridgeId } = resolveAndRenderTemplate(
      templateId,
      normalizedVariables,
    );

    // Validate message length for SMS
    if (messageText.length > 320) {
      return NextResponse.json(
        {
          error: "Rendered message exceeds 320 characters",
          character_count: messageText.length,
          template_id: templateId,
        },
        { status: 400 },
      );
    }

    // Send via SignalHouse
    const response = await fetch(`${SIGNALHOUSE_API_BASE}/message/sendSMS`, {
      method: "POST",
      headers: {
        "x-api-key": SIGNALHOUSE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        from: from || SIGNALHOUSE_FROM_NUMBER,
        message: messageText,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.message || `SignalHouse error: ${response.status}` },
        { status: response.status },
      );
    }

    const data = await response.json();

    // Log the send for tracking
    console.log("[SMS Send Template]", {
      templateId,
      template_name: template.name,
      cartridgeId,
      stage: template.stage,
      to,
      campaign_id,
      lead_id,
      teamId,
      message_id: data.messageId || data.id,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message_id: data.messageId || data.id,
      template: {
        id: templateId,
        name: template.name,
        stage: template.stage,
        cartridgeId,
      },
      message_preview: messageText.substring(0, 50) + "...",
      character_count: messageText.length,
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
