/**
 * SignalHouse Send API
 * POST /api/signalhouse/send
 *
 * Unified SMS/MMS sending endpoint using the SignalHouse SMS Core.
 * Handles landline validation, rate limiting, and error recovery.
 *
 * ENFORCEMENT: Requires templateId from CARTRIDGE_LIBRARY.
 * Raw message text is deprecated - use templateId + variables.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  sendSMS,
  sendMMS,
  isConfigured,
  validatePhoneNumber,
} from "@/lib/signalhouse/client";
import { checkRateLimit, recordSend } from "@/lib/sms/rate-limiter";
import {
  resolveAndRenderTemplate,
  templateExists,
  isRawMessage,
} from "@/lib/sms/resolveTemplate";

export async function POST(request: NextRequest) {
  try {
    // Validate SignalHouse configuration
    if (!isConfigured()) {
      return NextResponse.json(
        {
          error: "SignalHouse credentials not configured",
          help: "Set SIGNALHOUSE_API_KEY or SIGNALHOUSE_AUTH_TOKEN environment variable",
        },
        { status: 503 },
      );
    }

    const {
      to,
      from,
      templateId,
      variables = {},
      message, // DEPRECATED - will be rejected if raw text
      mediaUrl,
      phoneType,
      skipLandlineValidation,
      validateNumber,
      teamId,
    } = await request.json();

    // ENFORCEMENT: Require templateId, reject raw messages
    if (!templateId && message) {
      if (isRawMessage(message)) {
        return NextResponse.json(
          {
            error: "Raw message text is not allowed. Use templateId from CARTRIDGE_LIBRARY.",
            code: "RAW_MESSAGE_REJECTED",
            hint: "Pass templateId + variables instead of raw message text",
          },
          { status: 400 },
        );
      }
    }

    // Determine effective templateId
    const effectiveTemplateId = templateId || (message && !isRawMessage(message) ? message : null);

    // Validate templateId exists
    if (!effectiveTemplateId) {
      return NextResponse.json(
        {
          error: "templateId is required",
          code: "TEMPLATE_ID_REQUIRED",
          required: {
            to: "recipient phone (E.164)",
            from: "sender phone (E.164)",
            templateId: "templateId from CARTRIDGE_LIBRARY (e.g., 'bb-1', 'crm-2')",
            variables: "optional variables for template",
          },
        },
        { status: 400 },
      );
    }

    if (!templateExists(effectiveTemplateId)) {
      return NextResponse.json(
        {
          error: `Template not found in CARTRIDGE_LIBRARY: ${effectiveTemplateId}`,
          code: "TEMPLATE_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    // Validate required fields
    if (!to || !from) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: {
            to: "recipient phone (E.164)",
            from: "sender phone (E.164)",
          },
        },
        { status: 400 },
      );
    }

    // Resolve and render template
    const { message: renderedMessage, template, cartridgeId } = resolveAndRenderTemplate(
      effectiveTemplateId,
      variables,
    );

    // Optional: Validate phone number with carrier lookup
    if (validateNumber) {
      const validation = await validatePhoneNumber(to);
      if (validation.success && validation.data) {
        const { valid, lineType } = validation.data;
        if (!valid) {
          return NextResponse.json(
            {
              error: "Invalid phone number",
              to,
              validation: validation.data,
            },
            { status: 400 },
          );
        }
        // Block landlines unless explicitly skipped
        if (lineType === "landline" && !skipLandlineValidation) {
          return NextResponse.json(
            {
              error: "Cannot send SMS to landline numbers",
              phoneType: "landline",
              carrier: validation.data.carrier,
              suggestion:
                "Use voice calls for landline numbers or set skipLandlineValidation: true",
            },
            { status: 400 },
          );
        }
      }
    }

    // Block known landlines (from previous validation data passed in request)
    const normalizedType = (phoneType || "").toLowerCase();
    if (normalizedType === "landline" && !skipLandlineValidation) {
      return NextResponse.json(
        {
          error: "Cannot send SMS to landline numbers",
          phoneType: "landline",
          suggestion: "Use voice calls for landline numbers",
        },
        { status: 400 },
      );
    }

    // Check rate limit before sending (tenant-isolated)
    const rateLimitCheck = await checkRateLimit(teamId);
    if (rateLimitCheck.blocked && rateLimitCheck.response) {
      return NextResponse.json(
        {
          error: rateLimitCheck.response.error,
          retryAfterMs: rateLimitCheck.response.retryAfterMs,
          carrier: rateLimitCheck.response.carrier,
          limit: rateLimitCheck.response.limit,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.ceil(rateLimitCheck.response.retryAfterMs / 1000),
            ),
          },
        },
      );
    }

    // Send SMS or MMS based on mediaUrl presence
    const result = mediaUrl
      ? await sendMMS({ to, from, message: renderedMessage, mediaUrl })
      : await sendSMS({ to, from, message: renderedMessage });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || "Failed to send message",
          correlationId: result.correlationId,
        },
        { status: result.status || 500 },
      );
    }

    // Record successful send for rate limiting (tenant-isolated)
    await recordSend(teamId);

    // Log with template info
    console.log("[SignalHouse Send] Sent via template:", {
      templateId: effectiveTemplateId,
      templateName: template.name,
      cartridgeId,
      to,
      teamId,
    });

    return NextResponse.json({
      success: true,
      messageId: result.data?.messageId,
      status: result.data?.status,
      segments: result.data?.segments,
      correlationId: result.correlationId,
      template: {
        id: effectiveTemplateId,
        name: template.name,
        cartridgeId,
      },
    });
  } catch (error: unknown) {
    console.error("[SignalHouse Send] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send message";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
