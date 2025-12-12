import { NextRequest, NextResponse } from "next/server";
import smsInitial from "@/lib/templates/sms_initial.json";
import smsGiannaLoop from "@/lib/templates/sms_gianna_loop.json";
import smsStrategySession from "@/lib/templates/sms_strategy_session.json";

const SIGNALHOUSE_API_BASE = "https://api.signalhouse.io/api/v1";
const SIGNALHOUSE_API_KEY = process.env.SIGNALHOUSE_API_KEY || "";
const SIGNALHOUSE_FROM_NUMBER = process.env.SIGNALHOUSE_FROM_NUMBER || "";

interface SendTemplateRequest {
  template_id: string;
  to: string;
  from?: string;
  variables: {
    first_name?: string;
    company_name?: string;
    property_address?: string;
    [key: string]: string | undefined;
  };
  campaign_id?: string;
  lead_id?: string;
}

// Get template by ID from all libraries
function getTemplateById(
  templateId: string,
): { message: string; name: string; category: string } | null {
  // Check initial templates
  const initial = smsInitial.templates.find((t) => t.id === templateId);
  if (initial)
    return {
      message: initial.message,
      name: initial.name,
      category: initial.category,
    };

  // Check Gianna loop templates
  const loop = smsGiannaLoop.templates.find((t) => t.id === templateId);
  if (loop)
    return { message: loop.message, name: loop.name, category: loop.category };

  // Check strategy session templates
  const strategy = smsStrategySession.templates.find(
    (t) => t.id === templateId,
  );
  if (strategy)
    return {
      message: strategy.message,
      name: strategy.name,
      category: strategy.category,
    };

  return null;
}

// Replace variables in template
function replaceVariables(
  template: string,
  variables: Record<string, string | undefined>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value || "");
  }
  return result;
}

// POST /api/sms/send-template - Send SMS using a template
export async function POST(request: NextRequest) {
  try {
    const body: SendTemplateRequest = await request.json();
    const { template_id, to, from, variables, campaign_id, lead_id } = body;

    // Validate required fields
    if (!template_id || !to) {
      return NextResponse.json(
        { error: "template_id and to are required" },
        { status: 400 },
      );
    }

    if (!SIGNALHOUSE_API_KEY) {
      return NextResponse.json(
        { error: "SignalHouse API key not configured" },
        { status: 503 },
      );
    }

    // Get template
    const template = getTemplateById(template_id);
    if (!template) {
      return NextResponse.json(
        { error: `Template not found: ${template_id}` },
        { status: 404 },
      );
    }

    // Build message with variables
    const messageText = replaceVariables(template.message, variables);

    // Validate message length for SMS
    if (messageText.length > 320) {
      return NextResponse.json(
        {
          error: "Message exceeds 320 characters",
          character_count: messageText.length,
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
      template_id,
      template_name: template.name,
      category: template.category,
      to,
      campaign_id,
      lead_id,
      message_id: data.messageId || data.id,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message_id: data.messageId || data.id,
      template: {
        id: template_id,
        name: template.name,
        category: template.category,
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
