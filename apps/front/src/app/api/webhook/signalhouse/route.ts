import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { smsQueueService } from "@/lib/services/sms-queue-service";
import { db } from "@/lib/db";
import {
  smsMessages,
  leads,
  signalhouseBrands,
  signalhouseCampaigns,
  teamPhoneNumbers,
} from "@/lib/db/schema";
import { eq, and, desc, like, isNotNull, sql } from "drizzle-orm";
import { sendSMS } from "@/lib/signalhouse/client";
import {
  getEmailCaptureConfirmation,
  getContentLinkConfirmation,
  isContentPermission,
} from "@/lib/gianna/knowledge-base/email-capture-library";
import {
  routeByPhoneNumber,
  routeByCampaignId,
  formatWorkerResponse,
  logWorkerActivity,
  getWorkerForLeadStage,
  type AIWorker,
} from "@/lib/ai-workers/worker-router";

// ═══════════════════════════════════════════════════════════════════════════════
// WEBHOOK SECURITY (Query Parameter Token)
// ═══════════════════════════════════════════════════════════════════════════════
// SignalHouse doesn't sign webhooks, so we use a shared secret token in the URL.
// Configure your webhook URL in SignalHouse as:
//   https://yourapp.com/api/webhook/signalhouse?token=YOUR_SECRET_TOKEN
// ═══════════════════════════════════════════════════════════════════════════════

const WEBHOOK_TOKEN = process.env.SIGNALHOUSE_WEBHOOK_TOKEN || "";

/**
 * Verify webhook token from query parameter
 * Returns true if token is valid or not configured (dev mode)
 */
function verifyWebhookToken(
  requestUrl: string,
): { valid: boolean; error?: string } {
  // If no token configured, allow all requests (backwards compatible)
  if (!WEBHOOK_TOKEN) {
    console.warn(
      "[SignalHouse] ⚠️ SIGNALHOUSE_WEBHOOK_TOKEN not set - webhook is unprotected",
    );
    return { valid: true };
  }

  // Extract token from query string
  const url = new URL(requestUrl);
  const providedToken = url.searchParams.get("token");

  if (!providedToken) {
    return { valid: false, error: "Missing token parameter" };
  }

  // Use timing-safe comparison
  try {
    const tokenBuffer = Buffer.from(providedToken);
    const expectedBuffer = Buffer.from(WEBHOOK_TOKEN);

    if (tokenBuffer.length !== expectedBuffer.length) {
      return { valid: false, error: "Invalid token" };
    }

    if (timingSafeEqual(tokenBuffer, expectedBuffer)) {
      return { valid: true };
    }
    return { valid: false, error: "Invalid token" };
  } catch {
    return { valid: false, error: "Token verification failed" };
  }
}

// SignalHouse Webhook Handler
// Based on https://devapi.signalhouse.io/apiDocs
// Receives inbound SMS, delivery status updates, and other events
// Integrates with SMS Queue Service for opt-out handling
//
// ═══════════════════════════════════════════════════════════════════════════════
// AI WORKER ROUTING:
// ═══════════════════════════════════════════════════════════════════════════════
// Each AI worker has their own dedicated phone number:
// - GIANNA (Opener)  → Initial contact, email capture
// - CATHY  (Nudger)  → Follow-ups, ghost re-engagement
// - SABRINA (Closer) → Booking calls, strategy sessions
//
// Inbound messages route to the worker whose number received them.
// ═══════════════════════════════════════════════════════════════════════════════
//
// ═══════════════════════════════════════════════════════════════════════════════
// 2-BRACKET SMS FLOW PATTERNS:
// ═══════════════════════════════════════════════════════════════════════════════
//
// FLOW A: Email Capture
//   1. Outbound: "Best email to send valuation report for {address}?"
//   2. Inbound:  "john@email.com"
//   3. Outbound: "John sure! Will have that sent out shortly - Gianna"
//   → Value X delivered via EMAIL, 24h SABRINA follow-up scheduled
//
// FLOW B: Content Link Permission
//   1. Outbound: "Can I send you a link to the Medium article I wrote?"
//   2. Inbound:  "Yes" / "Sure" / "Send it"
//   3. Outbound: "Great! Here it is: {contentUrl} - Gianna"
//   → Content link sent via SMS, 24h follow-up to pivot to email capture
//
// ═══════════════════════════════════════════════════════════════════════════════

interface SignalHouseWebhookPayload {
  // Event identification (SignalHouse format)
  event: string; // "message.received", "message.sent", "message.delivered", "message.failed"

  // Message fields
  message_id?: string;
  messageId?: string;
  from: string; // Sender phone (E.164)
  to: string; // Recipient phone (E.164)
  text?: string; // Message body
  body?: string; // Alternative field name

  // Status fields
  status?: string; // "delivered", "failed", "sent"
  error_code?: string;
  errorCode?: string;
  error_message?: string;
  errorMessage?: string;

  // Metadata
  timestamp: string;
  campaign_id?: string;

  // Raw payload
  [key: string]: unknown;
}

// Keywords that indicate a lead is interested
const POSITIVE_KEYWORDS = [
  "YES",
  "INTERESTED",
  "INFO",
  "MORE",
  "CALL",
  "DETAILS",
  "HELP",
];
const OPT_OUT_KEYWORDS = [
  "STOP",
  "UNSUBSCRIBE",
  "CANCEL",
  "END",
  "QUIT",
  "OPTOUT",
  "OPT OUT",
];

// Email extraction regex - RFC 5322 simplified
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;

// Phone/Mobile extraction regex - captures various formats
// Matches: (555) 123-4567, 555-123-4567, 555.123.4567, 5551234567, +1 555 123 4567
const PHONE_REGEX =
  /(?:\+?1[-.\s]?)?(?:\(?[2-9]\d{2}\)?[-.\s]?)?[2-9]\d{2}[-.\s]?\d{4}/g;

// Hot lead campaign ID (configured per tenant, fallback to default)
const HOT_LEAD_CAMPAIGN_ID =
  process.env.HOT_LEAD_CAMPAIGN_ID || "hot_leads_default";

// AI Worker phone numbers - each worker gets isolated lane
const AI_WORKER_PHONES: Record<string, string> = {
  GIANNA: process.env.GIANNA_PHONE_NUMBER || "", // Opener - inbound response center
  CATHY: process.env.CATHY_PHONE_NUMBER || "", // Nudger - inbound response center
  SABRINA: process.env.SABRINA_PHONE_NUMBER || "", // Closer - booking focus
};

/**
 * Extract email from message body
 */
function extractEmail(body: string): string | null {
  const matches = body.match(EMAIL_REGEX);
  return matches && matches.length > 0 ? matches[0].toLowerCase() : null;
}

/**
 * Extract phone/mobile number from message body
 * Returns normalized 10-digit US phone number
 * Filters out the sender's own number to avoid false positives
 */
function extractPhone(body: string, excludeNumber?: string): string | null {
  const matches = body.match(PHONE_REGEX);
  if (!matches || matches.length === 0) return null;

  // Normalize and filter
  const excludeNormalized = excludeNumber?.replace(/\D/g, "").slice(-10) || "";

  for (const match of matches) {
    const normalized = match.replace(/\D/g, "").slice(-10);
    // Must be 10 digits and not the sender's number
    if (normalized.length === 10 && normalized !== excludeNormalized) {
      return normalized;
    }
  }
  return null;
}

/**
 * Get content link for 2-bracket SMS flow
 * Returns a content link based on lead context/sector
 * Queries content library directly (no relations needed)
 */
async function getContentLinkForLead(
  leadId?: string,
  contentType?:
    | "MEDIUM_ARTICLE"
    | "NEWSLETTER"
    | "VIDEO"
    | "EBOOK"
    | "ONE_PAGER",
): Promise<{ url: string; title: string; contentType: string } | null> {
  try {
    // Default content link if DB query fails
    const fallback = {
      url:
        process.env.DEFAULT_CONTENT_LINK ||
        "https://outreachglobal.com/resources",
      title: "Exclusive Resources",
      contentType: "EXTERNAL_LINK",
    };

    // Try to get content from content library
    // NOTE: content_items table may not exist in front app schema
    // If this fails, we gracefully fallback to default link
    try {
      const result = await db.execute(sql`
        SELECT id, title, external_url, content_type
        FROM content_items
        WHERE is_active = true
          AND external_url IS NOT NULL
          ${contentType ? sql`AND content_type = ${contentType}` : sql``}
        ORDER BY created_at DESC
        LIMIT 1
      `);

      if (result.rows && result.rows.length > 0) {
        const item = result.rows[0] as any;
        return {
          url: item.external_url || fallback.url,
          title: item.title || fallback.title,
          contentType: item.content_type || "EXTERNAL_LINK",
        };
      }
    } catch (dbError) {
      // Content library table may not exist - this is OK
      console.log(
        "[SignalHouse] Content library query skipped - using fallback",
      );
    }

    return fallback;
  } catch (error) {
    console.error("[SignalHouse] Error fetching content link:", error);
    return {
      url:
        process.env.DEFAULT_CONTENT_LINK ||
        "https://outreachglobal.com/resources",
      title: "Exclusive Resources",
      contentType: "EXTERNAL_LINK",
    };
  }
}

/**
 * Push lead to hot lead campaign with GOLD label (email + mobile captured)
 * GOLD = High Contactability = 100% Lead Score
 * - email_captured: extracted from message
 * - mobile_captured: confirmed from inbound SMS number
 * - gold_label: both contact methods verified
 */
async function pushToHotLeadCampaign(
  leadId: string,
  email: string,
  mobileNumber?: string,
): Promise<void> {
  try {
    // Normalize mobile to E.164 format
    const normalizedMobile = mobileNumber
      ? `+1${mobileNumber.replace(/\D/g, "").slice(-10)}`
      : undefined;

    // Build tags array: email_captured + mobile_captured + gold_label
    const updateData: Record<string, unknown> = {
      email: email,
      status: "hot_lead",
      // Add all labels: email_captured, mobile_captured, gold_label, high_contactability
      tags: sql`
        array_cat(
          COALESCE(tags, ARRAY[]::text[]),
          ARRAY['email_captured', 'mobile_captured', 'gold_label', 'high_contactability']::text[]
        )
      `,
      score: 100, // 100% lead score for GOLD label
      updatedAt: new Date(),
    };

    // Also update phone if provided (from inbound SMS = verified mobile)
    if (normalizedMobile) {
      updateData.phone = normalizedMobile;
    }

    await db.update(leads).set(updateData).where(eq(leads.id, leadId));

    console.log(
      `[SignalHouse] 🏆 GOLD LABEL: Lead ${leadId} → email: ${email}, mobile: ${normalizedMobile || "from inbound"}`,
    );
    console.log(
      `[SignalHouse] 📱 Mobile saved to lead record: ${normalizedMobile}`,
    );
    console.log(`[SignalHouse] 📧 Email saved to lead record: ${email}`);
    console.log(`[SignalHouse] 🎯 Lead Score: 100% (High Contactability)`);
  } catch (error) {
    console.error("[SignalHouse] Error pushing to hot lead campaign:", error);
  }
}

/**
 * Helper to find a lead by phone number
 */
async function getLeadByPhone(phone: string) {
  if (!phone) return null;

  // Normalize phone for searching (last 10 digits)
  const normalized = phone.replace(/\D/g, "").slice(-10);
  if (normalized.length < 10) return null;

  try {
    const results = await db
      .select()
      .from(leads)
      .where(like(leads.phone, `%${normalized}%`))
      .limit(1);

    return results[0] || null;
  } catch (error) {
    console.error(
      `[SignalHouse Webhook] Error finding lead for ${phone}:`,
      error,
    );
    return null;
  }
}

// GET - Retrieve recent inbound messages from DB
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  try {
    const messages = await db
      .select()
      .from(smsMessages)
      .where(eq(smsMessages.direction, "inbound"))
      .orderBy(desc(smsMessages.createdAt))
      .limit(limit);

    return NextResponse.json({
      success: true,
      count: messages.length,
      messages: messages.map((m) => ({
        id: m.id,
        from: m.fromNumber,
        to: m.toNumber,
        body: m.body,
        receivedAt: m.receivedAt || m.createdAt,
        status: m.status,
        campaignId: m.campaignId,
        leadId: m.leadId,
      })),
    });
  } catch (error) {
    console.error("[SignalHouse Webhook] GET Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch messages" },
      { status: 500 },
    );
  }
}

// POST - Handle incoming webhooks from SignalHouse
export async function POST(request: NextRequest) {
  try {
    // ─────────────────────────────────────────────────────────────────────
    // STEP 0: VALIDATE WEBHOOK TOKEN (Security - prevents spoofing)
    // ─────────────────────────────────────────────────────────────────────
    const tokenCheck = verifyWebhookToken(request.url);
    if (!tokenCheck.valid) {
      console.error(
        `[SignalHouse] 🚫 WEBHOOK REJECTED: ${tokenCheck.error}`,
        {
          ip: request.headers.get("x-forwarded-for") || "unknown",
          userAgent: request.headers.get("user-agent"),
        },
      );
      return NextResponse.json(
        { error: "Unauthorized", reason: tokenCheck.error },
        { status: 401 },
      );
    }

    // Parse the payload
    const payload: SignalHouseWebhookPayload = await request.json();

    // SignalHouse uses dot notation: message.received, message.sent, etc.
    const eventType = payload.event || "unknown";
    const messageId =
      payload.message_id || payload.messageId || `msg_${Date.now()}`;
    const messageBody = payload.text || payload.body || "";
    const fromNumber = payload.from || "";
    const toNumber = payload.to || "";

    console.log(
      `[SignalHouse Webhook] Event: ${eventType}`,
      JSON.stringify(payload, null, 2),
    );

    // Check if message is opt-out or positive lead response
    const upperBody = messageBody.toUpperCase().trim();
    const isOptOut = OPT_OUT_KEYWORDS.some((kw) => upperBody.includes(kw));
    const isPositiveLead = POSITIVE_KEYWORDS.some((kw) =>
      upperBody.includes(kw),
    );

    // Handle different event types (SignalHouse uses various formats)
    // Support both dot notation (message.received) and underscore (MESSAGE_RECEIVED)
    const normalizedEvent = eventType.toLowerCase().replace(/_/g, ".");

    // Find lead associated with this communication
    // For inbound, search by 'from'. For outbound, search by 'to'.
    const searchPhone =
      normalizedEvent.includes("received") ||
      normalizedEvent.includes("inbound")
        ? fromNumber
        : toNumber;

    const lead = await getLeadByPhone(searchPhone);

    switch (normalizedEvent) {
      case "message.received":
      case "sms.received":
      case "inbound": {
        // ═══════════════════════════════════════════════════════════════════════
        // INBOUND SMS RECEIVED - Route to correct AI Worker
        // ═══════════════════════════════════════════════════════════════════════

        // STEP 1: Route to correct AI worker based on receiving phone number
        const workerRoute = routeByPhoneNumber(toNumber);
        const worker = workerRoute.worker;

        console.log(
          `[SignalHouse] 🤖 Routed to ${worker.name} (${worker.role}) via ${workerRoute.matchedBy}`,
        );

        // Log worker activity
        await logWorkerActivity(worker, "inbound_received", lead?.id || null, {
          from: fromNumber,
          to: toNumber,
          body: messageBody.substring(0, 100),
        });

        // Extract email from message if present
        const capturedEmail = extractEmail(messageBody);

        // Extract phone/mobile from message if present (excludes sender's number)
        const capturedMobile = extractPhone(messageBody, fromNumber);

        // Check if this is permission to send content (Flow B)
        const isPermissionResponse = isContentPermission(messageBody);

        // Determine message status
        let messageStatus = "received";
        if (isOptOut) messageStatus = "opted_out";
        else if (capturedEmail) messageStatus = "email_captured";
        else if (capturedMobile) messageStatus = "mobile_captured";
        else if (isPermissionResponse) messageStatus = "content_permission";
        else if (isPositiveLead) messageStatus = "interested";

        // Save inbound message to DB with worker info
        await db.insert(smsMessages).values({
          id: crypto.randomUUID(),
          leadId: lead?.id,
          direction: "inbound",
          fromNumber,
          toNumber,
          body: messageBody,
          status: messageStatus,
          providerMessageId: messageId,
          campaignId: payload.campaign_id as string,
          // Store worker info in metadata or dedicated field
          metadata: {
            workerId: worker.id,
            workerName: worker.name,
            routedBy: workerRoute.matchedBy,
          },
          receivedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // ─────────────────────────────────────────────────────────────────────
        // HANDLE OPT-OUT
        // ─────────────────────────────────────────────────────────────────────
        if (isOptOut) {
          console.log(`[SignalHouse] 🛑 OPT-OUT from ${fromNumber}`);
          await smsQueueService.handleStopMessage(fromNumber);

          if (lead) {
            await db
              .update(leads)
              .set({ status: "opted_out", updatedAt: new Date() })
              .where(eq(leads.id, lead.id));
          }
          return NextResponse.json({ success: true, event: "opt_out" });
        }

        // ─────────────────────────────────────────────────────────────────────
        // GREEN TAG: Lead responded! Add "responded" tag for highest priority
        // ─────────────────────────────────────────────────────────────────────
        // Priority Hierarchy:
        //   GREEN = responded (3x priority) - HOTTEST leads, call immediately
        //   GOLD = skip traced + mobile + email (2x priority)
        //   Standard = base priority (1x)
        // ─────────────────────────────────────────────────────────────────────
        if (lead) {
          const currentTags = (lead.tags as string[]) || [];
          if (!currentTags.includes("responded")) {
            await db
              .update(leads)
              .set({
                tags: sql`array_append(COALESCE(tags, ARRAY[]::text[]), 'responded')`,
                updatedAt: new Date(),
              })
              .where(eq(leads.id, lead.id));
            console.log(
              `[SignalHouse] 🟢 GREEN TAG: Added 'responded' to lead ${lead.id} → 3x priority boost`,
            );
          }
        }

        // ─────────────────────────────────────────────────────────────────────
        // FLOW A: EMAIL CAPTURED = MOBILE + EMAIL CAPTURED (100% Lead Score)
        // When lead provides email via SMS, we have BOTH contact methods:
        // - Mobile: confirmed from fromNumber (they're texting from it)
        // - Email: extracted from message body
        // ─────────────────────────────────────────────────────────────────────
        if (capturedEmail) {
          console.log(
            `[SignalHouse] 📧📱 EMAIL + MOBILE CAPTURED from ${fromNumber}: ${capturedEmail}`,
          );
          console.log(
            `[SignalHouse] 🎯 100% Lead Score - Both contact methods verified!`,
          );
          console.log(
            `[SignalHouse] 🤖 ${worker.name} handling email capture response`,
          );

          // Use the routed worker for response
          const firstName = lead?.firstName || "";

          // Get worker-specific confirmation message
          const confirmationMessage = formatWorkerResponse(
            worker,
            "emailCaptured",
            {
              firstName,
              email: capturedEmail,
            },
          );

          // Send confirmation SMS from the SAME worker's number
          if (toNumber) {
            try {
              const smsResult = await sendSMS({
                to: fromNumber,
                from: toNumber, // Reply from same worker's number
                message: confirmationMessage,
              });

              if (smsResult.success) {
                console.log(
                  `[SignalHouse] ✅ ${worker.name} sent confirmation to ${fromNumber}`,
                );

                // Log outbound with worker info
                await db.insert(smsMessages).values({
                  id: crypto.randomUUID(),
                  leadId: lead?.id,
                  direction: "outbound",
                  fromNumber: toNumber,
                  toNumber: fromNumber,
                  body: confirmationMessage,
                  status: "sent",
                  providerMessageId: smsResult.data?.messageId,
                  campaignId: HOT_LEAD_CAMPAIGN_ID,
                  metadata: {
                    workerId: worker.id,
                    workerName: worker.name,
                    action: "email_capture_confirmation",
                  },
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });

                // Log worker activity
                await logWorkerActivity(
                  worker,
                  "email_capture_confirmed",
                  lead?.id || null,
                  {
                    email: capturedEmail,
                    mobile: fromNumber,
                  },
                );
              }
            } catch (smsError) {
              console.error(
                `[SignalHouse] ${worker.name} SMS send error:`,
                smsError,
              );
            }
          }

          // Push to hot lead campaign with GOLD label (email + mobile = 100% score)
          if (lead) {
            await pushToHotLeadCampaign(lead.id, capturedEmail, fromNumber);
          }

          // TODO: Queue Value X email delivery
          // TODO: Schedule 24h SABRINA follow-up

          return NextResponse.json({
            success: true,
            event: "gold_label",
            email: capturedEmail,
            mobile: fromNumber,
            labels: [
              "email_captured",
              "mobile_captured",
              "gold_label",
              "high_contactability",
            ],
            leadScore: 100,
            flow: "email_capture",
          });
        }

        // ─────────────────────────────────────────────────────────────────────
        // FLOW A2: MOBILE CAPTURED
        // Lead provided different phone number → Confirm → Update lead record
        // ─────────────────────────────────────────────────────────────────────
        if (capturedMobile && !capturedEmail) {
          console.log(
            `[SignalHouse] 📱 MOBILE CAPTURED from ${fromNumber}: ${capturedMobile}`,
          );
          console.log(
            `[SignalHouse] 🤖 ${worker.name} handling mobile capture response`,
          );

          // Format for display: (555) 123-4567
          const formattedPhone = capturedMobile.replace(
            /(\d{3})(\d{3})(\d{4})/,
            "($1) $2-$3",
          );

          const firstName = lead?.firstName || "";

          // Use worker-specific confirmation message
          const confirmationMessage = formatWorkerResponse(
            worker,
            "mobileCaptured",
            {
              firstName,
              phone: formattedPhone,
            },
          );

          if (toNumber) {
            try {
              const smsResult = await sendSMS({
                to: fromNumber,
                from: toNumber, // Reply from same worker's number
                message: confirmationMessage,
              });

              if (smsResult.success) {
                console.log(
                  `[SignalHouse] ✅ ${worker.name} sent mobile confirmation to ${fromNumber}`,
                );

                await db.insert(smsMessages).values({
                  id: crypto.randomUUID(),
                  leadId: lead?.id,
                  direction: "outbound",
                  fromNumber: toNumber,
                  toNumber: fromNumber,
                  body: confirmationMessage,
                  status: "sent",
                  providerMessageId: smsResult.data?.messageId,
                  campaignId: HOT_LEAD_CAMPAIGN_ID,
                  metadata: {
                    workerId: worker.id,
                    workerName: worker.name,
                    action: "mobile_capture_confirmation",
                  },
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });

                await logWorkerActivity(
                  worker,
                  "mobile_capture_confirmed",
                  lead?.id || null,
                  {
                    capturedMobile,
                    fromNumber,
                  },
                );
              }
            } catch (smsError) {
              console.error(
                `[SignalHouse] ${worker.name} SMS send error:`,
                smsError,
              );
            }
          }

          // Update lead with mobile_captured tag
          if (lead) {
            await db
              .update(leads)
              .set({
                phone: `+1${capturedMobile}`, // Store as E.164
                status: "hot_lead",
                tags: sql`array_append(COALESCE(tags, ARRAY[]::text[]), 'mobile_captured')`,
                updatedAt: new Date(),
              })
              .where(eq(leads.id, lead.id));
          }

          return NextResponse.json({
            success: true,
            event: "mobile_captured",
            phone: capturedMobile,
            flow: "mobile_capture",
          });
        }

        // ─────────────────────────────────────────────────────────────────────
        // FLOW B: CONTENT PERMISSION GRANTED
        // Lead said "yes/sure" → Send content link via SMS
        // ─────────────────────────────────────────────────────────────────────
        if (isPermissionResponse) {
          console.log(
            `[SignalHouse] 🔗 CONTENT PERMISSION from ${fromNumber}: "${messageBody}"`,
          );
          console.log(
            `[SignalHouse] 🤖 ${worker.name} handling content link delivery`,
          );

          // Get content link from library
          const contentLink = await getContentLinkForLead(
            lead?.id,
            "MEDIUM_ARTICLE",
          );
          const firstName = lead?.firstName || "";

          if (contentLink && toNumber) {
            // Use worker-specific content link response
            const contentMessage = formatWorkerResponse(worker, "contentLink", {
              firstName,
              contentUrl: contentLink.url,
            });

            try {
              const smsResult = await sendSMS({
                to: fromNumber,
                from: toNumber, // Reply from same worker's number
                message: contentMessage,
              });

              if (smsResult.success) {
                console.log(
                  `[SignalHouse] ✅ ${worker.name} sent content link to ${fromNumber}: ${contentLink.url}`,
                );

                await db.insert(smsMessages).values({
                  id: crypto.randomUUID(),
                  leadId: lead?.id,
                  direction: "outbound",
                  fromNumber: toNumber,
                  toNumber: fromNumber,
                  body: contentMessage,
                  status: "sent",
                  providerMessageId: smsResult.data?.messageId,
                  campaignId: payload.campaign_id as string,
                  metadata: {
                    workerId: worker.id,
                    workerName: worker.name,
                    action: "content_link_sent",
                    contentUrl: contentLink.url,
                  },
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });

                // Update lead status
                if (lead) {
                  await db
                    .update(leads)
                    .set({
                      status: "content_sent",
                      tags: sql`array_append(COALESCE(tags, ARRAY[]::text[]), 'content_delivered')`,
                      updatedAt: new Date(),
                    })
                    .where(eq(leads.id, lead.id));
                }

                await logWorkerActivity(
                  worker,
                  "content_link_sent",
                  lead?.id || null,
                  {
                    contentUrl: contentLink.url,
                    contentType: contentLink.contentType,
                  },
                );

                // TODO: Schedule 24h follow-up to pivot to email capture
              }
            } catch (smsError) {
              console.error(
                `[SignalHouse] ${worker.name} SMS send error:`,
                smsError,
              );
            }
          }

          return NextResponse.json({
            success: true,
            event: "content_link_sent",
            worker: worker.name,
            contentUrl: contentLink?.url,
            flow: "content_permission",
          });
        }

        // ─────────────────────────────────────────────────────────────────────
        // POSITIVE LEAD RESPONSE (not email, not permission)
        // Lead is interested but we need more context
        // ─────────────────────────────────────────────────────────────────────
        if (isPositiveLead) {
          console.log(
            `[SignalHouse] 🎯 POSITIVE RESPONSE from ${fromNumber}: ${messageBody}`,
          );
          console.log(`[SignalHouse] 🤖 ${worker.name} flagging for follow-up`);

          if (lead) {
            await db
              .update(leads)
              .set({
                status: "interested",
                tags: sql`array_append(COALESCE(tags, ARRAY[]::text[]), 'needs_follow_up')`,
                updatedAt: new Date(),
              })
              .where(eq(leads.id, lead.id));
          }

          await logWorkerActivity(
            worker,
            "positive_response",
            lead?.id || null,
            {
              message: messageBody,
            },
          );

          // TODO: Queue for AI response or human review
        }

        return NextResponse.json({
          success: true,
          event: "inbound_sms",
          worker: worker.name,
          workerId: worker.id,
        });
      }

      case "message.sent":
      case "sms.sent":
      case "sent":
      case "message.delivered":
      case "sms.delivered":
      case "delivered":
      case "message.failed":
      case "sms.failed":
      case "failed":
      case "undelivered": {
        // Update existing message status if found by providerMessageId
        if (messageId) {
          const status = normalizedEvent.split(".").pop() as string;
          await db
            .update(smsMessages)
            .set({
              status: status,
              providerStatus: (payload.status as string) || status,
              updatedAt: new Date(),
              deliveredAt: normalizedEvent.includes("delivered")
                ? new Date()
                : undefined,
            })
            .where(eq(smsMessages.providerMessageId, messageId));
        }
        return NextResponse.json({ success: true, event: "status_update" });
      }

      case "number.provisioned":
      case "number.purchased":
      case "number_provisioned":
      case "number_purchased": {
        console.log(
          `[SignalHouse] 📱 Number provisioned: ${payload.from || payload.phone_number}`,
        );
        // TODO: Store in team phone numbers table
        return NextResponse.json({
          success: true,
          event: "number_provisioned",
        });
      }

      case "number.ported":
      case "number_ported": {
        console.log(
          `[SignalHouse] 🔄 Number ported: ${payload.from || payload.phone_number}`,
        );
        return NextResponse.json({ success: true, event: "number_ported" });
      }

      // ─────────────────────────────────────────────────────────────────────
      // BRAND EVENTS - 10DLC Brand Registration
      // ─────────────────────────────────────────────────────────────────────
      case "brand.add":
      case "brand_add": {
        console.log(
          `[SignalHouse] 🏢 Brand added: ${payload.brandId || payload.brand_id}`,
          JSON.stringify(payload, null, 2),
        );
        // Store brand registration status for multi-tenant tracking
        // TODO: Update team's 10DLC brand status in database
        return NextResponse.json({
          success: true,
          event: "brand_add",
          brandId: payload.brandId || payload.brand_id,
        });
      }

      case "brand.delete":
      case "brand_delete": {
        console.log(
          `[SignalHouse] 🗑️ Brand deleted: ${payload.brandId || payload.brand_id}`,
        );
        // TODO: Update team's 10DLC status as inactive
        return NextResponse.json({
          success: true,
          event: "brand_delete",
          brandId: payload.brandId || payload.brand_id,
        });
      }

      // ─────────────────────────────────────────────────────────────────────
      // CAMPAIGN EVENTS - 10DLC Campaign Registration
      // ─────────────────────────────────────────────────────────────────────
      case "campaign.add":
      case "campaign_add": {
        console.log(
          `[SignalHouse] 📢 Campaign registered: ${payload.campaignId || payload.campaign_id}`,
          JSON.stringify(payload, null, 2),
        );
        // Campaign approved by carriers - ready for messaging
        // TODO: Update campaign status to "approved" and enable sending
        return NextResponse.json({
          success: true,
          event: "campaign_add",
          campaignId: payload.campaignId || payload.campaign_id,
          status: payload.status || "active",
        });
      }

      case "campaign.update":
      case "campaign_update": {
        console.log(
          `[SignalHouse] ✏️ Campaign updated: ${payload.campaignId || payload.campaign_id}`,
          JSON.stringify(payload, null, 2),
        );
        // TODO: Sync campaign status changes
        return NextResponse.json({
          success: true,
          event: "campaign_update",
          campaignId: payload.campaignId || payload.campaign_id,
          status: payload.status,
        });
      }

      case "campaign.expired":
      case "campaign_expired": {
        console.log(
          `[SignalHouse] ⏰ Campaign expired: ${payload.campaignId || payload.campaign_id}`,
        );
        // Campaign needs renewal - pause messaging and notify team
        // TODO: Mark campaign as expired, send alert to team
        return NextResponse.json({
          success: true,
          event: "campaign_expired",
          campaignId: payload.campaignId || payload.campaign_id,
        });
      }

      // ─────────────────────────────────────────────────────────────────────
      // MMS EVENTS
      // ─────────────────────────────────────────────────────────────────────
      case "mms.sent":
      case "mms_sent": {
        console.log(`[SignalHouse] 🖼️ MMS sent: ${messageId}`);
        if (messageId) {
          await db
            .update(smsMessages)
            .set({
              status: "sent",
              providerStatus: "mms_sent",
              sentAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(smsMessages.providerMessageId, messageId));
        }
        return NextResponse.json({ success: true, event: "mms_sent" });
      }

      case "mms.received":
      case "mms_received": {
        console.log(`[SignalHouse] 🖼️ MMS received from ${fromNumber}`);
        // Save MMS with media URL
        await db.insert(smsMessages).values({
          id: crypto.randomUUID(),
          leadId: lead?.id,
          direction: "inbound",
          fromNumber,
          toNumber,
          body: messageBody || "[MMS Received]",
          status: "received",
          providerMessageId: messageId,
          campaignId: payload.campaign_id as string,
          receivedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            mediaUrl: payload.media_url || payload.mediaUrl,
            mmsType: payload.content_type || payload.contentType,
          },
        } as any);
        return NextResponse.json({ success: true, event: "mms_received" });
      }

      default:
        console.log(`[SignalHouse] ⚠️ Unhandled event: ${eventType}`, payload);
        return NextResponse.json({
          success: true,
          event: "ignored",
          originalEvent: eventType,
        });
    }
  } catch (error: any) {
    console.error("[SignalHouse Webhook] POST Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
