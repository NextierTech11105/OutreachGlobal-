import { NextRequest, NextResponse } from "next/server";

// Email Capture Automation Flow
// Triggered when email is extracted from SMS conversation
// Flow: Email captured → AI selects content from library → Send email with content + calendar → Confirm via SMS
// Content types: eBooks, 1-pagers, case studies, PDFs (property & B2B)

const SIGNALHOUSE_API_BASE = "https://api.signalhouse.io/api/v1";
const SIGNALHOUSE_API_KEY = process.env.SIGNALHOUSE_API_KEY || "";
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://monkfish-app-mb7h3.ondigitalocean.app";
const CALENDAR_LINK =
  process.env.CALENDAR_LINK || "https://calendly.com/nextier/15min-strategy";
const SPACES_CDN =
  process.env.SPACES_CDN_URL ||
  "https://nextier-assets.nyc3.cdn.digitaloceanspaces.com";

// Email regex pattern
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

// ==============================================
// CONTENT LIBRARY - eBooks, 1-Pagers, Case Studies
// Gianna selects based on lead type and conversation
// ==============================================

interface ContentItem {
  id: string;
  title: string;
  description: string;
  file: string;
  pages?: number;
}

const CONTENT_LIBRARY = {
  // Property/Real Estate Content
  property: {
    ebooks: [
      {
        id: "property-investing-guide",
        title: "The Complete Guide to Property Investing",
        description:
          "Everything you need to know about building wealth through real estate",
        file: "ebooks/property-investing-guide.pdf",
        pages: 24,
      },
      {
        id: "first-time-seller-handbook",
        title: "First-Time Seller's Handbook",
        description:
          "Step-by-step guide to selling your home for maximum value",
        file: "ebooks/first-time-seller-handbook.pdf",
        pages: 18,
      },
      {
        id: "market-timing-secrets",
        title: "Market Timing Secrets",
        description: "When to buy, sell, or hold - data-driven insights",
        file: "ebooks/market-timing-secrets.pdf",
        pages: 16,
      },
    ],
    one_pagers: [
      {
        id: "home-value-checklist",
        title: "Home Value Maximizer Checklist",
        description: "10 quick wins to boost your home's value",
        file: "one-pagers/home-value-checklist.pdf",
      },
      {
        id: "market-trends-snapshot",
        title: "Local Market Trends Snapshot",
        description: "Current market conditions and what they mean for you",
        file: "one-pagers/market-trends-snapshot.pdf",
      },
      {
        id: "selling-timeline",
        title: "Your Selling Timeline",
        description: "Week-by-week guide to selling your property",
        file: "one-pagers/selling-timeline.pdf",
      },
    ],
    case_studies: [
      {
        id: "miami-flip-success",
        title: "Miami Property Flip: 42% ROI in 6 Months",
        description:
          "How we identified and maximized value on a distressed property",
        file: "case-studies/miami-flip-success.pdf",
      },
      {
        id: "multi-family-acquisition",
        title: "Multi-Family Portfolio Building",
        description: "Scaling from 1 to 12 units in 18 months",
        file: "case-studies/multi-family-acquisition.pdf",
      },
    ],
  },

  // B2B/Business Content
  b2b: {
    ebooks: [
      {
        id: "b2b-growth-playbook",
        title: "The B2B Growth Playbook",
        description: "Proven strategies for scaling your business",
        file: "ebooks/b2b-growth-playbook.pdf",
        pages: 32,
      },
      {
        id: "data-enrichment-guide",
        title: "Data Enrichment for Sales Teams",
        description: "How to turn leads into conversations",
        file: "ebooks/data-enrichment-guide.pdf",
        pages: 20,
      },
      {
        id: "outbound-mastery",
        title: "Outbound Sales Mastery",
        description: "Build a predictable revenue machine",
        file: "ebooks/outbound-mastery.pdf",
        pages: 28,
      },
    ],
    one_pagers: [
      {
        id: "enrichment-roi-calculator",
        title: "Data Enrichment ROI Calculator",
        description:
          "See exactly how much better data impacts your bottom line",
        file: "one-pagers/enrichment-roi-calculator.pdf",
      },
      {
        id: "cold-outreach-templates",
        title: "5 Cold Outreach Templates That Work",
        description: "Proven email and SMS templates with 30%+ response rates",
        file: "one-pagers/cold-outreach-templates.pdf",
      },
    ],
    case_studies: [
      {
        id: "saas-growth-story",
        title: "SaaS Company 10x Pipeline Growth",
        description: "How enriched data transformed their outbound",
        file: "case-studies/saas-growth-story.pdf",
      },
      {
        id: "agency-scaling",
        title: "Agency Scaling with Data",
        description: "From 5 to 50 clients using targeted outreach",
        file: "case-studies/agency-scaling.pdf",
      },
    ],
  },

  // General/Universal Content
  general: {
    ebooks: [
      {
        id: "ai-automation-guide",
        title: "AI Automation for Business",
        description: "Leverage AI to work smarter, not harder",
        file: "ebooks/ai-automation-guide.pdf",
        pages: 22,
      },
    ],
    one_pagers: [
      {
        id: "getting-started",
        title: "Getting Started with NEXTIER",
        description: "Your quick start guide to our platform",
        file: "one-pagers/getting-started.pdf",
      },
    ],
    case_studies: [] as ContentItem[],
  },
};

type ContentCategory = "property" | "b2b" | "general";
type ContentType = "ebook" | "one_pager" | "case_study";

interface SelectedContent {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  type: ContentType;
  category: ContentCategory;
}

// AI-powered content selection based on lead context
function selectContentForLead(context: {
  leadType?: "property" | "b2b";
  smsMessage?: string;
  propertyId?: string;
  companyId?: string;
}): SelectedContent {
  const { leadType, smsMessage = "", propertyId, companyId } = context;

  // Determine category
  let category: ContentCategory = "general";
  if (leadType === "property" || propertyId) {
    category = "property";
  } else if (leadType === "b2b" || companyId) {
    category = "b2b";
  } else {
    // Infer from SMS content
    const msgLower = smsMessage.toLowerCase();
    if (
      msgLower.includes("property") ||
      msgLower.includes("home") ||
      msgLower.includes("house") ||
      msgLower.includes("sell") ||
      msgLower.includes("value")
    ) {
      category = "property";
    } else if (
      msgLower.includes("business") ||
      msgLower.includes("company") ||
      msgLower.includes("sales") ||
      msgLower.includes("leads")
    ) {
      category = "b2b";
    }
  }

  // Determine content type based on conversation signals
  let contentTypeKey: "ebooks" | "one_pagers" | "case_studies" = "ebooks";
  let contentType: ContentType = "ebook";
  const msgLower = smsMessage.toLowerCase();

  if (
    msgLower.includes("quick") ||
    msgLower.includes("summary") ||
    msgLower.includes("checklist")
  ) {
    contentTypeKey = "one_pagers";
    contentType = "one_pager";
  } else if (
    msgLower.includes("example") ||
    msgLower.includes("case study") ||
    msgLower.includes("success") ||
    msgLower.includes("results")
  ) {
    contentTypeKey = "case_studies";
    contentType = "case_study";
  }

  // Get content array
  const categoryContent = CONTENT_LIBRARY[category];
  let contentArray = categoryContent[contentTypeKey] as ContentItem[];

  // Fallback to ebooks if no content in selected type
  if (!contentArray || contentArray.length === 0) {
    contentArray = categoryContent.ebooks;
    contentType = "ebook";
  }

  // Select random content (could be smarter with AI)
  const selected =
    contentArray[Math.floor(Math.random() * contentArray.length)];

  return {
    id: selected.id,
    title: selected.title,
    description: selected.description,
    fileUrl: `${SPACES_CDN}/${selected.file}`,
    type: contentType,
    category,
  };
}

// Extract email from message
function extractEmail(message: string): string | null {
  const match = message.match(EMAIL_REGEX);
  return match ? match[0].toLowerCase() : null;
}

// Send SMS via SignalHouse
async function sendSMS(
  to: string,
  from: string,
  message: string,
): Promise<boolean> {
  if (!SIGNALHOUSE_API_KEY) {
    console.error("[Automation] SignalHouse API key not configured");
    return false;
  }

  try {
    const response = await fetch(`${SIGNALHOUSE_API_BASE}/message/sendSMS`, {
      method: "POST",
      headers: {
        "x-api-key": SIGNALHOUSE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to, from, message }),
    });

    return response.ok;
  } catch (error) {
    console.error("[Automation] SMS send failed:", error);
    return false;
  }
}

// Send email via SendGrid
async function sendEmail(params: {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  attachments?: Array<{ content: string; filename: string; type: string }>;
}): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.error("[Automation] SendGrid API key not configured");
    return false;
  }

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: params.to, name: params.toName }],
          },
        ],
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || "gianna@nextier.app",
          name: "Gianna | NexTier",
        },
        subject: params.subject,
        content: [{ type: "text/html", value: params.html }],
        attachments: params.attachments,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("[Automation] Email send failed:", error);
    return false;
  }
}

// Generate email HTML with report link and calendar
function generateEmailHTML(params: {
  firstName: string;
  propertyAddress?: string;
  reportLink?: string;
  calendarLink: string;
}): string {
  const { firstName, propertyAddress, reportLink, calendarLink } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1a365d 0%, #2563eb 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 24px; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 0 10px; }
    .cta-button { display: inline-block; background: #2563eb; color: white !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 10px 5px 10px 0; }
    .cta-button.secondary { background: #059669; }
    .section { margin: 24px 0; padding: 20px; background: #f8fafc; border-radius: 8px; }
    .section h3 { margin-top: 0; color: #1a365d; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px; }
    .ps { background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #f59e0b; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Hey ${firstName},</h1>
  </div>

  <div class="content">
    <p>Great chatting with you! As promised, here's that property analysis we talked about.</p>

    ${
      reportLink
        ? `
    <div class="section">
      <h3>📊 Your Property Report</h3>
      <p>I put together some numbers on <strong>${propertyAddress || "your property"}</strong> - the valuation, market trends, and what I'm seeing in your area.</p>
      <a href="${reportLink}" class="cta-button">View Your Report</a>
    </div>
    `
        : ""
    }

    <div class="section">
      <h3>🗓️ Book Your Strategy Session</h3>
      <p>This is a quick 15-minute call where we dig into what the numbers mean for YOUR situation. No sales pitch, just straight talk about your options.</p>
      <p>Spots fill up fast, so grab a time that works for you.</p>
      <a href="${calendarLink}" class="cta-button secondary">Book Your Call</a>
    </div>

    <p>Talk soon,<br><strong>Gianna</strong><br>NexTier Business Advisors</p>

    <div class="ps">
      <strong>P.S.</strong> - The best time to have this conversation is before you need to make a decision, not after. Just saying. 😉
    </div>
  </div>

  <div class="footer">
    <p>NexTier Business Advisors | AI-Powered Real Estate Intelligence</p>
    <p>Reply to this email or text back anytime.</p>
  </div>
</body>
</html>
  `.trim();
}

// In-memory tracking for automation runs
const automationRuns = new Map<
  string,
  {
    id: string;
    status: "processing" | "completed" | "failed";
    startedAt: string;
    completedAt?: string;
    input: Record<string, unknown>;
    results: Record<string, unknown>;
  }
>();

// POST - Process email capture automation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      smsMessage,
      fromPhone,
      toPhone, // Our Gianna number
      firstName,
      propertyId,
      propertyAddress,
      conversationId,
      leadId,
    } = body;

    // Extract email from SMS message
    const email = body.email || extractEmail(smsMessage || "");

    if (!email) {
      return NextResponse.json(
        { error: "No email found in message", smsMessage },
        { status: 400 },
      );
    }

    if (!fromPhone) {
      return NextResponse.json(
        { error: "fromPhone required" },
        { status: 400 },
      );
    }

    const runId = `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const name = firstName || "there";

    console.log(`[Automation] Starting email capture flow:`, {
      runId,
      email,
      phone: fromPhone,
      property: propertyAddress,
    });

    // Track this run
    automationRuns.set(runId, {
      id: runId,
      status: "processing",
      startedAt: new Date().toISOString(),
      input: { email, fromPhone, propertyAddress },
      results: {},
    });

    const results: Record<string, unknown> = {
      email,
      firstName: name,
    };

    // Step 1: Generate valuation report if we have property info
    let reportLink: string | undefined;
    if (propertyId || propertyAddress) {
      try {
        const reportResponse = await fetch(`${APP_URL}/api/research-library`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "saveReport",
            name: `Valuation Report - ${propertyAddress || propertyId}`,
            category: "valuation_reports",
            report: {
              property: {
                id: propertyId,
                address: { address: propertyAddress },
              },
              generatedFor: { email, phone: fromPhone, firstName: name },
              generatedAt: new Date().toISOString(),
              source: "email_capture_automation",
            },
          }),
        });

        const reportData = await reportResponse.json();
        if (reportData.success && reportData.shareableUrl) {
          reportLink = reportData.shareableUrl;
          results.reportId = reportData.reportId;
          results.reportLink = reportLink;
        }
      } catch (err) {
        console.error("[Automation] Report generation failed:", err);
        results.reportError = "Failed to generate report";
      }
    }

    // Step 2: Send intro email with report + calendar
    const emailSubject = `${name}, your property analysis is ready`;
    const emailHtml = generateEmailHTML({
      firstName: name,
      propertyAddress,
      reportLink,
      calendarLink: CALENDAR_LINK,
    });

    const emailSent = await sendEmail({
      to: email,
      toName: name,
      subject: emailSubject,
      html: emailHtml,
    });

    results.emailSent = emailSent;
    results.emailTo = email;

    // Step 3: Send SMS confirmation
    const confirmationSms = `Perfect ${name}! Just sent your property analysis to ${email}. Check your inbox (and spam folder just in case). When you're ready to talk strategy, my calendar link is in there too. 📧`;

    if (toPhone) {
      const smsSent = await sendSMS(fromPhone, toPhone, confirmationSms);
      results.confirmationSmsSent = smsSent;
    }

    // Step 4: Log to schedule system for tracking
    try {
      await fetch(`${APP_URL}/api/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "email",
          scheduledFor: new Date().toISOString(), // Already sent
          recipient: {
            name,
            phone: fromPhone,
            email,
            propertyAddress,
          },
          content: {
            subject: emailSubject,
            message: "Valuation report + calendar link sent via automation",
            template: "email_with_report_and_calendar",
          },
          createdBy: "gianna_automation",
        }),
      });
      results.scheduledLogged = true;
    } catch (err) {
      console.error("[Automation] Schedule logging failed:", err);
    }

    // Update run status
    const run = automationRuns.get(runId)!;
    run.status = emailSent ? "completed" : "failed";
    run.completedAt = new Date().toISOString();
    run.results = results;

    console.log(`[Automation] Email capture flow completed:`, {
      runId,
      status: run.status,
      emailSent,
      reportGenerated: !!reportLink,
    });

    return NextResponse.json({
      success: true,
      runId,
      email,
      firstName: name,
      results: {
        emailSent,
        reportGenerated: !!reportLink,
        reportLink,
        confirmationSmsSent: results.confirmationSmsSent,
        calendarLink: CALENDAR_LINK,
      },
    });
  } catch (error) {
    console.error("[Automation] Email capture error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Automation failed" },
      { status: 500 },
    );
  }
}

// GET - Check automation status or list recent runs
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const runId = searchParams.get("runId");
  const limit = parseInt(searchParams.get("limit") || "20");

  // Get specific run
  if (runId) {
    const run = automationRuns.get(runId);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, run });
  }

  // List recent runs
  const runs = Array.from(automationRuns.values())
    .sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    )
    .slice(0, limit);

  const stats = {
    total: automationRuns.size,
    completed: runs.filter((r) => r.status === "completed").length,
    failed: runs.filter((r) => r.status === "failed").length,
    processing: runs.filter((r) => r.status === "processing").length,
  };

  return NextResponse.json({
    success: true,
    runs: runs.map((r) => ({
      id: r.id,
      status: r.status,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
      email: (r.input as Record<string, string>).email,
    })),
    stats,
  });
}
