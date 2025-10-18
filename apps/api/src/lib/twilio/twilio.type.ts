export interface TwilioCreateClientOptions {
  accountSid?: string | null;
  authToken?: string | null;
}

export interface MakeCallOptions extends TwilioCreateClientOptions {
  to: string;
  words: string;
  from?: string;
}

export interface SendSmsOptions extends TwilioCreateClientOptions {
  to: string;
  body: string;
  // overwrite the default from
  from?: string;
}

export interface TwilioCreateVoiceGrantOptions
  extends TwilioCreateClientOptions {
  identity: string;
  apiKey?: string | null;
  apiSecret?: string | null;
  twiMLAppSid?: string | null;
}
