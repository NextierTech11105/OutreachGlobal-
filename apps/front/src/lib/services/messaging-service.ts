import { twilio } from "./twilio-service";

export interface MessageTemplate {
  id: string;
  name: string;
  type: "email" | "sms" | "voice";
  subject?: string;
  body?: string;
  voiceScript?: string;
  smsText?: string;
}

export interface CadenceStep {
  messageId: string;
  delay: number;
  delayUnit: "hours" | "days";
}

export interface CampaignMessaging {
  templates: MessageTemplate[];
  cadence: CadenceStep[];
}

export interface SendMessageParams {
  templateId: string;
  contactId: string;
  variables: Record<string, string>;
}

class MessagingService {
  async sendEmail(
    params: SendMessageParams,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Get contact email from contactId
      const contactEmail = await this.getContactEmail(params.contactId);
      if (!contactEmail) {
        return { success: false, error: "Contact has no email address" };
      }

      // Get message template
      const template = await this.getMessageTemplate(params.templateId);
      if (!template) {
        return { success: false, error: "Invalid email template" };
      }

      // If it's a SendGrid template (starts with d-)
      if (template.id.startsWith("d-")) {
        // Import the sendgrid service
        const { sendgridService } = await import("./sendgrid-service");

        // Send email via SendGrid template
        return sendgridService.sendTemplateEmail(
          contactEmail,
          template.id,
          params.variables,
          {
            subject: template.subject,
            categories: [template.type],
          },
        );
      } else {
        // For non-SendGrid templates, use the existing implementation
        // Replace variables in template
        const subject = this.replaceVariables(
          template.subject || "",
          params.variables,
        );
        const body = this.replaceVariables(
          template.body || "",
          params.variables,
        );

        // Implementation would connect to your email service
        console.log("Sending email with params:", {
          to: contactEmail,
          subject,
          body,
        });

        return { success: true, messageId: `email_${Date.now()}` };
      }
    } catch (error) {
      console.error("Error sending email:", error);
      return { success: false, error: "Failed to send email" };
    }
  }

  async sendSMS(
    params: SendMessageParams,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Get contact phone number from contactId
      const phoneNumber = await this.getContactPhoneNumber(params.contactId);
      if (!phoneNumber) {
        return { success: false, error: "Contact has no phone number" };
      }

      // Get message template
      const template = await this.getMessageTemplate(params.templateId);
      if (!template || !template.smsText) {
        return { success: false, error: "Invalid SMS template" };
      }

      // Replace variables in template
      const messageText = this.replaceVariables(
        template.smsText,
        params.variables,
      );

      // Send SMS via Twilio
      const message = await twilio.messages.create({
        body: messageText,
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER || "",
      });

      return { success: true, messageId: message.sid };
    } catch (error) {
      console.error("Error sending SMS:", error);
      return { success: false, error: "Failed to send SMS" };
    }
  }

  async initiateVoiceCall(
    params: SendMessageParams,
  ): Promise<{ success: boolean; callId?: string; error?: string }> {
    try {
      // Get contact phone number from contactId
      const phoneNumber = await this.getContactPhoneNumber(params.contactId);
      if (!phoneNumber) {
        return { success: false, error: "Contact has no phone number" };
      }

      // Get message template
      const template = await this.getMessageTemplate(params.templateId);
      if (!template || !template.voiceScript) {
        return { success: false, error: "Invalid voice template" };
      }

      // Replace variables in template
      const scriptText = this.replaceVariables(
        template.voiceScript,
        params.variables,
      );

      // Store the script in a database or cache for the TwiML endpoint to access
      await this.storeVoiceScript(params.contactId, scriptText);

      // Initiate call via Twilio
      const call = await twilio.calls.create({
        url: `${process.env.BASE_URL}/api/twilio/twiml?contactId=${params.contactId}`,
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER || "",
      });

      return { success: true, callId: call.sid };
    } catch (error) {
      console.error("Error initiating voice call:", error);
      return { success: false, error: "Failed to initiate voice call" };
    }
  }

  private async getContactPhoneNumber(
    contactId: string,
  ): Promise<string | null> {
    // Implementation would fetch contact details from your database
    // This is a placeholder
    return "+15551234567";
  }

  private async getMessageTemplate(
    templateId: string,
  ): Promise<MessageTemplate | null> {
    // Implementation would fetch template from your database
    // This is a placeholder
    return {
      id: templateId,
      name: "Sample Template",
      type: "sms",
      smsText: "Hello {{first_name}}, this is a sample message.",
    };
  }

  private replaceVariables(
    text: string,
    variables: Record<string, string>,
  ): string {
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
    }
    return result;
  }

  private async storeVoiceScript(
    contactId: string,
    script: string,
  ): Promise<void> {
    // Implementation would store the script in your database or cache
    // This is a placeholder
    console.log(`Storing voice script for contact ${contactId}:`, script);
  }

  async scheduleCadence(
    campaignId: string,
    contactIds: string[],
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Implementation would schedule messages according to the cadence
      // This is a placeholder
      console.log(
        `Scheduling cadence for campaign ${campaignId} to ${contactIds.length} contacts`,
      );
      return { success: true };
    } catch (error) {
      console.error("Error scheduling cadence:", error);
      return { success: false, error: "Failed to schedule cadence" };
    }
  }

  private async getContactEmail(contactId: string): Promise<string | null> {
    // Implementation would fetch contact details from your database
    // This is a placeholder
    return "contact@example.com";
  }
}

export const messagingService = new MessagingService();
