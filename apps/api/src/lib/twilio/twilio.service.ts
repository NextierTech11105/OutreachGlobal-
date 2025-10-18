import { BadRequestException, Injectable } from "@nestjs/common";
import Twilio from "twilio";
import {
  MakeCallOptions,
  SendSmsOptions,
  TwilioCreateClientOptions,
  TwilioCreateVoiceGrantOptions,
} from "./twilio.type";

@Injectable()
export class TwilioService {
  createClient(options: TwilioCreateClientOptions) {
    if (!options.accountSid || !options.authToken) {
      throw new BadRequestException("account sid and auth token is required");
    }

    const client = Twilio(options.accountSid, options.authToken);

    return client;
  }

  async testConnection(options: TwilioCreateClientOptions) {
    const client = this.createClient(options);
    await client.incomingPhoneNumbers.list({
      limit: 1,
    });

    return true;
  }

  async sendSms({ to, body, from, accountSid, authToken }: SendSmsOptions) {
    const client = this.createClient({ accountSid, authToken });

    await client.messages.create({
      body,
      from: from || "",
      to,
    });
  }

  async makeCall({ to, from, words, accountSid, authToken }: MakeCallOptions) {
    const client = this.createClient({ accountSid, authToken });

    await client.calls.create({
      to,
      from: from || "",
      twiml: this.createVoiceResponse(words),
    });
  }

  protected createVoiceResponse(
    words: string,
    voice?: "man" | "woman",
  ): string {
    const response = new Twilio.twiml.VoiceResponse();

    response.say({ voice }, words);

    return response.toString();
  }

  createVoiceGrant({
    accountSid,
    apiKey,
    apiSecret,
    twiMLAppSid,
    identity,
  }: TwilioCreateVoiceGrantOptions) {
    if (!accountSid || !apiKey || !apiSecret || !twiMLAppSid) {
      throw new BadRequestException(
        "account sid, api key or api secret is required",
      );
    }

    const AccessToken = Twilio.jwt.AccessToken;
    const VoiceGrant = Twilio.jwt.AccessToken.VoiceGrant;

    const token = new AccessToken(accountSid, apiKey, apiSecret, {
      identity,
    });

    token.addGrant(
      new VoiceGrant({
        outgoingApplicationSid: twiMLAppSid,
        incomingAllow: true,
      }),
    );

    return token.toJwt();
  }
}
