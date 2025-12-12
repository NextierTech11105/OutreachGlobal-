import { NextRequest, NextResponse } from "next/server";

// Email Queue System
// Manages queued emails with scheduling, templates, and tracking

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "gianna@nextier.app";
const FROM_NAME = "Gianna | NexTier";

interface QueuedEmail {
  id: string;
  status: "pending" | "processing" | "sent" | "failed" | "cancelled";
  scheduledFor: string;
  createdAt: string;
  sentAt?: string;
  to: {
    email: string;
    name?: string;
  };
  content: {
    subject: string;
    html?: string;
    text?: string;
    template?: string;
    templateData?: Record<string, unknown>;
  };
  metadata?: {
    leadId?: string;
    propertyId?: string;
    conversationId?: string;
    automationRunId?: string;
    source?: string;
  };
  result?: {
    messageId?: string;
    error?: string;
  };
}

// In-memory queue (would use Redis/DB in production)
const emailQueue = new Map<string, QueuedEmail>();

// Email templates
const EMAIL_TEMPLATES: Record<
  string,
  { subject: string; html: (data: Record<string, unknown>) => string }
> = {
  valuation_report: {
    subject: "{firstName}, your property analysis is ready",
    html: (data) => `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1>Hey ${data.firstName || "there"},</h1>
        <p>Here's your property analysis for <strong>${data.propertyAddress || "your property"}</strong>.</p>
        ${data.reportLink ? `<p><a href="${data.reportLink}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Your Report</a></p>` : ""}
        <p>When you're ready, book your free strategy session:</p>
        <p><a href="${data.calendarLink || "https://calendly.com/nextier/15min"}" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Book 15-Min Call</a></p>
        <p>Talk soon,<br><strong>Gianna</strong><br>NexTier Business Advisors</p>
      </div>
    `,
  },
  follow_up_1: {
    subject: "Did you get a chance to look?",
    html: (data) => `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <p>Hey ${data.firstName || "there"},</p>
        <p>Just wanted to make sure you got that property analysis I sent over. Any questions come up?</p>
        ${data.reportLink ? `<p><a href="${data.reportLink}">View Report Again</a></p>` : ""}
        <p>Also, my calendar is still open if you want to hop on a quick call: <a href="${data.calendarLink || "https://calendly.com/nextier/15min"}">Book Here</a></p>
        <p>- Gianna</p>
      </div>
    `,
  },
  appointment_confirmation: {
    subject: "We're on for {date}!",
    html: (data) => `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1>${data.firstName}, we're all set!</h1>
        <p><strong>When:</strong> ${data.date} at ${data.time}</p>
        <p><strong>What we'll cover:</strong></p>
        <ul>
          <li>Your specific situation</li>
          <li>How AI applies to YOUR business</li>
          <li>Clear next steps</li>
        </ul>
        <p>Come ready to think big.</p>
        <p>Talk soon,<br><strong>Gianna</strong></p>
      </div>
    `,
  },
};

// Send email via SendGrid
async function sendEmailNow(
  email: QueuedEmail,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!SENDGRID_API_KEY) {
    return { success: false, error: "SendGrid API key not configured" };
  }

  try {
    // Build HTML content
    let htmlContent = email.content.html;
    let subject = email.content.subject;

    // Use template if specified
    if (email.content.template && EMAIL_TEMPLATES[email.content.template]) {
      const template = EMAIL_TEMPLATES[email.content.template];
      htmlContent = template.html(email.content.templateData || {});
      subject = template.subject;

      // Replace placeholders in subject
      if (email.content.templateData) {
        Object.entries(email.content.templateData).forEach(([key, value]) => {
          subject = subject.replace(`{${key}}`, String(value));
        });
      }
    }

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: email.to.email, name: email.to.name }],
          },
        ],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject,
        content: [
          ...(email.content.text
            ? [{ type: "text/plain", value: email.content.text }]
            : []),
          ...(htmlContent ? [{ type: "text/html", value: htmlContent }] : []),
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `SendGrid error: ${response.status} - ${errorText}`,
      };
    }

    // SendGrid returns message ID in header
    const messageId =
      response.headers.get("X-Message-Id") || `msg-${Date.now()}`;
    return { success: true, messageId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Process pending emails in queue
async function processQueue(): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  const now = new Date();
  const stats = { processed: 0, sent: 0, failed: 0 };

  for (const [id, email] of emailQueue) {
    if (email.status !== "pending") continue;

    const scheduledFor = new Date(email.scheduledFor);
    if (scheduledFor > now) continue; // Not yet time

    stats.processed++;
    email.status = "processing";
    emailQueue.set(id, email);

    const result = await sendEmailNow(email);

    email.result = result;
    email.status = result.success ? "sent" : "failed";
    if (result.success) {
      email.sentAt = new Date().toISOString();
      stats.sent++;
    } else {
      stats.failed++;
    }

    emailQueue.set(id, email);
    console.log(`[Email Queue] ${id}: ${email.status}`, result);
  }

  return stats;
}

// POST - Add email to queue
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      to,
      toName,
      subject,
      html,
      text,
      template,
      templateData,
      scheduledFor,
      sendNow,
      metadata,
    } = body;

    // Validate required fields
    if (!to) {
      return NextResponse.json({ error: "to email required" }, { status: 400 });
    }

    if (!subject && !template) {
      return NextResponse.json(
        { error: "subject or template required" },
        { status: 400 },
      );
    }

    const id = `email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const email: QueuedEmail = {
      id,
      status: "pending",
      scheduledFor: scheduledFor || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      to: { email: to, name: toName },
      content: {
        subject: subject || "",
        html,
        text,
        template,
        templateData,
      },
      metadata,
    };

    // Send immediately if requested
    if (sendNow) {
      const result = await sendEmailNow(email);
      email.status = result.success ? "sent" : "failed";
      email.result = result;
      if (result.success) {
        email.sentAt = new Date().toISOString();
      }
      emailQueue.set(id, email);

      return NextResponse.json({
        success: result.success,
        id,
        status: email.status,
        messageId: result.messageId,
        error: result.error,
      });
    }

    // Otherwise add to queue
    emailQueue.set(id, email);

    console.log(
      `[Email Queue] Added: ${id} scheduled for ${email.scheduledFor}`,
    );

    return NextResponse.json({
      success: true,
      id,
      status: email.status,
      scheduledFor: email.scheduledFor,
    });
  } catch (error) {
    console.error("[Email Queue] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to queue email",
      },
      { status: 500 },
    );
  }
}

// GET - List queue or get specific email
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "50");
  const process = searchParams.get("process") === "true";

  // Process queue if requested
  if (process) {
    const stats = await processQueue();
    return NextResponse.json({ success: true, ...stats });
  }

  // Get specific email
  if (id) {
    const email = emailQueue.get(id);
    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, email });
  }

  // List emails
  let emails = Array.from(emailQueue.values());

  if (status) {
    emails = emails.filter((e) => e.status === status);
  }

  // Sort by scheduled time
  emails.sort(
    (a, b) =>
      new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime(),
  );
  emails = emails.slice(0, limit);

  // Stats
  const all = Array.from(emailQueue.values());
  const stats = {
    total: all.length,
    pending: all.filter((e) => e.status === "pending").length,
    sent: all.filter((e) => e.status === "sent").length,
    failed: all.filter((e) => e.status === "failed").length,
  };

  return NextResponse.json({
    success: true,
    count: emails.length,
    stats,
    emails: emails.map((e) => ({
      id: e.id,
      status: e.status,
      to: e.to.email,
      subject: e.content.subject || e.content.template,
      scheduledFor: e.scheduledFor,
      sentAt: e.sentAt,
    })),
  });
}

// PUT - Update queued email
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, scheduledFor, content } = body;

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const email = emailQueue.get(id);
    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    // Cancel
    if (action === "cancel") {
      if (email.status !== "pending") {
        return NextResponse.json(
          { error: "Can only cancel pending emails" },
          { status: 400 },
        );
      }
      email.status = "cancelled";
      emailQueue.set(id, email);
      return NextResponse.json({ success: true, id, status: email.status });
    }

    // Retry failed
    if (action === "retry") {
      if (email.status !== "failed") {
        return NextResponse.json(
          { error: "Can only retry failed emails" },
          { status: 400 },
        );
      }
      email.status = "pending";
      email.scheduledFor = new Date().toISOString();
      email.result = undefined;
      emailQueue.set(id, email);
      return NextResponse.json({ success: true, id, status: email.status });
    }

    // Update schedule
    if (scheduledFor && email.status === "pending") {
      email.scheduledFor = scheduledFor;
    }

    // Update content
    if (content && email.status === "pending") {
      email.content = { ...email.content, ...content };
    }

    emailQueue.set(id, email);

    return NextResponse.json({
      success: true,
      id,
      status: email.status,
      scheduledFor: email.scheduledFor,
    });
  } catch (error) {
    console.error("[Email Queue] Update error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE - Remove from queue
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const email = emailQueue.get(id);
  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  emailQueue.delete(id);

  return NextResponse.json({ success: true, deleted: id });
}
