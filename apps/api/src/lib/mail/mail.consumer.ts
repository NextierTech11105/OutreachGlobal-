import { MailerService, SendMailOptions } from "@haorama/nestjs-mailer";
import { Job } from "bullmq";
import { WorkerHost, Processor, OnWorkerEvent } from "@nestjs/bullmq";

@Processor("mail", { concurrency: 5 })
export class MailConsumer extends WorkerHost {
  constructor(private mailerService: MailerService) {
    super();
  }

  async process(job: Job<SendMailOptions>) {
    await this.mailerService.send(job.data);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job, error: any) {
    console.log("failed to send email", error);
  }
}
