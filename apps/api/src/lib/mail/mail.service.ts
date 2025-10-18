import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { MailerService } from "@haorama/nestjs-mailer";
import { JobsOptions, Queue } from "bullmq";
import { SendMailOptions } from "./mail.type";
import { ConfigService } from "@nestjs/config";

/**
 * This mail service by default send an email in the background using Bull queue
 */
@Injectable()
export class MailService {
  constructor(
    @InjectQueue("mail") private mailQueue: Queue,
    private mailerService: MailerService,
    private configService: ConfigService,
  ) {}

  send(options: SendMailOptions, jobOptions?: JobsOptions) {
    const defaultOptions: SendMailOptions = {
      from: {
        name: this.configService.get("MAIL_FROM_NAME") as string,
        address: this.configService.get("MAIL_FROM_ADDRESS") as string,
      },
      ...options,
    };

    if (options.now) {
      return this.mailerService.send(defaultOptions);
    }

    return this.mailQueue.add("send", defaultOptions, jobOptions);
  }
}
