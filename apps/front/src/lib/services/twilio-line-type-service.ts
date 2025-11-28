import type { PhoneLineType } from "@/types/lead";

export interface LineTypeResponse {
  lineType: PhoneLineType;
  carrier?: string;
  error?: string;
}

export class TwilioLineTypeService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string = process.env.TWILIO_API_KEY || "") {
    this.apiKey = apiKey;
    this.baseUrl = "https://lookups.twilio.com/v2/PhoneNumbers";
  }

  /**
   * Detect the line type of a phone number using Twilio's Line Type Intelligence
   * @param phoneNumber The phone number to check (E.164 format preferred)
   * @returns Promise with line type information
   */
  async detectLineType(phoneNumber: string): Promise<LineTypeResponse> {
    // For demo purposes, we'll simulate the API response
    if (!this.apiKey || this.apiKey === "demo") {
      return this.simulateLineTypeDetection(phoneNumber);
    }

    try {
      // Format the phone number (remove non-numeric characters)
      const formattedNumber = phoneNumber.replace(/\D/g, "");

      // In a real implementation, this would make an actual API call to Twilio
      const response = await fetch(
        `${this.baseUrl}/${formattedNumber}?Fields=line_type_intelligence`,
        {
          method: "GET",
          headers: {
            Authorization: `Basic ${Buffer.from(`${this.apiKey}:`).toString("base64")}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Twilio API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        lineType: data.line_type_intelligence?.type || "unknown",
        carrier: data.line_type_intelligence?.carrier_name,
      };
    } catch (error) {
      console.error("Error detecting line type:", error);
      return {
        lineType: "unknown",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Simulate line type detection for demo purposes
   * @param phoneNumber The phone number to check
   * @returns Simulated line type response
   */
  private simulateLineTypeDetection(phoneNumber: string): LineTypeResponse {
    // Use the last digit of the phone number to determine the line type for demo purposes
    const lastDigit = Number.parseInt(phoneNumber.slice(-1));

    const lineTypes: PhoneLineType[] = [
      "mobile",
      "landline",
      "voip",
      "toll_free",
      "premium",
      "unknown",
    ];
    const carriers = [
      "Verizon Wireless",
      "AT&T Mobility",
      "T-Mobile",
      "Sprint",
      "US Cellular",
      "Metro by T-Mobile",
    ];

    // Deterministic but seemingly random assignment based on the phone number
    const lineTypeIndex = lastDigit % lineTypes.length;
    const carrierIndex = (lastDigit + phoneNumber.length) % carriers.length;

    return {
      lineType: lineTypes[lineTypeIndex],
      carrier: carriers[carrierIndex],
    };
  }

  /**
   * Batch detect line types for multiple phone numbers
   * @param phoneNumbers Array of phone numbers to check
   * @returns Promise with array of line type responses
   */
  async batchDetectLineTypes(
    phoneNumbers: string[],
  ): Promise<Record<string, LineTypeResponse>> {
    const results: Record<string, LineTypeResponse> = {};

    // In a real implementation, you might want to use Promise.all with rate limiting
    // For simplicity, we'll process them sequentially
    for (const phoneNumber of phoneNumbers) {
      results[phoneNumber] = await this.detectLineType(phoneNumber);
    }

    return results;
  }
}

// Export a singleton instance
export const twilioLineTypeService = new TwilioLineTypeService(
  process.env.TWILIO_API_KEY || "demo",
);
