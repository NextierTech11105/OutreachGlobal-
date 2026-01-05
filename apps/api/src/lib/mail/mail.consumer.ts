import { Job } from "bullmq";
import { WorkerHost, Processor, OnWorkerEvent } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";
import sgMail from "@sendgrid/mail";
import { SendMailOptions } from "./mail.type";
import { DeadLetterQueueService } from "@/lib/dlq";
// NOTE: Mail consumer is a system-level utility for sending emails.
// It doesn't require tenant validation as emails can be sent for system purposes.

const MAIL_QUEUE = "mail";

@Processor(MAIL_QUEUE, { concurrency: 5, lockDuration: 30000 })
export class MailConsumer extends WorkerHost {
  private readonly logger = new Logger(MailConsumer.name);

  constructor(
    private configService: ConfigService,
    private dlqService: DeadLetterQueueService,
  ) {
    super();
    const apiKey = this.configService.get<string>("SENDGRID_API_KEY");
    if (apiKey) {
      sgMail.setApiKey(apiKey);
    }
  }

  async process(job: Job<SendMailOptions>) {
    this.logger.log(`[${MAIL_QUEUE}] Processing mail job ${job.id}`);

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
  async onFailed(job: Job, error: Error) {
    const errorMessage = (error as any)?.response?.body || error.message;
    this.logger.error(
      `Failed to send email to ${job.data?.to}: ${errorMessage}`,
      error.stack,
    );
    await this.dlqService.recordBullMQFailure(MAIL_QUEUE, job, error);
  }
}
