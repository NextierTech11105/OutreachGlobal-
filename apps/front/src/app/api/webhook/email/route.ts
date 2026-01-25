import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, inboxItems, smsMessages } from "@/lib/db/schema";
import { eq, or, ilike } from "drizzle-orm";

/**
 * EMAIL WEBHOOK - Agnostic Inbound Email Handler
 * ═══════════════════════════════════════════════════════════════════════════════
 * Receives emails from Gmail, Outlook, etc. via Zapier/Make.com/Google Pub/Sub
 *
 * Connect via:
 * - Zapier: Email trigger → Webhooks by Zapier → POST to this endpoint
 * - Make.com: Gmail/Outlook → HTTP Module → POST to this endpoint
 * - Google Pub/Sub: Gmail API push notifications
 *
 * Endpoint: POST /api/webhook/email?token=YOUR_SECRET_TOKEN
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const WEBHOOK_SECRET = process.env.EMAIL_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET || "email-webhook-secret";
const AUTO_REPLY_DELAY_MS = 5 * 60 * 1000; // 5 minutes - realistic delay

interface EmailPayload {
  // Standard fields (Zapier/Make format)
  from?: string;
  fromEmail?: string;
  from_email?: string;
  sender?: string;
  to?: string;
  toEmail?: string;
  to_email?: string;
  recipient?: string;
  subject?: string;
  body?: string;
  bodyPlain?: string;
  body_plain?: string;
  text?: string;
  html?: string;
  bodyHtml?: string;
  body_html?: string;
  timestamp?: string;
  date?: string;
  messageId?: string;
  message_id?: string;
  threadId?: string;
  thread_id?: string;
  // Gmail-specific
  historyId?: string;
  labelIds?: string[];
  // Attachment info
  hasAttachments?: boolean;
  attachmentCount?: number;
}

// Verify webhook token
function verifyToken(request: NextRequest): boolean {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return false;

  // Timing-safe comparison
  if (token.length !== WEBHOOK_SECRET.length) return false;
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ WEBHOOK_SECRET.charCodeAt(i);
  }
  return result === 0;
}

// Extract email address from various formats
function extractEmail(value: string | undefined): string | null {
  if (!value) return null;

  // Handle "Name <email@domain.com>" format
  const match = value.match(/<([^>]+)>/);
  if (match) return match[1].toLowerCase();

  // Handle plain email
  if (value.includes("@")) return value.trim().toLowerCase();

  return null;
}

// Clean email body (remove signatures, quoted text)
function cleanBody(body: string | undefined): string {
  if (!body) return "";

  // Remove common signature patterns
  let cleaned = body
    .replace(/--\s*\n[\s\S]*/g, "") // -- signature
    .replace(/On .* wrote:[\s\S]*/gi, "") // On X wrote:
    .replace(/From:[\s\S]*/gi, "") // From: header in body
    .replace(/-{3,}[\s\S]*/g, "") // --- dividers
    .trim();

  // Limit length
  if (cleaned.length > 1000) {
    cleaned = cleaned.substring(0, 1000) + "...";
  }

  return cleaned;
}

export async function POST(request: NextRequest) {
  // Verify webhook token
  if (!verifyToken(request)) {
    console.warn("[Email Webhook] Invalid or missing token");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload: EmailPayload = await request.json();

    // Extract normalized fields
    const fromEmail = extractEmail(
      payload.from || payload.fromEmail || payload.from_email || payload.sender
    );
    const toEmail = extractEmail(
      payload.to || payload.toEmail || payload.to_email || payload.recipient
    );
    const subject = payload.subject || "(No Subject)";
    const body = cleanBody(
      payload.body || payload.bodyPlain || payload.body_plain || payload.text || ""
    );
    const timestamp = payload.timestamp || payload.date || new Date().toISOString();
    const messageId = payload.messageId || payload.message_id || `email_${Date.now()}`;
    const threadId = payload.threadId || payload.thread_id;

    console.log("[Email Webhook] Received email:", {
      from: fromEmail,
      to: toEmail,
      subject,
      bodyLength: body.length,
      timestamp,
    });

    if (!fromEmail) {
      return NextResponse.json(
        { error: "Missing sender email address" },
        { status: 400 }
      );
    }

    // Find lead by email address
    const lead = await db.query.leads.findFirst({
      where: or(
        ilike(leads.email, fromEmail),
        ilike(leads.email, `%${fromEmail}%`)
      ),
    });

    let leadId = lead?.id;
    let teamId = lead?.teamId;

    // Log the email regardless of lead match
    const inboxItemId = `inb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    if (lead) {
      // Create inbox item for this email
      await db.insert(inboxItems).values({
        id: inboxItemId,
        teamId: lead.teamId,
        leadId: lead.id,
        channel: "email",
        direction: "inbound",
        content: body,
        subject,
        senderEmail: fromEmail,
        recipientEmail: toEmail,
        externalId: messageId,
        threadId,
        status: "unread",
        priority: detectPriority(subject, body),
        metadata: {
          source: "email_webhook",
          hasAttachments: payload.hasAttachments,
          attachmentCount: payload.attachmentCount,
        },
        createdAt: new Date(timestamp),
      } as any);

      // Update lead's last contact
      await db
        .update(leads)
        .set({
          lastContactedAt: new Date(timestamp),
          status: "responded",
          updatedAt: new Date(),
        })
        .where(eq(leads.id, lead.id));

      console.log("[Email Webhook] Created inbox item for lead:", lead.id);

      // Schedule auto-reply (5 min delay for realism)
      // In production, this would go to a queue like BullMQ
      // For now, we just log the intent
      console.log(`[Email Webhook] Auto-reply scheduled in ${AUTO_REPLY_DELAY_MS / 1000}s for lead:`, lead.id);

    } else {
      console.log("[Email Webhook] No lead found for email:", fromEmail);
    }

    return NextResponse.json({
      success: true,
      message: lead ? "Email logged to inbox" : "Email received (no matching lead)",
      leadId,
      teamId,
      inboxItemId: lead ? inboxItemId : null,
    });

  } catch (error) {
    console.error("[Email Webhook] Error:", error);
    return NextResponse.json(
      { error: "Failed to process email" },
      { status: 500 }
    );
  }
}

// GET - Health check and webhook info
export async function GET(request: NextRequest) {
  // Verify token for security
  if (!verifyToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    status: "ok",
    endpoint: "/api/webhook/email",
    method: "POST",
    description: "Agnostic email webhook for Gmail, Outlook, etc.",
    expectedPayload: {
      from: "sender@example.com",
      to: "tb@outreachglobal.io",
      subject: "Re: Your message",
      body: "Email content here...",
      timestamp: "2024-01-24T10:30:00Z",
    },
    integrations: [
      "Zapier: Email → Webhooks by Zapier",
      "Make.com: Gmail → HTTP Module",
      "Google Pub/Sub: Gmail API push",
    ],
  });
}

// Detect email priority based on content
function detectPriority(subject: string, body: string): "high" | "medium" | "low" {
  const text = `${subject} ${body}`.toLowerCase();

  // High priority keywords
  if (
    text.includes("interested") ||
    text.includes("yes") ||
    text.includes("call me") ||
    text.includes("urgent") ||
    text.includes("asap") ||
    text.includes("schedule") ||
    text.includes("meeting") ||
    text.includes("buy") ||
    text.includes("sell")
  ) {
    return "high";
  }

  // Low priority keywords
  if (
    text.includes("unsubscribe") ||
    text.includes("stop") ||
    text.includes("remove") ||
    text.includes("not interested") ||
    text.includes("no thanks")
  ) {
    return "low";
  }

  return "medium";
}
