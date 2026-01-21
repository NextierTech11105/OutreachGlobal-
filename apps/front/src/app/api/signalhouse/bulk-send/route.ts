import { NextRequest, NextResponse } from "next/server";
import { luciService } from "@/lib/luci";

// SignalHouse Bulk SMS API
// Based on https://api.signalhouse.io/message/sendSMS
// Headers: apiKey + authToken (from SignalHouse dashboard)
// NOTE: Prefer ExecutionRouter for template-based sends with LUCI gates

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

interface PhoneWithType {
  number: string;
  type?: string; // 'mobile' | 'landline' | 'voip' | 'unknown'
  leadId?: string; // Lead ID for LUCI gate check
}

interface BulkSmsRequest {
  to: string[] | PhoneWithType[]; // Array of E.164 phone numbers OR objects with type
  message: string; // Message content (160 chars for SMS)
  from?: string; // Your 10DLC number
  mediaUrl?: string; // Optional MMS image URL
  campaignId?: string; // For tracking
  teamId?: string; // Team ID for LUCI compliance check
  shortLink?: boolean; // Enable link shortening
  statusCallbackUrl?: string; // Override default webhook
  skipLandlineValidation?: boolean; // Override landline check (not recommended)
}

interface SignalHouseResponse {
  status?: string;
  success?: boolean;
  messageId?: string;
  message_id?: string;
  error?: string;
  message?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH THROTTLING CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════
// LOW_VOLUME use-case: ≤2,000 SMS/day
// Campaign Blocks: 2K leads → sent in batches of 250
// Delay between batches: 5 seconds (configurable)
// ═══════════════════════════════════════════════════════════════════════════════

// Batch configuration (from PLAN.md - The Machine architecture)
const BATCH_SIZE = 250; // Each batch = 250 messages
const BATCH_DELAY_MS = 5000; // 5 seconds between batches
const CONCURRENT_SENDS = 10; // Parallel sends within a batch

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
      teamId,
      shortLink = false,
      statusCallbackUrl,
      skipLandlineValidation = false,
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

    // Normalize input - accept both string[] and PhoneWithType[]
    const phoneList: PhoneWithType[] = to.map((item) => {
      if (typeof item === "string") {
        return { number: item, type: "unknown" };
      }
      return item;
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // LUCI GATE - Filter out suppressed leads BEFORE sending
    // ═══════════════════════════════════════════════════════════════════════════════
    const luciBlockedNumbers: string[] = [];
    if (teamId) {
      // Check each phone with a leadId against LUCI
      for (const phone of phoneList) {
        if (phone.leadId) {
          const luciCheck = await luciService.canContact(phone.leadId, teamId);
          if (!luciCheck.allowed) {
            luciBlockedNumbers.push(phone.number);
            console.log(`[SignalHouse Bulk] LUCI blocked ${phone.number} (${phone.leadId}): ${luciCheck.reason}`);
          }
        }
      }
    }

    // Filter out landlines and LUCI-blocked - they cannot receive SMS
    const landlineNumbers: string[] = [];
    const smsablePhones: PhoneWithType[] = [];

    for (const phone of phoneList) {
      // Skip LUCI-blocked numbers
      if (luciBlockedNumbers.includes(phone.number)) {
        continue;
      }
      const phoneType = phone.type?.toLowerCase() || "unknown";
      if (phoneType === "landline" && !skipLandlineValidation) {
        landlineNumbers.push(phone.number);
      } else {
        smsablePhones.push(phone);
      }
    }

    // Validate E.164 format (+1XXXXXXXXXX for US)
    const validNumbers = smsablePhones
      .filter((p) => /^\+?1?\d{10,11}$/.test(p.number.replace(/\D/g, "")))
      .map((p) => p.number);
    const invalidNumbers = smsablePhones
      .filter((p) => !/^\+?1?\d{10,11}$/.test(p.number.replace(/\D/g, "")))
      .map((p) => p.number);

    if (validNumbers.length === 0) {
      // Check if all numbers were landlines
      if (landlineNumbers.length > 0 && smsablePhones.length === 0) {
        return NextResponse.json(
          {
            error: "All phone numbers are landlines (cannot receive SMS)",
            landlineCount: landlineNumbers.length,
            landlineNumbers: landlineNumbers.slice(0, 10), // Show first 10
          },
          { status: 400 },
        );
      }

      return NextResponse.json(
        {
          error:
            "No valid phone numbers provided. Use E.164 format: +1XXXXXXXXXX",
          invalidNumbers,
        },
        { status: 400 },
      );
    }

    // Log landline skip if any
    if (landlineNumbers.length > 0) {
      console.log(
        `[SignalHouse Bulk] Skipping ${landlineNumbers.length} landline numbers (cannot receive SMS)`,
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

    // ═══════════════════════════════════════════════════════════════════════════════
    // BATCH THROTTLING: 250 per batch, 5s delay between batches
    // This ensures LOW_VOLUME compliance and sustainable delivery
    // ═══════════════════════════════════════════════════════════════════════════════
    const results: Array<{
      phone: string;
      success: boolean;
      messageId?: string;
      error?: string;
    }> = [];
    const endpoint = mediaUrl ? SIGNALHOUSE_MMS_URL : SIGNALHOUSE_SMS_URL;

    // Calculate batch counts for progress tracking
    const totalBatches = Math.ceil(validNumbers.length / BATCH_SIZE);
    let currentBatch = 0;

    console.log(
      `[SignalHouse Bulk] Starting ${totalBatches} batches of ${BATCH_SIZE} (${validNumbers.length} total)`,
    );

    // Process in batches of 250 (BATCH_SIZE)
    for (let i = 0; i < validNumbers.length; i += BATCH_SIZE) {
      currentBatch++;
      const batchNumbers = validNumbers.slice(i, i + BATCH_SIZE);

      console.log(
        `[SignalHouse Bulk] Processing batch ${currentBatch}/${totalBatches} (${batchNumbers.length} messages)`,
      );

      // Within each batch, send in parallel groups of CONCURRENT_SENDS (10)
      for (let j = 0; j < batchNumbers.length; j += CONCURRENT_SENDS) {
        const concurrentGroup = batchNumbers.slice(j, j + CONCURRENT_SENDS);

        const groupPromises = concurrentGroup.map(async (phone) => {
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
            const errorMsg =
              err instanceof Error ? err.message : "Network error";
            return { phone: normalizedPhone, success: false, error: errorMsg };
          }
        });

        const groupResults = await Promise.all(groupPromises);
        results.push(...groupResults);

        // Small delay between concurrent groups within a batch
        if (j + CONCURRENT_SENDS < batchNumbers.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      // 5 second delay between 250-message batches (BATCH_DELAY_MS)
      // This ensures sustainable throughput for LOW_VOLUME compliance
      if (i + BATCH_SIZE < validNumbers.length) {
        console.log(
          `[SignalHouse Bulk] Batch ${currentBatch} complete. Waiting ${BATCH_DELAY_MS / 1000}s before next batch...`,
        );
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    console.log(`[SignalHouse Bulk] All ${totalBatches} batches complete.`);

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    console.log(
      `[SignalHouse Bulk] Complete: ${successCount} sent, ${failedCount} failed`,
    );

    return NextResponse.json({
      success: failedCount === 0,
      sent: successCount,
      failed: failedCount,
      skippedInvalid: invalidNumbers.length,
      skippedLandlines: landlineNumbers.length,
      skippedLuciBlocked: luciBlockedNumbers.length,
      // Batch progress info
      batchInfo: {
        totalBatches,
        batchSize: BATCH_SIZE,
        batchDelaySeconds: BATCH_DELAY_MS / 1000,
        concurrentSends: CONCURRENT_SENDS,
      },
      results,
      invalidNumbers: invalidNumbers.length > 0 ? invalidNumbers : undefined,
      landlineNumbers:
        landlineNumbers.length > 0 ? landlineNumbers.slice(0, 10) : undefined,
      luciBlockedNumbers:
        luciBlockedNumbers.length > 0 ? luciBlockedNumbers.slice(0, 10) : undefined,
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
    // Batch throttling configuration (The Machine architecture)
    batchConfig: {
      batchSize: BATCH_SIZE,
      batchDelaySeconds: BATCH_DELAY_MS / 1000,
      concurrentSends: CONCURRENT_SENDS,
      description: `${BATCH_SIZE} messages per batch, ${BATCH_DELAY_MS / 1000}s delay between batches`,
    },
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
