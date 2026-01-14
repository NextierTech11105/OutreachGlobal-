import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { JobsOptions, Queue } from "bullmq";
import { ConfigService } from "@nestjs/config";
import sgMail from "@sendgrid/mail";
import { SendMailOptions } from "./mail.type";

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @InjectQueue("mail") private mailQueue: Queue,
    private configService: ConfigService,
  ) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>("SENDGRID_API_KEY");
    if (apiKey) {
      sgMail.setApiKey(apiKey);
    } else {
      this.logger.warn("SENDGRID_API_KEY not set - email sending will fail");
    }
  }

  async sendNow(options: SendMailOptions) {
    const fromEmail =
      this.configService.get<string>("SENDGRID_FROM_EMAIL") ||
      "noreply@outreachglobal.io";
    const fromName =
      this.configService.get<string>("SENDGRID_FROM_NAME") || "Outreach Global";

    const msg = {
      to: options.to,
      from: options.from
        ? { email: options.from.email, name: options.from.name }
        : { email: fromEmail, name: fromName },
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ""),
      ...(options.replyTo && { replyTo: options.replyTo }),
    };

    try {
      const response = await sgMail.send(msg);
      return {
        success: true,
        messageId: response[0]?.headers?.["x-message-id"],
      };
    } catch (error: any) {
      this.logger.error(
        `SendGrid error: ${JSON.stringify(error?.response?.body || error.message)}`,
      );
      throw error;
    }
  }

  send(options: SendMailOptions, jobOptions?: JobsOptions) {
    if (options.now) {
      return this.sendNow(options);
    }
    return this.mailQueue.add("send", options, jobOptions);
  }

  // Convenience methods for common emails
  async sendInvite(
    email: string,
    inviterName: string,
    teamName: string,
    inviteUrl: string,
  ) {
    return this.send({
      to: email,
      subject: `${inviterName} invited you to join ${teamName} on Outreach Global`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h1 style="margin: 0 0 24px; font-size: 24px; color: #18181b;">You're invited!</h1>
            <p style="margin: 0 0 16px; color: #3f3f46; line-height: 1.6;">
              <strong>${inviterName}</strong> has invited you to join <strong>${teamName}</strong> on Outreach Global.
            </p>
            <p style="margin: 0 0 32px; color: #71717a; line-height: 1.6;">
              Click the button below to accept the invitation and get started.
            </p>
            <a href="${inviteUrl}" style="display: inline-block; background: #18181b; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
              Accept Invitation
            </a>
            <p style="margin: 32px 0 0; font-size: 13px; color: #a1a1aa;">
              If you didn't expect this invitation, you can ignore this email.
            </p>
          </div>
        </body>
        </html>
      `,
      now: true,
    });
  }

  async sendPasswordReset(email: string, resetUrl: string) {
    return this.send({
      to: email,
      subject: "Reset your Outreach Global password",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h1 style="margin: 0 0 24px; font-size: 24px; color: #18181b;">Reset your password</h1>
            <p style="margin: 0 0 16px; color: #3f3f46; line-height: 1.6;">
              We received a request to reset your password. Click the button below to choose a new one.
            </p>
            <p style="margin: 0 0 32px; color: #71717a; line-height: 1.6;">
              This link expires in 1 hour.
            </p>
            <a href="${resetUrl}" style="display: inline-block; background: #18181b; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
              Reset Password
            </a>
            <p style="margin: 32px 0 0; font-size: 13px; color: #a1a1aa;">
              If you didn't request this, you can ignore this email.
            </p>
          </div>
        </body>
        </html>
      `,
      now: true,
    });
  }

  async sendWelcome(email: string, name: string) {
    return this.send({
      to: email,
      subject: "Welcome to Outreach Global!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h1 style="margin: 0 0 24px; font-size: 24px; color: #18181b;">Welcome, ${name}!</h1>
            <p style="margin: 0 0 16px; color: #3f3f46; line-height: 1.6;">
              Thanks for joining Outreach Global. We're excited to have you on board.
            </p>
            <p style="margin: 0 0 32px; color: #71717a; line-height: 1.6;">
              Get started by importing your leads and setting up your first campaign.
            </p>
            <a href="https://outreachglobal.io/dashboard" style="display: inline-block; background: #18181b; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
              Go to Dashboard
            </a>
          </div>
        </body>
        </html>
      `,
      now: true,
    });
  }
}
