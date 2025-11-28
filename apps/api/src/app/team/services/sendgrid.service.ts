import { BadRequestException, Injectable } from "@nestjs/common";
import sgMail from "@sendgrid/mail";
import { SendgridSendEmailOptions } from "../types/sendgrid.type";

@Injectable()
export class SendgridService {
  setApiKey(apiKey?: string | null) {
    if (!apiKey) {
      throw new BadRequestException("No API key provided");
    }

    sgMail.setApiKey(apiKey);
    return sgMail;
  }

  async send(options: SendgridSendEmailOptions) {
    const service = this.setApiKey(options.apiKey);
    try {
      const wow = await service.send(options.data);
      return wow;
    } catch (error) {
      throw new BadRequestException(error);
    }
  }
}
