import twilio from "twilio";
import { NextRequest } from "next/server";

/**
 * Twilio Webhook Signature Validation
 *
 * Validates that incoming webhook requests are actually from Twilio
 * by checking the X-Twilio-Signature header against the request body.
 *
 * Handles proxy/load balancer scenarios by reconstructing the URL
 * from x-forwarded-proto and x-forwarded-host headers.
 */

const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

/**
 * Reconstruct the full URL from a Next.js request, accounting for proxies
 */
function reconstructUrl(request: NextRequest): string {
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (request.url.startsWith("https") ? "https" : "http");
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  const url = new URL(request.url);
  return `${proto}://${host}${url.pathname}${url.search}`;
}

/**
 * Convert form data to the format Twilio expects for validation
 */
function formDataToParams(formData: FormData): Record<string, string> {
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = value.toString();
  });
  return params;
}

export interface TwilioValidationResult {
  isValid: boolean;
  error?: string;
  params?: Record<string, string>;
}

/**
 * Validate a Twilio webhook request
 *
 * @param request - The incoming Next.js request
 * @param formData - The parsed form data from the request
 * @returns Validation result with parsed params if valid
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const formData = await request.formData();
 *   const validation = validateTwilioWebhook(request, formData);
 *
 *   if (!validation.isValid) {
 *     return new NextResponse(validation.error, { status: 403 });
 *   }
 *
 *   // Process the validated webhook...
 *   const { CallSid, From, To } = validation.params;
 * }
 * ```
 */
export function validateTwilioWebhook(
  request: NextRequest,
  formData: FormData
): TwilioValidationResult {
  // Skip validation in development if no auth token
  if (!TWILIO_AUTH_TOKEN) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[Twilio Webhook] No TWILIO_AUTH_TOKEN set - skipping validation in development"
      );
      return {
        isValid: true,
        params: formDataToParams(formData),
      };
    }
    return {
      isValid: false,
      error: "Twilio auth token not configured",
    };
  }

  const signature = request.headers.get("x-twilio-signature");
  if (!signature) {
    return {
      isValid: false,
      error: "Missing X-Twilio-Signature header",
    };
  }

  const url = reconstructUrl(request);
  const params = formDataToParams(formData);

  try {
    const isValid = twilio.validateRequest(
      TWILIO_AUTH_TOKEN,
      signature,
      url,
      params
    );

    if (!isValid) {
      console.warn(`[Twilio Webhook] Invalid signature for URL: ${url}`);
      return {
        isValid: false,
        error: "Invalid Twilio signature",
      };
    }

    return {
      isValid: true,
      params,
    };
  } catch (error: any) {
    console.error("[Twilio Webhook] Validation error:", error.message);
    return {
      isValid: false,
      error: "Signature validation failed",
    };
  }
}

/**
 * Helper to create a 403 Forbidden response for invalid webhooks
 */
export function forbiddenResponse(message: string = "Forbidden"): Response {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Access denied.</Say><Hangup/></Response>`,
    {
      status: 403,
      headers: { "Content-Type": "application/xml" },
    }
  );
}

/**
 * Optional: Middleware-style wrapper for webhook handlers
 *
 * @example
 * ```typescript
 * export const POST = withTwilioValidation(async (request, params) => {
 *   const { CallSid, From, To } = params;
 *   // Handle the validated webhook...
 *   return new NextResponse(twiml, { headers: { "Content-Type": "application/xml" } });
 * });
 * ```
 */
export function withTwilioValidation(
  handler: (
    request: NextRequest,
    params: Record<string, string>
  ) => Promise<Response>
) {
  return async (request: NextRequest): Promise<Response> => {
    const formData = await request.formData();
    const validation = validateTwilioWebhook(request, formData);

    if (!validation.isValid) {
      console.warn(`[Twilio Webhook] Rejected: ${validation.error}`);
      return forbiddenResponse(validation.error);
    }

    return handler(request, validation.params!);
  };
}
