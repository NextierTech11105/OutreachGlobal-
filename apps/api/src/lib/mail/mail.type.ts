import type { MailDataRequired } from "@sendgrid/mail";

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: {
    name: string;
    email: string;
  };
  replyTo?: string;
  now?: boolean;
}

export type SendGridMailData = MailDataRequired;
