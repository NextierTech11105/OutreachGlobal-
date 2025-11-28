import { MailDataRequired } from "@sendgrid/mail";

export interface SendgridSendEmailOptions {
  apiKey?: string | null;
  data: MailDataRequired | MailDataRequired[];
}
