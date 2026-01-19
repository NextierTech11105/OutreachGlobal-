import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { Logger } from "@/lib/logger";

/**
 * CONTACT FORM API
 * ═══════════════════════════════════════════════════════════════════════════
 * POST /api/contact - Handle contact form submissions
 * ═══════════════════════════════════════════════════════════════════════════
 */

const CONTACT_EMAIL = process.env.CONTACT_EMAIL || "hello@nextier.io";
const SALES_EMAIL = process.env.SALES_EMAIL || "sales@nextier.io";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@nextier.io";
const BILLING_EMAIL = process.env.BILLING_EMAIL || "billing@nextier.io";
const PRIVACY_EMAIL = process.env.PRIVACY_EMAIL || "privacy@nextier.io";

interface ContactFormData {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  reason: string;
  message: string;
}

function getRecipientEmail(reason: string): string {
  switch (reason) {
    case "sales":
      return SALES_EMAIL;
    case "support":
      return SUPPORT_EMAIL;
    case "billing":
      return BILLING_EMAIL;
    case "privacy":
      return PRIVACY_EMAIL;
    default:
      return CONTACT_EMAIL;
  }
}

function getSubject(reason: string, name: string): string {
  const reasonMap: Record<string, string> = {
    sales: "Sales Inquiry",
    support: "Support Request",
    billing: "Billing Question",
    partnership: "Partnership Opportunity",
    privacy: "Privacy Request",
    other: "Contact Form",
  };
  return `[${reasonMap[reason] || "Contact"}] New message from ${name}`;
}

export async function POST(request: NextRequest) {
  try {
    const body: ContactFormData = await request.json();
    const { name, email, company, phone, reason, message } = body;

    // Validate required fields
    if (!name || !email || !reason || !message) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, reason, message" },
        { status: 400 },
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 },
      );
    }

    const recipientEmail = getRecipientEmail(reason);
    const subject = getSubject(reason, name);

    // Build email HTML
    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
    .field { margin-bottom: 15px; }
    .label { font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase; }
    .value { margin-top: 5px; }
    .message-box { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-top: 20px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">New Contact Form Submission</h2>
      <p style="margin: 5px 0 0; color: #666;">From Nextier Website</p>
    </div>

    <div class="field">
      <div class="label">Name</div>
      <div class="value">${name}</div>
    </div>

    <div class="field">
      <div class="label">Email</div>
      <div class="value"><a href="mailto:${email}">${email}</a></div>
    </div>

    ${
      company
        ? `
    <div class="field">
      <div class="label">Company</div>
      <div class="value">${company}</div>
    </div>
    `
        : ""
    }

    ${
      phone
        ? `
    <div class="field">
      <div class="label">Phone</div>
      <div class="value"><a href="tel:${phone}">${phone}</a></div>
    </div>
    `
        : ""
    }

    <div class="field">
      <div class="label">Reason</div>
      <div class="value">${reason}</div>
    </div>

    <div class="message-box">
      <div class="label">Message</div>
      <div class="value" style="white-space: pre-wrap;">${message}</div>
    </div>

    <div class="footer">
      <p>This message was sent from the Nextier contact form.</p>
      <p>Reply directly to this email to respond to the sender.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Send email to team
    const result = await sendEmail({
      to: recipientEmail,
      subject,
      html,
      replyTo: email,
    });

    if (!result.success) {
      Logger.error("Contact", "Failed to send contact email", {
        error: result.error,
        to: recipientEmail,
      });
      return NextResponse.json(
        {
          error:
            "Failed to send message. Please try again or email us directly.",
        },
        { status: 500 },
      );
    }

    // Send confirmation email to user
    const confirmationHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0; }
    .logo { font-size: 24px; font-weight: bold; color: #000; }
    .content { padding: 30px 0; }
    .footer { padding: 20px 0; border-top: 1px solid #f0f0f0; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Nextier</div>
    </div>
    <div class="content">
      <h1>Thanks for reaching out, ${name}!</h1>
      <p>We've received your message and our team will get back to you within 24 hours.</p>
      <p>In the meantime, here's a copy of what you sent us:</p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="white-space: pre-wrap;">${message}</p>
      </div>
      <p>If you have any urgent questions, feel free to:</p>
      <ul>
        <li>Call us at <a href="tel:+15164079249">+1 (516) 407-9249</a></li>
        <li>Book a call at <a href="https://calendly.com/tb-outreachglobal/15min">calendly.com/tb-outreachglobal</a></li>
      </ul>
      <p>Best regards,<br>The Nextier Team</p>
    </div>
    <div class="footer">
      <p>Nextier Inc. | <a href="https://nextier.io">nextier.io</a></p>
    </div>
  </div>
</body>
</html>
    `.trim();

    await sendEmail({
      to: email,
      subject: "We received your message - Nextier",
      html: confirmationHtml,
    });

    Logger.info("Contact", "Contact form submitted", {
      name,
      email,
      reason,
      recipientEmail,
    });

    return NextResponse.json({
      success: true,
      message: "Your message has been sent. We'll get back to you soon!",
    });
  } catch (error) {
    Logger.error("Contact", "Error processing contact form", { error });
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ready",
    endpoints: {
      POST: "Submit contact form with { name, email, reason, message }",
    },
    reasons: ["sales", "support", "billing", "partnership", "privacy", "other"],
  });
}
