/**
 * GMAIL SERVICE
 *
 * Sends emails via Gmail SMTP using nodemailer.
 * Supports tb@outreachglobal.io and fm@outreachglobal.io
 *
 * Prerequisites:
 * - GMAIL_USER: tb@outreachglobal.io (or fm@outreachglobal.io)
 * - GMAIL_APP_PASSWORD: 16-char app password from Google
 * - GMAIL_NAME: Display name (optional)
 */

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string; // Override sender
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }>;
  headers?: Record<string, string>;
  tags?: string[]; // For tracking
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  accepted?: string[];
  rejected?: string[];
  error?: string;
}

export interface TemplateEmailOptions extends Omit<EmailOptions, "html" | "text"> {
  templateId: string;
  variables: Record<string, string>;
}

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

const EMAIL_TEMPLATES: Record<string, { subject: string; html: string }> = {
  property_valuation: {
    subject: "Your Property Valuation for {{address}}",
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1a365d; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f7f7f7; }
    .cta { display: inline-block; background: #3182ce; color: white; padding: 12px 24px;
           text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { padding: 20px; font-size: 12px; color: #666; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Property Valuation Ready</h1>
    </div>
    <div class="content">
      <p>Hi {{firstName}},</p>
      <p>Your property valuation for <strong>{{address}}</strong> is ready!</p>
      <p>We've analyzed comparable sales, market trends, and property characteristics to provide
         you with an accurate estimate.</p>
      <p style="text-align: center;">
        <a href="{{link}}" class="cta">View Your Valuation</a>
      </p>
      <p>If you have any questions or would like to discuss your property's value,
         feel free to reply to this email or call us.</p>
      <p>Best regards,<br>The Nextier Team</p>
    </div>
    <div class="footer">
      <p>Nextier | {{companyAddress}}</p>
      <p><a href="{{unsubscribeLink}}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`,
  },

  business_evaluation: {
    subject: "Business Evaluation Complete - {{companyName}}",
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2d3748; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f7f7f7; }
    .cta { display: inline-block; background: #48bb78; color: white; padding: 12px 24px;
           text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { padding: 20px; font-size: 12px; color: #666; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Business Evaluation Ready</h1>
    </div>
    <div class="content">
      <p>Hi {{firstName}},</p>
      <p>Your business evaluation for <strong>{{companyName}}</strong> is complete!</p>
      <p>Our analysis includes industry benchmarks, financial metrics, and growth potential assessment.</p>
      <p style="text-align: center;">
        <a href="{{link}}" class="cta">View Full Report</a>
      </p>
      <p>Ready to discuss your business's potential? Schedule a call with our team.</p>
      <p>Best regards,<br>The Nextier Team</p>
    </div>
    <div class="footer">
      <p>Nextier | {{companyAddress}}</p>
      <p><a href="{{unsubscribeLink}}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`,
  },

  follow_up: {
    subject: "Following up - {{subject}}",
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <p>Hi {{firstName}},</p>
    <p>{{message}}</p>
    <p>Best regards,<br>{{senderName}}</p>
  </div>
</body>
</html>`,
  },

  appointment_reminder: {
    subject: "Reminder: Your appointment on {{date}}",
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #805ad5; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f7f7f7; }
    .cta { display: inline-block; background: #805ad5; color: white; padding: 12px 24px;
           text-decoration: none; border-radius: 4px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Appointment Reminder</h1>
    </div>
    <div class="content">
      <p>Hi {{firstName}},</p>
      <p>This is a friendly reminder about your upcoming appointment:</p>
      <p><strong>Date:</strong> {{date}}<br>
         <strong>Time:</strong> {{time}}<br>
         <strong>With:</strong> {{agentName}}</p>
      <p style="text-align: center;">
        <a href="{{meetingLink}}" class="cta">Join Meeting</a>
      </p>
      <p>If you need to reschedule, please let us know.</p>
    </div>
  </div>
</body>
</html>`,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// GMAIL SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class GmailService {
  private static instance: GmailService;
  private transporter: Transporter | null = null;
  private initialized = false;

  private constructor() {
    this.initialize();
  }

  private initialize(): void {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPassword) {
      console.warn("[GmailService] Gmail credentials not configured");
      console.warn("  Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables");
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser,
          pass: gmailPassword,
        },
      });

      this.initialized = true;
      console.log(`[GmailService] Initialized with ${gmailUser}`);
    } catch (error) {
      console.error("[GmailService] Failed to initialize:", error);
    }
  }

  public static getInstance(): GmailService {
    if (!GmailService.instance) {
      GmailService.instance = new GmailService();
    }
    return GmailService.instance;
  }

  public isConfigured(): boolean {
    return this.initialized && this.transporter !== null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SEND EMAIL
  // ─────────────────────────────────────────────────────────────────────────

  public async sendEmail(options: EmailOptions): Promise<EmailResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: "Gmail not configured - set GMAIL_USER and GMAIL_APP_PASSWORD",
      };
    }

    const gmailUser = process.env.GMAIL_USER!;
    const gmailName = process.env.GMAIL_NAME || "Nextier";

    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: options.from || `"${gmailName}" <${gmailUser}>`,
        to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments,
        headers: {
          ...options.headers,
          "X-Mailer": "Nextier-GmailService",
          ...(options.tags
            ? { "X-Tags": options.tags.join(", ") }
            : {}),
        },
      };

      const info = await this.transporter!.sendMail(mailOptions);

      console.log(`[GmailService] Email sent: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
        accepted: info.accepted as string[],
        rejected: info.rejected as string[],
      };
    } catch (error) {
      console.error("[GmailService] Send error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Email send failed",
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SEND TEMPLATE EMAIL
  // ─────────────────────────────────────────────────────────────────────────

  public async sendTemplateEmail(options: TemplateEmailOptions): Promise<EmailResult> {
    const template = EMAIL_TEMPLATES[options.templateId];

    if (!template) {
      return {
        success: false,
        error: `Template not found: ${options.templateId}`,
      };
    }

    // Render template with variables
    let html = template.html;
    let subject = template.subject;

    for (const [key, value] of Object.entries(options.variables)) {
      const regex = new RegExp(`{{${key}}}`, "gi");
      html = html.replace(regex, value || "");
      subject = subject.replace(regex, value || "");
    }

    return this.sendEmail({
      ...options,
      subject,
      html,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SEND PROPERTY VALUATION
  // ─────────────────────────────────────────────────────────────────────────

  public async sendPropertyValuation(params: {
    to: string;
    firstName: string;
    address: string;
    valuationLink: string;
    unsubscribeLink?: string;
  }): Promise<EmailResult> {
    return this.sendTemplateEmail({
      to: params.to,
      templateId: "property_valuation",
      variables: {
        firstName: params.firstName,
        address: params.address,
        link: params.valuationLink,
        companyAddress: "Outreach Global",
        unsubscribeLink: params.unsubscribeLink || "#",
      },
      tags: ["valuation", "property"],
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SEND BUSINESS EVALUATION
  // ─────────────────────────────────────────────────────────────────────────

  public async sendBusinessEvaluation(params: {
    to: string;
    firstName: string;
    companyName: string;
    evaluationLink: string;
    unsubscribeLink?: string;
  }): Promise<EmailResult> {
    return this.sendTemplateEmail({
      to: params.to,
      templateId: "business_evaluation",
      variables: {
        firstName: params.firstName,
        companyName: params.companyName,
        link: params.evaluationLink,
        companyAddress: "Outreach Global",
        unsubscribeLink: params.unsubscribeLink || "#",
      },
      tags: ["evaluation", "business"],
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SEND APPOINTMENT REMINDER
  // ─────────────────────────────────────────────────────────────────────────

  public async sendAppointmentReminder(params: {
    to: string;
    firstName: string;
    date: string;
    time: string;
    agentName: string;
    meetingLink: string;
  }): Promise<EmailResult> {
    return this.sendTemplateEmail({
      to: params.to,
      templateId: "appointment_reminder",
      variables: {
        firstName: params.firstName,
        date: params.date,
        time: params.time,
        agentName: params.agentName,
        meetingLink: params.meetingLink,
      },
      tags: ["reminder", "appointment"],
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VERIFY CONNECTION
  // ─────────────────────────────────────────────────────────────────────────

  public async verifyConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.transporter) {
      return { success: false, error: "Transporter not initialized" };
    }

    try {
      await this.transporter.verify();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Verification failed",
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LIST TEMPLATES
  // ─────────────────────────────────────────────────────────────────────────

  public listTemplates(): Array<{ id: string; subject: string }> {
    return Object.entries(EMAIL_TEMPLATES).map(([id, template]) => ({
      id,
      subject: template.subject,
    }));
  }
}

// Export singleton instance
export const gmailService = GmailService.getInstance();
