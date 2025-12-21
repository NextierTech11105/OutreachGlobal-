import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

export type TwilioLineType =
  | "mobile"
  | "landline"
  | "voip"
  | "toll_free"
  | "premium"
  | "unknown";

export interface TwilioLookupResult {
  input: string;
  e164?: string;
  normalized10?: string;
  verified: boolean;
  lineType: TwilioLineType;
  carrier?: string;
  rawType?: string;
  error?: string;
}

const TWILIO_LOOKUP_URL = "https://lookups.twilio.com/v2/PhoneNumbers";

@Injectable()
export class TwilioLookupService {
  private readonly logger = new Logger(TwilioLookupService.name);

  constructor(private configService: ConfigService) {}

  async lookupLineType(input: string): Promise<TwilioLookupResult> {
    const digitsOnly = input.replace(/\D/g, "");

    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      return {
        input,
        verified: false,
        lineType: "unknown",
        error: "Invalid phone number length",
      };
    }

    const normalized10 = digitsOnly.slice(-10);
    const e164 =
      digitsOnly.length === 10
        ? `+1${digitsOnly}`
        : digitsOnly.startsWith("1") && digitsOnly.length === 11
          ? `+${digitsOnly}`
          : `+${digitsOnly}`;

    const accountSid =
      this.configService.get<string>("TWILIO_ACCOUNT_SID") ||
      this.configService.get<string>("SIGNALHOUSE_ACCOUNT_SID") ||
      "";
    const authToken =
      this.configService.get<string>("TWILIO_AUTH_TOKEN") ||
      this.configService.get<string>("SIGNALHOUSE_AUTH_TOKEN") ||
      "";

    if (!accountSid || !authToken) {
      return {
        input,
        e164,
        normalized10,
        verified: false,
        lineType: "unknown",
        error: "Twilio credentials not configured",
      };
    }

    try {
      const response = await axios.get(
        `${TWILIO_LOOKUP_URL}/${encodeURIComponent(e164)}?Fields=line_type_intelligence`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        },
      );

      const lineTypeInfo = response.data?.line_type_intelligence || {};
      const rawType = lineTypeInfo.type as string | undefined;
      const carrier = lineTypeInfo.carrier_name as string | undefined;

      return {
        input,
        e164,
        normalized10,
        verified: true,
        lineType: this.mapTwilioLineType(rawType),
        carrier,
        rawType,
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Twilio lookup failed";
      this.logger.warn(`Twilio lookup failed for ${e164}: ${message}`);
      return {
        input,
        e164,
        normalized10,
        verified: false,
        lineType: "unknown",
        error: message,
      };
    }
  }

  private mapTwilioLineType(type?: string): TwilioLineType {
    const typeMap: Record<string, TwilioLineType> = {
      mobile: "mobile",
      landline: "landline",
      voip: "voip",
      tollFree: "toll_free",
      toll_free: "toll_free",
      premium: "premium",
      fixed_voip: "voip",
      nonFixedVoip: "voip",
      non_fixed_voip: "voip",
    };

    return type ? typeMap[type] || "unknown" : "unknown";
  }
}
