import { NextRequest, NextResponse } from "next/server";

// SignalHouse Bulk SMS API
// Based on https://api.signalhouse.io/message/sendSMS
// Headers: apiKey + authToken (from SignalHouse dashboard)

const SIGNALHOUSE_SMS_URL = "https://api.signalhouse.io/message/sendSMS";
const SIGNALHOUSE_MMS_URL = "https://api.signalhouse.io/message/sendMMS";

// Environment variables (add via DigitalOcean)
const SIGNALHOUSE_API_KEY = process.env.SIGNALHOUSE_API_KEY || ""; // apiKey header
const SIGNALHOUSE_AUTH_TOKEN = process.env.SIGNALHOUSE_AUTH_TOKEN || ""; // authToken header (JWT)
const SIGNALHOUSE_DEFAULT_FROM = process.env.SIGNALHOUSE_DEFAULT_NUMBER || "";

// Webhook URL for delivery status callbacks
const WEBHOOK_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://monkfish-app-mb7h3.ondigitalocean.app";

interface BulkSmsRequest {
  to: string[]; // Array of E.164 phone numbers
  message: string; // Message content (160 chars for SMS)
  from?: string; // Your 10DLC number
  mediaUrl?: string; // Optional MMS image URL
  campaignId?: string; // For tracking
  shortLink?: boolean; // Enable link shortening
  statusCallbackUrl?: string; // Override default webhook
}

interface SignalHouseResponse {
  status?: string;
  success?: boolean;
  messageId?: string;
  message_id?: string;
  error?: string;
  message?: string;
}

// Rate limiting: Track sends per minute (2K/day = ~83/hour = ~1.4/min avg, but burst up to 100/min)
const sendLog: { timestamp: number; count: number }[] = [];
const RATE_LIMIT_PER_MINUTE = 100;
const DAILY_LIMIT = 2000;
let dailySendCount = 0;
let lastResetDate = new Date().toDateString();

function checkRateLimit(count: number): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const today = new Date().toDateString();

  // Reset daily counter
  if (today !== lastResetDate) {
    dailySendCount = 0;
    lastResetDate = today;
  }

  // Check daily limit
  if (dailySendCount + count > DAILY_LIMIT) {
    return {
      allowed: false,
      reason: `Daily limit of ${DAILY_LIMIT} reached. Resets at midnight.`,
    };
  }

  // Clean old minute entries
  const oneMinuteAgo = now - 60000;
  while (sendLog.length > 0 && sendLog[0].timestamp < oneMinuteAgo) {
    sendLog.shift();
  }

  // Check rate limit
  const currentRate = sendLog.reduce((sum, entry) => sum + entry.count, 0);
  if (currentRate + count > RATE_LIMIT_PER_MINUTE) {
    return {
      allowed: false,
      reason: `Rate limit of ${RATE_LIMIT_PER_MINUTE}/min exceeded. Wait 1 minute.`,
    };
  }

  sendLog.push({ timestamp: now, count });
  dailySendCount += count;
  return { allowed: true };
}

// POST - Send bulk SMS for lead generation (2K/day blitz)
export async function POST(request: NextRequest) {
  try {
    const body: BulkSmsRequest = await request.json();
    const {
      to,
      message,
      from,
      mediaUrl,
      campaignId,
      shortLink = false,
      statusCallbackUrl,
    } = body;

    // Validation
    if (!SIGNALHOUSE_API_KEY || !SIGNALHOUSE_AUTH_TOKEN) {
      return NextResponse.json(
        {
          error:
            "SignalHouse not configured. Set SIGNALHOUSE_API_KEY and SIGNALHOUSE_AUTH_TOKEN.",
          configured: false,
        },
        { status: 503 },
      );
    }

    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json(
        {
          error: "to array is required with at least one phone number",
        },
        { status: 400 },
      );
    }

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        {
          error: "message is required",
        },
        { status: 400 },
      );
    }

    // Validate E.164 format (+1XXXXXXXXXX for US)
    const validNumbers = to.filter((num) =>
      /^\+?1?\d{10,11}$/.test(num.replace(/\D/g, "")),
    );
    const invalidNumbers = to.filter(
      (num) => !/^\+?1?\d{10,11}$/.test(num.replace(/\D/g, "")),
    );

    if (validNumbers.length === 0) {
      return NextResponse.json(
        {
          error:
            "No valid phone numbers provided. Use E.164 format: +1XXXXXXXXXX",
          invalidNumbers,
        },
        { status: 400 },
      );
    }

    // Check rate limit
    const rateCheck = checkRateLimit(validNumbers.length);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: rateCheck.reason,
          dailyUsed: dailySendCount,
          dailyLimit: DAILY_LIMIT,
        },
        { status: 429 },
      );
    }

    // Ensure compliance message
    const complianceMessage = message.toLowerCase().includes("stop")
      ? message
      : `${message}\n\nReply STOP to opt out.`;

    const fromNumber = from || SIGNALHOUSE_DEFAULT_FROM;
    const callbackUrl =
      statusCallbackUrl || `${WEBHOOK_BASE_URL}/api/webhook/signalhouse`;

    console.log(
      `[SignalHouse Bulk] Sending ${validNumbers.length} messages from ${fromNumber}...`,
    );

    // SignalHouse API headers (from their curl example)
    const headers: Record<string, string> = {
      accept: "application/json",
      apiKey: SIGNALHOUSE_API_KEY,
      authToken: SIGNALHOUSE_AUTH_TOKEN,
      "Content-Type": "application/json",
    };

    // Send messages individually (SignalHouse API takes one recipient per call)
    const results: Array<{
      phone: string;
      success: boolean;
      messageId?: string;
      error?: string;
    }> = [];
    const endpoint = mediaUrl ? SIGNALHOUSE_MMS_URL : SIGNALHOUSE_SMS_URL;

    // Batch in parallel (max 10 concurrent to avoid rate limits)
    const batchSize = 10;
    for (let i = 0; i < validNumbers.length; i += batchSize) {
      const batch = validNumbers.slice(i, i + batchSize);

      const batchPromises = batch.map(async (phone) => {
        // Normalize to E.164
        const normalizedPhone = phone.startsWith("+")
          ? phone
          : `+1${phone.replace(/\D/g, "").slice(-10)}`;

        const payload: Record<string, unknown> = {
          from: fromNumber,
          to: normalizedPhone,
          message: complianceMessage,
          shortLink,
          statusCallbackUrl: callbackUrl,
        };

        if (mediaUrl) {
          payload.mediaUrl = mediaUrl;
        }

        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
          });

          const data: SignalHouseResponse = await response.json();

          if (response.ok && data.success !== false) {
            return {
              phone: normalizedPhone,
              success: true,
              messageId: data.messageId || data.message_id,
            };
          } else {
            return {
              phone: normalizedPhone,
              success: false,
              error: data.error || data.message || `HTTP ${response.status}`,
            };
          }
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : "Network error";
          return { phone: normalizedPhone, success: false, error: errorMsg };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to respect rate limits
      if (i + batchSize < validNumbers.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    console.log(
      `[SignalHouse Bulk] Complete: ${successCount} sent, ${failedCount} failed`,
    );

    return NextResponse.json({
      success: failedCount === 0,
      sent: successCount,
      failed: failedCount,
      skipped: invalidNumbers.length,
      results,
      invalidNumbers: invalidNumbers.length > 0 ? invalidNumbers : undefined,
      campaignId,
      dailyUsed: dailySendCount,
      dailyRemaining: DAILY_LIMIT - dailySendCount,
    });
  } catch (error: unknown) {
    console.error("[SignalHouse Bulk] Exception:", error);
    const message =
      error instanceof Error ? error.message : "Failed to send bulk SMS";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - Check bulk send status, rate limits, and daily usage
export async function GET() {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  const today = new Date().toDateString();

  // Reset daily counter if new day
  if (today !== lastResetDate) {
    dailySendCount = 0;
    lastResetDate = today;
  }

  // Calculate current minute rate
  const recentSends = sendLog.filter(
    (entry) => entry.timestamp >= oneMinuteAgo,
  );
  const currentRate = recentSends.reduce((sum, entry) => sum + entry.count, 0);

  return NextResponse.json({
    configured: !!(SIGNALHOUSE_API_KEY && SIGNALHOUSE_AUTH_TOKEN),
    defaultFrom: SIGNALHOUSE_DEFAULT_FROM ? "configured" : "not set",
    rateLimit: {
      perMinute: RATE_LIMIT_PER_MINUTE,
      usedThisMinute: currentRate,
      remainingThisMinute: RATE_LIMIT_PER_MINUTE - currentRate,
    },
    dailyLimit: {
      limit: DAILY_LIMIT,
      used: dailySendCount,
      remaining: DAILY_LIMIT - dailySendCount,
    },
    webhookUrl: `${WEBHOOK_BASE_URL}/api/webhook/signalhouse`,
    endpoints: {
      sms: SIGNALHOUSE_SMS_URL,
      mms: SIGNALHOUSE_MMS_URL,
    },
  });
}
