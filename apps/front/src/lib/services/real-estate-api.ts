// RealEstateAPI Service
import { twilioLineTypeService } from "./twilio-line-type-service";
import type { PhoneNumber } from "@/types/lead";

export interface RealEstateApiProperty {
  REI_ID: string;
  "Lot Width": number;
  "Lot Depth": number;
  Block: string;
  Lot: string;
  "Zoning Code": string;
  Neighborhood: string;
  "Absentee Owner": boolean;
  Vacant: boolean;
  "Loan Type": string;
  "Lender Name": string;
  "Lis Pendens Date": string | null;
  "Judgment Date": string | null;
  "Auction Schedule Date": string | null;
  "Sale Date": string | null;
  "Owner Phone": string | null;
  "Owner Mobile": string | null;
  "Owner Work Phone": string | null;
  "Property Manager Phone": string | null;
}

export interface EnrichedPropertyRecord {
  meta: {
    record_id: string;
    real_estate_api_id: string;
    zoho_unique_id: string;
  };
  property: {
    address: string;
    city: string;
    state: string;
    zip: string;
    county: string;
    zoning: string;
    lot_size_sqft: number;
    building_sqft: number;
    property_type: string;
    year_built: number;
  };
  owner: {
    name: string;
    type: string;
    mailing_address: string;
  };
  contact: {
    phone: string;
    phoneNumbers: PhoneNumber[];
    email: string;
    verified: boolean;
    skip_trace_score: number;
  };
  mortgage?: {
    lender_name: string;
    loan_type: string;
    interest_rate: number;
    adjustable_rate_flag: boolean;
    loan_origination_date: string;
    loan_maturity_date: string;
    loan_balance: number;
    balloon_flag: boolean;
    reverse_mortgage_flag: boolean;
  };
  event_flags?: {
    pre_foreclosure: boolean;
    lis_pendens: boolean;
    auction_scheduled: boolean;
    judgment: boolean;
    deceased_owner: boolean;
    absentee_owner: boolean;
    vacant: boolean;
  };
  score?: {
    total: number;
    reason: string;
    flagged_for_campaign: boolean;
    priority_level: string;
    recommended_campaign_type: string;
  };
}

export interface ApiTag {
  category: string;
  tag: string;
  trigger: string;
  auto_tag: boolean;
}

class RealEstateApiService {
  private apiKey: string;

  constructor(apiKey: string = process.env.REAL_ESTATE_API_KEY || "") {
    this.apiKey = apiKey;
  }

  async fetchProperties(
    zipCode: string,
    limit = 100,
  ): Promise<RealEstateApiProperty[]> {
    // In a real implementation, this would make an actual API call
    // For now, we'll simulate the API response
    console.log(
      `Fetching properties for zip code ${zipCode} with limit ${limit}`,
    );

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Return mock data
    return Array(limit)
      .fill(null)
      .map((_, index) => ({
        REI_ID: `REI${100000 + index}`,
        "Lot Width": 25 + Math.floor(Math.random() * 25),
        "Lot Depth": 100 + Math.floor(Math.random() * 50),
        Block: `${3000 + Math.floor(Math.random() * 100)}`,
        Lot: `${50 + Math.floor(Math.random() * 50)}`,
        "Zoning Code": ["R6", "R7", "R7A", "R8", "R6A"][
          Math.floor(Math.random() * 5)
        ],
        Neighborhood: [
          "Longwood",
          "Mott Haven",
          "Hunts Point",
          "Melrose",
          "Port Morris",
        ][Math.floor(Math.random() * 5)],
        "Absentee Owner": Math.random() > 0.5,
        Vacant: Math.random() > 0.7,
        "Loan Type": ["ARM", "Fixed", "FHA", "VA", "Conventional"][
          Math.floor(Math.random() * 5)
        ],
        "Lender Name": [
          "Fay Servicing LLC",
          "Chase",
          "Wells Fargo",
          "Bank of America",
          "Quicken Loans",
        ][Math.floor(Math.random() * 5)],
        "Lis Pendens Date":
          Math.random() > 0.7
            ? `2024-${Math.floor(Math.random() * 12) + 1}-${Math.floor(Math.random() * 28) + 1}`
            : null,
        "Judgment Date":
          Math.random() > 0.8
            ? `2025-${Math.floor(Math.random() * 12) + 1}-${Math.floor(Math.random() * 28) + 1}`
            : null,
        "Auction Schedule Date":
          Math.random() > 0.9
            ? `2025-${Math.floor(Math.random() * 12) + 1}-${Math.floor(Math.random() * 28) + 1}`
            : null,
        "Sale Date": null,
        "Owner Phone":
          Math.random() > 0.2
            ? `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`
            : null,
        "Owner Mobile":
          Math.random() > 0.4
            ? `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`
            : null,
        "Owner Work Phone":
          Math.random() > 0.6
            ? `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`
            : null,
        "Property Manager Phone":
          Math.random() > 0.8
            ? `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`
            : null,
      }));
  }

  async transformData(
    apiData: RealEstateApiProperty[],
  ): Promise<EnrichedPropertyRecord[]> {
    // In a real implementation, this would transform the API data to match our schema
    const transformedRecords = await Promise.all(
      apiData.map(async (property) => {
        // Collect all phone numbers from the property
        const phoneNumbers: string[] = [];
        if (property["Owner Phone"]) phoneNumbers.push(property["Owner Phone"]);
        if (property["Owner Mobile"])
          phoneNumbers.push(property["Owner Mobile"]);
        if (property["Owner Work Phone"])
          phoneNumbers.push(property["Owner Work Phone"]);
        if (property["Property Manager Phone"])
          phoneNumbers.push(property["Property Manager Phone"]);

        // Verify phone numbers with Twilio Line Type Intelligence
        console.log(
          `Verifying ${phoneNumbers.length} phone numbers with Twilio Line Type Intelligence`,
        );
        const lineTypeResults =
          await twilioLineTypeService.batchDetectLineTypes(phoneNumbers);

        // Transform phone numbers into our PhoneNumber format
        const verifiedPhoneNumbers: PhoneNumber[] = [];

        if (property["Owner Phone"]) {
          const result = lineTypeResults[property["Owner Phone"]];
          verifiedPhoneNumbers.push({
            number: property["Owner Phone"],
            label: "Home",
            isPrimary: true,
            lineType: result?.lineType || "unknown",
            carrier: result?.carrier,
            verified: true,
            lastVerified: new Date().toISOString(),
          });
        }

        if (property["Owner Mobile"]) {
          const result = lineTypeResults[property["Owner Mobile"]];
          verifiedPhoneNumbers.push({
            number: property["Owner Mobile"],
            label: "Mobile",
            isPrimary: verifiedPhoneNumbers.length === 0,
            lineType: result?.lineType || "unknown",
            carrier: result?.carrier,
            verified: true,
            lastVerified: new Date().toISOString(),
          });
        }

        if (property["Owner Work Phone"]) {
          const result = lineTypeResults[property["Owner Work Phone"]];
          verifiedPhoneNumbers.push({
            number: property["Owner Work Phone"],
            label: "Work",
            isPrimary: verifiedPhoneNumbers.length === 0,
            lineType: result?.lineType || "unknown",
            carrier: result?.carrier,
            verified: true,
            lastVerified: new Date().toISOString(),
          });
        }

        if (property["Property Manager Phone"]) {
          const result = lineTypeResults[property["Property Manager Phone"]];
          verifiedPhoneNumbers.push({
            number: property["Property Manager Phone"],
            label: "Property Manager",
            isPrimary: verifiedPhoneNumbers.length === 0,
            lineType: result?.lineType || "unknown",
            carrier: result?.carrier,
            verified: true,
            lastVerified: new Date().toISOString(),
          });
        }

        // Use the primary phone number as the main contact phone
        const primaryPhone =
          verifiedPhoneNumbers.find((p) => p.isPrimary) ||
          verifiedPhoneNumbers[0];

        return {
          meta: {
            record_id: `REC-${Math.floor(Math.random() * 100000)}`,
            real_estate_api_id: property.REI_ID,
            zoho_unique_id: `ZOHO-${Math.floor(Math.random() * 100000)}`,
          },
          property: {
            address: `${Math.floor(Math.random() * 1000)} Main St`,
            city: "Bronx",
            state: "NY",
            zip: "10455",
            county: "Bronx",
            zoning: property["Zoning Code"],
            lot_size_sqft: property["Lot Width"] * property["Lot Depth"],
            building_sqft: Math.floor(
              property["Lot Width"] * property["Lot Depth"] * 0.7,
            ),
            property_type: "Residential",
            year_built: 1950 + Math.floor(Math.random() * 70),
          },
          owner: {
            name: property["Absentee Owner"]
              ? "Remote Owner LLC"
              : "Local Resident",
            type: property["Absentee Owner"] ? "LLC" : "Individual",
            mailing_address: property["Absentee Owner"]
              ? "123 Corporate Plaza, Manhattan, NY 10001"
              : `${Math.floor(Math.random() * 1000)} Main St, Bronx, NY 10455`,
          },
          contact: {
            phone: primaryPhone?.number || "",
            phoneNumbers: verifiedPhoneNumbers,
            email: `owner${Math.floor(Math.random() * 1000)}@example.com`,
            verified: Math.random() > 0.3,
            skip_trace_score: Math.floor(Math.random() * 100),
          },
          mortgage: {
            lender_name: property["Lender Name"],
            loan_type: property["Loan Type"],
            interest_rate: 3 + Math.random() * 3,
            adjustable_rate_flag: property["Loan Type"] === "ARM",
            loan_origination_date: `202${Math.floor(Math.random() * 5)}-${Math.floor(Math.random() * 12) + 1}-${Math.floor(Math.random() * 28) + 1}`,
            loan_maturity_date: `205${Math.floor(Math.random() * 5)}-${Math.floor(Math.random() * 12) + 1}-${Math.floor(Math.random() * 28) + 1}`,
            loan_balance: Math.floor(Math.random() * 500000) + 100000,
            balloon_flag: Math.random() > 0.8,
            reverse_mortgage_flag: Math.random() > 0.9,
          },
          event_flags: {
            pre_foreclosure: property["Lis Pendens Date"] !== null,
            lis_pendens: property["Lis Pendens Date"] !== null,
            auction_scheduled: property["Auction Schedule Date"] !== null,
            judgment: property["Judgment Date"] !== null,
            deceased_owner: Math.random() > 0.9,
            absentee_owner: property["Absentee Owner"],
            vacant: property["Vacant"],
          },
          score: {
            total: Math.floor(Math.random() * 100),
            reason: "Multiple distress signals detected",
            flagged_for_campaign: Math.random() > 0.3,
            priority_level:
              Math.random() > 0.7
                ? "High"
                : Math.random() > 0.4
                  ? "Medium"
                  : "Low",
            recommended_campaign_type: [
              "Direct Mail",
              "SMS",
              "Email",
              "Call Campaign",
            ][Math.floor(Math.random() * 4)],
          },
        };
      }),
    );

    return transformedRecords;
  }

  async applyAutoTags(
    records: EnrichedPropertyRecord[],
    tagRules: ApiTag[],
  ): Promise<EnrichedPropertyRecord[]> {
    // In a real implementation, this would apply the tag rules to the records
    // For now, we'll simulate the tagging process
    return records;
  }

  async verifyWithTwilio(
    records: EnrichedPropertyRecord[],
  ): Promise<EnrichedPropertyRecord[]> {
    // In a real implementation, this would verify phone numbers with Twilio
    // For now, we'll simulate the verification process
    return records.map((record) => ({
      ...record,
      contact: {
        ...record.contact,
        verified: Math.random() > 0.2,
        skip_trace_score: Math.floor(Math.random() * 30) + 70, // Higher scores after verification
      },
    }));
  }

  async syncWithZoho(
    records: EnrichedPropertyRecord[],
  ): Promise<EnrichedPropertyRecord[]> {
    // In a real implementation, this would sync records with Zoho CRM
    // For now, we'll simulate the sync process
    return records.map((record) => ({
      ...record,
      meta: {
        ...record.meta,
        zoho_unique_id: `ZOHO-${Math.floor(Math.random() * 100000)}`,
      },
    }));
  }
}

// Export the service instance
export const realEstateApi = new RealEstateApiService();

// Keep the existing functions for backward compatibility
export async function fetchPropertiesFromRealEstateApi(
  apiKey: string,
  zipCode: string,
  limit = 100,
): Promise<RealEstateApiProperty[]> {
  return realEstateApi.fetchProperties(zipCode, limit);
}

export async function transformRealEstateApiData(
  apiData: RealEstateApiProperty[],
): Promise<EnrichedPropertyRecord[]> {
  return realEstateApi.transformData(apiData);
}

export async function applyAutoTags(
  records: EnrichedPropertyRecord[],
  tagRules: ApiTag[],
): Promise<EnrichedPropertyRecord[]> {
  return realEstateApi.applyAutoTags(records, tagRules);
}

export async function verifyWithTwilio(
  records: EnrichedPropertyRecord[],
): Promise<EnrichedPropertyRecord[]> {
  return realEstateApi.verifyWithTwilio(records);
}

export async function syncWithZoho(
  records: EnrichedPropertyRecord[],
): Promise<EnrichedPropertyRecord[]> {
  return realEstateApi.syncWithZoho(records);
}
