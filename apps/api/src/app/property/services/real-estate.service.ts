import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

@Injectable()
export class RealEstateService {
  private http: AxiosInstance;

  constructor(private configService: ConfigService) {
    this.http = axios.create({
      baseURL: "https://api.realestateapi.com",
      headers: {
        "x-api-key": this.configService.get("REALESTATE_API_KEY"),
      },
    });
  }

  async propertySearch(params: Record<string, any>) {
    const requestBody: any = {
      limit: params.size || 50,
      size: params.size || 50,
    };

    // Add ALL filter parameters
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null && key !== "size") {
        requestBody[key] = params[key];
      }
    });

    const { data } = await this.http.post(
      "/v2/PropertySearch",
      requestBody,
    );

    return {
      data: data.data || [],
      total: data.total || 0,
    };
  }

  async propertyDetail(propertyId: string) {
    const { data } = await this.http.post("/v1/PropertyDetail", {
      id: propertyId,
    });

    return data.data;
  }

  async skipTrace(propertyId: string) {
    // First get property detail to get owner info
    const property = await this.propertyDetail(propertyId);
    const ownerInfo = property.ownerInfo || {};
    const mailAddress = ownerInfo.mailAddress || {};

    // Skip trace the owner
    const { data } = await this.http.post("/v1/SkipTrace", {
      address: mailAddress.streetAddress,
      city: mailAddress.city,
      state: mailAddress.state,
      zip: mailAddress.zip,
      first_name: ownerInfo.owner1FirstName,
      last_name: ownerInfo.owner1LastName,
    });

    return data.data;
  }

  async createSavedSearch(
    teamId: string,
    searchName: string,
    searchQuery: Record<string, any>,
  ) {
    const { data } = await this.http.post(
      "/v1/PropertyPortfolio/SavedSearch/Create",
      {
        search_name: searchName,
        search_query: searchQuery,
      },
    );

    return {
      searchId: data.search_id || data.id,
      searchName: data.search_name,
      totalProperties: data.total || data.count || 0,
    };
  }

  async listSavedSearches(teamId: string) {
    // This would query the local database for saved searches
    // For now, return empty array
    return [];
  }

  async deleteSavedSearch(searchId: string) {
    const { data } = await this.http.post(
      "/v1/PropertyPortfolio/SavedSearch/Delete",
      {
        search_id: searchId,
      },
    );

    return {
      searchId: data.searchId,
      deleted: data.deleted,
    };
  }

  /**
   * IMPORT TO CAMPAIGN - The Ultimate Pipeline!
   * 1. Get property details for all properties
   * 2. Skip trace all owners
   * 3. Create leads in system
   * 4. Create campaign
   * 5. Execute via Twilio Studio + SignalHouse.io
   */
  async importToCampaign(
    teamId: string,
    propertyIds: string[],
    campaignName: string,
    messageTemplateId?: string,
  ) {
    // Step 1: Get property details + skip trace in parallel
    const propertyPromises = propertyIds.map(async (id) => {
      try {
        const property = await this.propertyDetail(id);
        const skipTraceResult = await this.skipTrace(id);

        return {
          property,
          skipTrace: skipTraceResult,
        };
      } catch (error) {
        console.error(`Failed to process property ${id}:`, error);
        return null;
      }
    });

    const results = (await Promise.all(propertyPromises)).filter(Boolean);

    // Step 2: Transform to leads (will be handled by LeadService)
    const leads = results.map((r: any) => {
      const property = r.property;
      const skipTrace = r.skipTrace;
      const ownerInfo = property.ownerInfo || {};
      const address = property.address || {};
      const mailAddress = ownerInfo.mailAddress || {};

      const emails = skipTrace?.identity?.emails || [];
      const phones = skipTrace?.identity?.phones || [];

      return {
        name:
          ownerInfo.owner1FullName ||
          `${ownerInfo.owner1FirstName || ""} ${ownerInfo.owner1LastName || ""}`.trim() ||
          "Property Owner",
        email: emails[0]?.email,
        phone: phones[0]?.number,
        address: address.streetAddress,
        city: address.city,
        state: address.state,
        zipCode: address.zip,
        propertyValue: property.taxInfo?.assessedValue || property.estimatedValue,
        equityPercent: property.equityPercent,
        propertyType: property.propertyInfo?.propertyType,
        metadata: {
          propertyId: property.id,
          skipTraceMatch: skipTrace?.match,
          portfolio: property.linkedProperties,
        },
      };
    });

    // Step 3-5: Return leads - Campaign creation handled by frontend/CampaignService
    return {
      totalProperties: propertyIds.length,
      successfullyProcessed: results.length,
      leads,
      campaignName,
    };
  }

  async propertyCount(params: {
    state?: string;
    city?: string;
    county?: string;
    neighborhood?: string;
    zipCode?: string;
    propertyType?: string;
    propertyCode?: string;
  }): Promise<{ count: number; estimatedResults: number }> {
    const {
      state,
      city,
      county,
      neighborhood,
      zipCode,
      propertyType,
      propertyCode,
    } = params;

    const requestBody: any = {
      limit: 1, // Only get 1 result to check count
      size: 1,
    };

    // Add location parameters
    if (state) requestBody.state = state;
    if (city) requestBody.city = city;
    if (county) requestBody.county = county;
    if (neighborhood) requestBody.neighborhood = neighborhood;
    if (zipCode) requestBody.zipCode = zipCode;
    if (propertyType) requestBody.propertyType = propertyType;
    if (propertyCode) requestBody.propertyCode = propertyCode;

    try {
      const { data } = await this.http.post(
        "https://api.realestateapi.com/v2/PropertySearch",
        requestBody,
      );

      // RealEstateAPI returns total count in metadata
      return {
        count: data.total || data.data?.length || 0,
        estimatedResults: data.total || 0,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to get property count: ${message}`);
    }
  }
}
