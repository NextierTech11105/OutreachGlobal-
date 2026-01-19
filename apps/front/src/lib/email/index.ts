/**
 * Email Service - Transactional email system
 * Uses Nodemailer with support for SMTP, Resend, or other providers
 */

import nodemailer from "nodemailer";
import { APP_NAME, COMPANY_NAME } from "@/config/branding";
import { CALENDLY_CONFIG } from "@/config/constants";
import { Logger } from "@/lib/logger";

// ============================================================================
// TYPES
// ============================================================================

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================================================
// EMAIL TRANSPORT
// ============================================================================

function getTransport() {
  // Resend support via SMTP
  if (process.env.RESEND_API_KEY) {
    return nodemailer.createTransport({
      host: "smtp.resend.com",
      port: 465,
      secure: true,
      auth: {
        user: "resend",
        pass: process.env.RESEND_API_KEY,
      },
    });
  }

  // Generic SMTP
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Development: use ethereal (fake email for testing)
  if (process.env.NODE_ENV === "development") {
    Logger.warn("Email", "No email config found, using preview mode");
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      auth: {
        user: "test@ethereal.email",
        pass: "test",
      },
    });
  }

  throw new Error(
    "No email transport configured. Set RESEND_API_KEY or SMTP_* env vars.",
  );
}

// ============================================================================
// SEND EMAIL
// ============================================================================

export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    const transport = getTransport();
    const fromEmail = process.env.EMAIL_FROM || `noreply@nextier.io`;
    const fromName = process.env.EMAIL_FROM_NAME || APP_NAME;

    const result = await transport.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html),
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
      attachments: options.attachments,
    });

    Logger.info("Email", `Sent email to ${options.to}`, {
      messageId: result.messageId,
    });

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    Logger.error("Email", "Failed to send email", { error, to: options.to });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

const baseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0; }
  .logo { font-size: 24px; font-weight: bold; color: #000; }
  .content { padding: 30px 0; }
  .button { display: inline-block; padding: 14px 28px; background: #000; color: #fff !important; text-decoration: none; border-radius: 6px; font-weight: 600; }
  .footer { padding: 20px 0; border-top: 1px solid #f0f0f0; text-align: center; font-size: 12px; color: #666; }
  .highlight { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
  .code { font-family: monospace; background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-size: 14px; }
  h1, h2 { color: #000; }
  a { color: #000; }
`;

function wrapInTemplate(content: string, previewText?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${previewText ? `<meta name="x-apple-disable-message-reformatting"><!--[if !mso]><!--><style>${baseStyles}</style><!--<![endif]-->` : ""}
  <style>${baseStyles}</style>
</head>
<body>
  ${previewText ? `<div style="display:none;max-height:0;overflow:hidden;">${previewText}</div>` : ""}
  <div class="container">
    <div class="header">
      <div class="logo">${APP_NAME}</div>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>${COMPANY_NAME} | <a href="https://nextier.io">nextier.io</a></p>
      <p>You received this email because you signed up for ${APP_NAME}.</p>
      <p><a href="https://nextier.io/unsubscribe">Unsubscribe</a> | <a href="https://nextier.io/privacy">Privacy Policy</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// ============================================================================
// PRE-BUILT EMAIL TEMPLATES
// ============================================================================

export const EmailTemplates = {
  /**
   * Welcome email sent after signup
   */
  welcome: (data: { name: string; email: string }) => ({
    subject: `Welcome to ${APP_NAME} - Let's Get Started!`,
    html: wrapInTemplate(
      `
      <h1>Welcome to ${APP_NAME}, ${data.name}!</h1>
      <p>We're excited to have you on board. ${APP_NAME} is your AI-powered sales development platform that helps you find leads, engage prospects, and close more deals.</p>

      <div class="highlight">
        <h2>What's Next?</h2>
        <ol>
          <li><strong>Complete your profile</strong> - Add your business details</li>
          <li><strong>Import your first leads</strong> - Upload a CSV or connect a data source</li>
          <li><strong>Set up your AI SDR</strong> - Configure Gianna to handle outreach</li>
          <li><strong>Launch your first campaign</strong> - Start generating conversations</li>
        </ol>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="https://nextier.io/dashboard" class="button">Go to Dashboard</a>
      </p>

      <p>Need help getting started? Book a free onboarding call with our team:</p>
      <p style="text-align: center;">
        <a href="${CALENDLY_CONFIG.meetingTypes["15min"].url}" class="button" style="background: #666;">Book Onboarding Call</a>
      </p>

      <p>If you have any questions, just reply to this email - we're here to help!</p>

      <p>Best,<br>The ${APP_NAME} Team</p>
      `,
      `Welcome to ${APP_NAME}! Your AI sales development platform is ready.`,
    ),
  }),

  /**
   * API key delivery email
   */
  apiKeyDelivery: (data: { name: string; apiKey: string; plan: string }) => ({
    subject: `Your ${APP_NAME} API Key is Ready`,
    html: wrapInTemplate(
      `
      <h1>Your API Key is Ready!</h1>
      <p>Hi ${data.name},</p>
      <p>Great news! Your ${APP_NAME} account has been activated on the <strong>${data.plan}</strong> plan. Here's your API key:</p>

      <div class="highlight" style="text-align: center;">
        <p style="margin-bottom: 10px; font-weight: 600;">Your API Key</p>
        <p class="code" style="word-break: break-all; font-size: 16px;">${data.apiKey}</p>
      </div>

      <p><strong>Important:</strong> Keep this key secure. Don't share it publicly or commit it to version control.</p>

      <h2>Quick Start</h2>
      <div class="highlight">
        <p>Use your API key in the Authorization header:</p>
        <pre style="background: #1a1a1a; color: #fff; padding: 15px; border-radius: 6px; overflow-x: auto;">
curl -X GET "https://api.nextier.io/v1/leads" \\
  -H "Authorization: Bearer ${data.apiKey.substring(0, 8)}..."
        </pre>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="https://nextier.io/docs/api" class="button">View API Documentation</a>
      </p>

      <p>Questions? Our support team is ready to help at <a href="mailto:support@nextier.io">support@nextier.io</a></p>

      <p>Happy building!<br>The ${APP_NAME} Team</p>
      `,
      `Your ${APP_NAME} API key is ready! Start building now.`,
    ),
  }),

  /**
   * Payment receipt email
   */
  paymentReceipt: (data: {
    name: string;
    amount: number;
    plan: string;
    invoiceId: string;
    date: string;
    nextBillingDate?: string;
  }) => ({
    subject: `Payment Receipt - ${APP_NAME}`,
    html: wrapInTemplate(
      `
      <h1>Payment Received</h1>
      <p>Hi ${data.name},</p>
      <p>Thank you for your payment. Here's your receipt:</p>

      <div class="highlight">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Invoice #</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">${data.invoiceId}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Date</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">${data.date}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Plan</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">${data.plan}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0;"><strong>Amount Paid</strong></td>
            <td style="padding: 10px 0; text-align: right; font-size: 18px; font-weight: bold;">$${data.amount.toFixed(2)}</td>
          </tr>
        </table>
      </div>

      ${data.nextBillingDate ? `<p>Your next billing date is <strong>${data.nextBillingDate}</strong>.</p>` : ""}

      <p style="text-align: center; margin: 30px 0;">
        <a href="https://nextier.io/settings/billing" class="button">View Billing History</a>
      </p>

      <p>Questions about your bill? Contact us at <a href="mailto:billing@nextier.io">billing@nextier.io</a></p>

      <p>Thank you for choosing ${APP_NAME}!</p>
      `,
      `Payment receipt for ${APP_NAME} - $${data.amount.toFixed(2)}`,
    ),
  }),

  /**
   * Trial expiration warning (7 days before)
   */
  trialExpiringWarning: (data: {
    name: string;
    daysLeft: number;
    plan: string;
  }) => ({
    subject: `Your ${APP_NAME} Trial Ends in ${data.daysLeft} Days`,
    html: wrapInTemplate(
      `
      <h1>Your Trial is Ending Soon</h1>
      <p>Hi ${data.name},</p>
      <p>Just a heads up - your ${APP_NAME} free trial ends in <strong>${data.daysLeft} days</strong>.</p>

      <div class="highlight">
        <h2>Don't Lose Access To:</h2>
        <ul>
          <li>AI-powered lead enrichment</li>
          <li>Automated SMS & email campaigns</li>
          <li>Your saved leads and campaign data</li>
          <li>Gianna, your AI SDR assistant</li>
        </ul>
      </div>

      <p>Upgrade now to continue using ${APP_NAME} without interruption:</p>

      <p style="text-align: center; margin: 30px 0;">
        <a href="https://nextier.io/settings/billing/upgrade" class="button">Upgrade to ${data.plan}</a>
      </p>

      <p>Have questions about which plan is right for you? <a href="${CALENDLY_CONFIG.meetingTypes["15min"].url}">Book a quick call</a> with our team.</p>

      <p>Best,<br>The ${APP_NAME} Team</p>
      `,
      `Your ${APP_NAME} trial ends in ${data.daysLeft} days. Upgrade now to keep access.`,
    ),
  }),

  /**
   * Trial expired email
   */
  trialExpired: (data: { name: string }) => ({
    subject: `Your ${APP_NAME} Trial Has Ended`,
    html: wrapInTemplate(
      `
      <h1>Your Trial Has Ended</h1>
      <p>Hi ${data.name},</p>
      <p>Your ${APP_NAME} free trial has expired. Your account is now on a limited free tier with restricted access.</p>

      <div class="highlight">
        <h2>What Happens Now?</h2>
        <ul>
          <li>Your data is safe - nothing has been deleted</li>
          <li>You can still log in and view your dashboard</li>
          <li>Active campaigns have been paused</li>
          <li>Upgrade anytime to restore full access</li>
        </ul>
      </div>

      <p>Ready to continue growing your business? Pick up right where you left off:</p>

      <p style="text-align: center; margin: 30px 0;">
        <a href="https://nextier.io/pricing" class="button">View Plans & Pricing</a>
      </p>

      <p>We'd hate to see you go. If there's anything we can do to help, just reply to this email.</p>

      <p>Best,<br>The ${APP_NAME} Team</p>
      `,
      `Your ${APP_NAME} trial has ended. Upgrade to restore access.`,
    ),
  }),

  /**
   * Payment failed email
   */
  paymentFailed: (data: {
    name: string;
    amount: number;
    retryDate: string;
  }) => ({
    subject: `Action Required: Payment Failed - ${APP_NAME}`,
    html: wrapInTemplate(
      `
      <h1>Payment Failed</h1>
      <p>Hi ${data.name},</p>
      <p>We weren't able to process your payment of <strong>$${data.amount.toFixed(2)}</strong> for your ${APP_NAME} subscription.</p>

      <div class="highlight" style="background: #fff3f3; border: 1px solid #ffcccc;">
        <p><strong>What to do:</strong></p>
        <ol>
          <li>Check that your card details are up to date</li>
          <li>Ensure sufficient funds are available</li>
          <li>Contact your bank if the issue persists</li>
        </ol>
      </div>

      <p>We'll automatically retry the payment on <strong>${data.retryDate}</strong>. To avoid service interruption, please update your payment method:</p>

      <p style="text-align: center; margin: 30px 0;">
        <a href="https://nextier.io/settings/billing/payment-method" class="button">Update Payment Method</a>
      </p>

      <p>If you have any questions or need assistance, please contact us at <a href="mailto:billing@nextier.io">billing@nextier.io</a></p>

      <p>Thank you,<br>The ${APP_NAME} Team</p>
      `,
      `Action required: Your ${APP_NAME} payment failed. Please update your payment method.`,
    ),
  }),

  /**
   * Subscription cancelled confirmation
   */
  subscriptionCancelled: (data: { name: string; endDate: string }) => ({
    subject: `Your ${APP_NAME} Subscription Has Been Cancelled`,
    html: wrapInTemplate(
      `
      <h1>Subscription Cancelled</h1>
      <p>Hi ${data.name},</p>
      <p>We're sorry to see you go. Your ${APP_NAME} subscription has been cancelled.</p>

      <div class="highlight">
        <p><strong>Important:</strong> You'll still have access to ${APP_NAME} until <strong>${data.endDate}</strong>.</p>
        <p>After that date:</p>
        <ul>
          <li>Your account will switch to the free tier</li>
          <li>Your data will be retained for 90 days</li>
          <li>You can reactivate anytime</li>
        </ul>
      </div>

      <p>Changed your mind? You can reactivate your subscription anytime before ${data.endDate}:</p>

      <p style="text-align: center; margin: 30px 0;">
        <a href="https://nextier.io/settings/billing/reactivate" class="button">Reactivate Subscription</a>
      </p>

      <p>We'd love to know what we could have done better. <a href="https://nextier.io/feedback">Share your feedback</a></p>

      <p>Best,<br>The ${APP_NAME} Team</p>
      `,
      `Your ${APP_NAME} subscription has been cancelled. Access continues until ${data.endDate}.`,
    ),
  }),

  /**
   * Password reset email
   */
  passwordReset: (data: {
    name: string;
    resetLink: string;
    expiresIn: string;
  }) => ({
    subject: `Reset Your ${APP_NAME} Password`,
    html: wrapInTemplate(
      `
      <h1>Password Reset Request</h1>
      <p>Hi ${data.name},</p>
      <p>We received a request to reset your ${APP_NAME} password. Click the button below to create a new password:</p>

      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.resetLink}" class="button">Reset Password</a>
      </p>

      <p><strong>This link will expire in ${data.expiresIn}.</strong></p>

      <div class="highlight" style="background: #fff3f3;">
        <p><strong>Didn't request this?</strong></p>
        <p>If you didn't request a password reset, you can safely ignore this email. Your password won't be changed.</p>
      </div>

      <p>For security, this request was received from: [IP Address]</p>

      <p>Best,<br>The ${APP_NAME} Team</p>
      `,
      `Reset your ${APP_NAME} password. Link expires in ${data.expiresIn}.`,
    ),
  }),

  /**
   * Team invitation email
   */
  teamInvitation: (data: {
    inviterName: string;
    teamName: string;
    inviteLink: string;
    role: string;
  }) => ({
    subject: `${data.inviterName} invited you to join ${data.teamName} on ${APP_NAME}`,
    html: wrapInTemplate(
      `
      <h1>You're Invited!</h1>
      <p>${data.inviterName} has invited you to join <strong>${data.teamName}</strong> on ${APP_NAME} as a <strong>${data.role}</strong>.</p>

      <div class="highlight">
        <h2>About ${APP_NAME}</h2>
        <p>${APP_NAME} is an AI-powered sales development platform that helps teams find leads, automate outreach, and close more deals.</p>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.inviteLink}" class="button">Accept Invitation</a>
      </p>

      <p>This invitation will expire in 7 days.</p>

      <p>Questions? Contact ${data.inviterName} or reply to this email.</p>

      <p>Best,<br>The ${APP_NAME} Team</p>
      `,
      `${data.inviterName} invited you to join ${data.teamName} on ${APP_NAME}`,
    ),
  }),
};

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export async function sendWelcomeEmail(to: string, name: string) {
  const template = EmailTemplates.welcome({ name, email: to });
  return sendEmail({ to, ...template });
}

export async function sendApiKeyEmail(
  to: string,
  name: string,
  apiKey: string,
  plan: string,
) {
  const template = EmailTemplates.apiKeyDelivery({ name, apiKey, plan });
  return sendEmail({ to, ...template });
}

export async function sendPaymentReceiptEmail(
  to: string,
  data: {
    name: string;
    amount: number;
    plan: string;
    invoiceId: string;
    date: string;
    nextBillingDate?: string;
  },
) {
  const template = EmailTemplates.paymentReceipt(data);
  return sendEmail({ to, ...template });
}

export async function sendTrialExpiringEmail(
  to: string,
  name: string,
  daysLeft: number,
  plan: string,
) {
  const template = EmailTemplates.trialExpiringWarning({
    name,
    daysLeft,
    plan,
  });
  return sendEmail({ to, ...template });
}

export async function sendTrialExpiredEmail(to: string, name: string) {
  const template = EmailTemplates.trialExpired({ name });
  return sendEmail({ to, ...template });
}

export async function sendPaymentFailedEmail(
  to: string,
  name: string,
  amount: number,
  retryDate: string,
) {
  const template = EmailTemplates.paymentFailed({ name, amount, retryDate });
  return sendEmail({ to, ...template });
}

export async function sendCancellationEmail(
  to: string,
  name: string,
  endDate: string,
) {
  const template = EmailTemplates.subscriptionCancelled({ name, endDate });
  return sendEmail({ to, ...template });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetLink: string,
  expiresIn: string = "1 hour",
) {
  const template = EmailTemplates.passwordReset({ name, resetLink, expiresIn });
  return sendEmail({ to, ...template });
}

export async function sendTeamInvitationEmail(
  to: string,
  data: {
    inviterName: string;
    teamName: string;
    inviteLink: string;
    role: string;
  },
) {
  const template = EmailTemplates.teamInvitation(data);
  return sendEmail({ to, ...template });
}
