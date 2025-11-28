import type { SendMailOptions as MailerSendMailOptions } from "@haorama/nestjs-mailer";

export interface SendMailOptions extends MailerSendMailOptions {
  now?: boolean;
}
