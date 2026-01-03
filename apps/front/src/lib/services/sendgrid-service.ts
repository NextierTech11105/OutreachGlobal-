import {
  getSenderByPurpose,
  getLeadGenSender,
  DEFAULT_SENDERS,
  EMAIL_CATEGORIES,
  type SenderProfile,
} from "./email-sender-config";

interface SendEmailParams {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
  categories?: string[];
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
    disposition: string;
  }>;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  sendAt?: number;
  batchId?: string;
  // New: specify sender purpose or override from address
  senderPurpose?: SenderProfile["purpose"];
  fromEmail?: string;
  fromName?: string;
}

interface SendgridConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  sandboxMode?: boolean;
  ipPool?: string;
  trackingSettings?: {
    clickTracking?: {
      enable?: boolean;
      enableText?: boolean;
    };
    openTracking?: {
      enable?: boolean;
    };
    subscriptionTracking?: {
      enable?: boolean;
    };
  };
}

class SendgridService {
  private config: SendgridConfig = {
    apiKey: process.env.SENDGRID_API_KEY || "",
    fromEmail: process.env.SENDGRID_FROM_EMAIL || "",
    fromName: process.env.SENDGRID_FROM_NAME || "",
  };

  async sendEmail(
    params: SendEmailParams,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Determine sender based on purpose or explicit override
      let fromEmail = params.fromEmail || this.config.fromEmail;
      let fromName = params.fromName || this.config.fromName;
      let replyTo = params.replyTo;

      // If sender purpose specified, use the configured sender profile
      if (params.senderPurpose) {
        const sender = getSenderByPurpose(params.senderPurpose);
        if (sender && sender.isActive) {
          fromEmail = sender.email;
          fromName = sender.name;
          replyTo = sender.replyTo || sender.email;
        }
      }

      // This would be implemented with the actual SendGrid SDK
      // For now, we'll just log the parameters
      console.log("Sending email with SendGrid:", {
        from: {
          email: fromEmail,
          name: fromName,
        },
        replyTo,
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
        templateId: params.templateId,
        dynamicTemplateData: params.dynamicTemplateData,
        categories: params.categories,
      });

      // Simulate a successful response
      return {
        success: true,
        messageId: `sendgrid_${Date.now()}`,
      };
    } catch (error) {
      console.error("Error sending email with SendGrid:", error);
      return {
        success: false,
        error: "Failed to send email",
      };
    }
  }

  /**
   * Send lead generation follow-up email from tb@outreachglobal.io
   */
  async sendLeadFollowUp(
    to: string,
    subject: string,
    body: string,
    options: Partial<SendEmailParams> = {},
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const sender = getLeadGenSender();
    return this.sendEmail({
      to,
      subject,
      html: body,
      senderPurpose: "lead_generation",
      categories: EMAIL_CATEGORIES.lead_generation,
      replyTo: sender.replyTo,
      ...options,
    });
  }

  /**
   * Send inbox reply using lead generation sender
   */
  async sendInboxReply(
    to: string,
    subject: string,
    body: string,
    inReplyTo?: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const sender = DEFAULT_SENDERS.inbox_reply;
    console.log(`[SendGrid] Sending inbox reply from ${sender.email} to ${to}`);
    return this.sendEmail({
      to,
      subject,
      html: body,
      fromEmail: sender.email,
      fromName: sender.name,
      replyTo: sender.replyTo,
      categories: ["inbox-reply", ...EMAIL_CATEGORIES.lead_generation],
    });
  }

  async sendTemplateEmail(
    to: string | string[],
    templateId: string,
    dynamicTemplateData: Record<string, any>,
    options: Partial<SendEmailParams> = {},
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendEmail({
      to,
      templateId,
      dynamicTemplateData,
      ...options,
      subject: options.subject || "", // SendGrid doesn't require subject when using templates
    });
  }

  async sendBulkEmails(
    recipients: Array<{ to: string; dynamicTemplateData: Record<string, any> }>,
    templateId: string,
    options: Partial<SendEmailParams> = {},
  ): Promise<{ success: boolean; messageIds?: string[]; errors?: string[] }> {
    try {
      // This would be implemented with the actual SendGrid SDK for batch sending
      // For now, we'll just log the parameters
      console.log("Sending bulk emails with SendGrid:", {
        templateId,
        recipientCount: recipients.length,
        options,
      });

      // Simulate a successful response
      return {
        success: true,
        messageIds: recipients.map(
          (_, index) => `sendgrid_batch_${Date.now()}_${index}`,
        ),
      };
    } catch (error) {
      console.error("Error sending bulk emails with SendGrid:", error);
      return {
        success: false,
        errors: ["Failed to send bulk emails"],
      };
    }
  }

  async getTemplates(): Promise<{ id: string; name: string; type: string }[]> {
    try {
      // This would be implemented with the actual SendGrid SDK
      // For now, we'll return mock data
      return [
        {
          id: "d-f3ecde774a7641b88f3d0d7a16377963",
          name: "Welcome Email",
          type: "transactional",
        },
        {
          id: "d-12c7e580ffe84d3b95d7c3b4b9a9f8e7",
          name: "Lead Nurture - Day 1",
          type: "marketing",
        },
        {
          id: "d-456e789a123b456c789d123e456f789g",
          name: "Lead Nurture - Day 3",
          type: "marketing",
        },
        {
          id: "d-789a123b456c789d123e456f789g123h",
          name: "Lead Nurture - Day 7",
          type: "marketing",
        },
        {
          id: "d-a123b456c789d123e456f789g123h456",
          name: "Property Alert",
          type: "transactional",
        },
      ];
    } catch (error) {
      console.error("Error getting SendGrid templates:", error);
      return [];
    }
  }

  async verifyApiKey(): Promise<boolean> {
    try {
      // This would be implemented with the actual SendGrid SDK
      // For now, we'll just return true
      return true;
    } catch (error) {
      console.error("Error verifying SendGrid API key:", error);
      return false;
    }
  }

  updateConfig(newConfig: Partial<SendgridConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
  }
}

export const sendgridService = new SendgridService();
