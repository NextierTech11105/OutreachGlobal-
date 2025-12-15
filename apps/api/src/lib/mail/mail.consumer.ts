import { Job } from "bullmq";
import { WorkerHost, Processor, OnWorkerEvent } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";
import sgMail from "@sendgrid/mail";
import { SendMailOptions } from "./mail.type";

@Processor("mail", { concurrency: 5 })
export class MailConsumer extends WorkerHost {
  constructor(private configService: ConfigService) {
    super();
    const apiKey = this.configService.get<string>("SENDGRID_API_KEY");
    if (apiKey) {
      sgMail.setApiKey(apiKey);
    }
  }

  async process(job: Job<SendMailOptions>) {
    const options = job.data;
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

    await sgMail.send(msg);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job, error: any) {
    console.error(
      "Failed to send email:",
      error?.response?.body || error.message,
    );
  }
}
