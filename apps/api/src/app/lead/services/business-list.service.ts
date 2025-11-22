import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosError, AxiosInstance } from "axios";
import {
  SearchBusinessListOptions,
  SearchBusinessListResult,
  BusinessLead,
} from "../types/business-list.type";
import { SearchFacetsArgs } from "../args/facet.args";
import { LeadIntelligenceService } from "./lead-intelligence.service";

@Injectable()
export class BusinessListService {
  private http: AxiosInstance;
  private realEstateHttp: AxiosInstance;

  constructor(
    private configService: ConfigService,
    private intelligenceService: LeadIntelligenceService,
  ) {
    const API_URL = this.configService.get("BUSINESS_LIST_API_URL");
    this.http = axios.create({
      baseURL: API_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Initialize RealEstateAPI client
    this.realEstateHttp = axios.create({
      baseURL: "https://api.realestateapi.com",
      headers: {
        "x-api-key": this.configService.get("REALESTATE_API_KEY"),
        "Content-Type": "application/json",
      },
    });
  }

  getFilters(options: SearchBusinessListOptions) {
    const filter: string[] = [];
    const filterKeys: string[] = [
      "city",
      "state",
      "title",
      "company_domain",
      "company_name",
      "industry",
    ];

    filterKeys.forEach((key) => {
      if (options[key]) {
        const values = options[key].map((val) => `"${val}"`);
        filter.push(`${key} IN [${values.join(",")}]`);
      }
    });
    return filter;
  }

  async searchFacets(options: SearchFacetsArgs & { token: string }) {
    // Return mock facets for now - these are the commercial property types
    const facetMap = {
      industry: [
        { value: "Commercial Real Estate", count: 5000 },
        { value: "Construction", count: 3000 },
        { value: "Property Development", count: 2500 },
        { value: "HVAC", count: 2000 },
        { value: "Plumbing", count: 1800 },
        { value: "Electrical", count: 1600 },
        { value: "Roofing", count: 1400 },
        { value: "Business Brokerage", count: 1200 },
      ],
      state: [
        { value: "FL", count: 10000 },
        { value: "TX", count: 9000 },
        { value: "CA", count: 8000 },
        { value: "NY", count: 7000 },
      ],
      title: [
        { value: "Owner", count: 5000 },
        { value: "CEO", count: 3000 },
        { value: "President", count: 2500 },
        { value: "Managing Partner", count: 2000 },
      ],
    };

    return {
      hits: facetMap[options.name] || [],
    };
  }

  /**
   * ===== SAVED SEARCH FUNCTIONALITY =====
   * Track property searches and get daily updates on changes
   */

  /**
   * Create a Saved Search in RealEstateAPI
   */
  async createSavedSearch(params: {
    searchName: string;
    searchQuery: Record<string, any>;
    listSize?: number;
    metadata?: Record<string, any>;
  }): Promise<any> {
    try {
      const { data } = await this.realEstateHttp.post(
        "/v1/PropertyPortfolio/SavedSearch/Create",
        {
          search_name: params.searchName,
          search_query: params.searchQuery,
          list_size: params.listSize || 10000,
          meta_data: params.metadata,
        },
      );

      return {
        searchId: data.data.searchId,
        searchName: data.data.searchName,
        lastReportDate: data.data.search?.lastReportDate,
        nextReportDate: data.data.search?.nextReportDate,
        summary: data.data.summary,
        results: data.data.results || [],
      };
    } catch (error: any) {
      if (error instanceof AxiosError) {
        throw new InternalServerErrorException(
          error.response?.data?.message || "Failed to create saved search",
        );
      }
      throw new InternalServerErrorException(error.message || "Failed to create saved search");
    }
  }

  /**
   * Retrieve updates from a Saved Search
   * Returns added, deleted, and updated properties
   */
  async retrieveSavedSearch(searchId: string): Promise<any> {
    try {
      const { data } = await this.realEstateHttp.post(
        "/v1/PropertyPortfolio/SavedSearch",
        {
          search_id: searchId,
        },
      );

      return {
        search: data.data.search,
        results: data.data.results || [],
        summary: data.data.summary,
      };
    } catch (error: any) {
      if (error instanceof AxiosError) {
        throw new InternalServerErrorException(
          error.response?.data?.message || "Failed to retrieve saved search",
        );
      }
      throw new InternalServerErrorException(error.message || "Failed to retrieve saved search");
    }
  }

  /**
   * Get all saved searches for a team
   */
  async getAllSavedSearches(filter?: {
    searchId?: string;
    xUserId?: string;
    metadata?: Record<string, any>;
  }): Promise<any> {
    try {
      const { data } = await this.realEstateHttp.post(
        "/v1/PropertyPortfolio/SavedSearch/List",
        {
          filter: filter || {},
        },
      );

      return data.data || [];
    } catch (error: any) {
      if (error instanceof AxiosError) {
        throw new InternalServerErrorException(
          error.response?.data?.message || "Failed to list saved searches",
        );
      }
      throw new InternalServerErrorException(error.message || "Failed to list saved searches");
    }
  }

  /**
   * Delete a saved search
   */
  async deleteSavedSearch(searchId: string): Promise<any> {
    try {
      const { data } = await this.realEstateHttp.post(
        "/v1/PropertyPortfolio/SavedSearch/Delete",
        {
          search_id: searchId,
        },
      );

      return {
        searchId: data.data.searchId,
        deleted: data.data.deleted,
      };
    } catch (error: any) {
      if (error instanceof AxiosError) {
        throw new InternalServerErrorException(
          error.response?.data?.message || "Failed to delete saved search",
        );
      }
      throw new InternalServerErrorException(error.message || "Failed to delete saved search");
    }
  }

  private mapPropertyToLead(property: any): BusinessLead {
    // Extract property info
    const address = property.address || {};
    const ownerInfo = property.owner || {};

    // Generate a name from owner info or property address
    const name = ownerInfo.name ||
                 ownerInfo.owner1_full_name ||
                 `Property Owner - ${address.street_address || "Unknown"}`;

    // Try to extract company name
    const companyName = ownerInfo.company_name ||
                       ownerInfo.mailing_care_of_name ||
                       name;

    return {
      id: property.id || `prop-${Date.now()}-${Math.random()}`,
      name: name,
      company_name: companyName,
      email: this.generateLeadEmail(name, companyName),
      phone: ownerInfo.phone || property.phone || undefined,
      title: "Property Owner",
      address: address.street_address,
      city: address.city,
      state: address.state,
      revenue: property.assessed_value || property.market_value || undefined,
      employees: property.building_sqft ? Math.floor(property.building_sqft / 200) : undefined,
      industry: this.mapPropertyTypeToIndustry(property.property_use_code),
    };
  }

  private generateLeadEmail(name: string, companyName: string): string {
    // Generate a placeholder email - in production, you'd use skip trace
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanCompany = companyName.toLowerCase().replace(/[^a-z0-9]/g, "");
    return `${cleanName}@${cleanCompany}.com`;
  }

  private mapPropertyTypeToIndustry(propertyUseCode?: string): string {
    const codeMap: Record<string, string> = {
      "136": "Commercial Office",
      "140": "Mixed Use (Store/Office)",
      "169": "Office Building",
      "170": "Office Building (Multi-Story)",
      "171": "Mixed Use (Office/Residential)",
      "184": "High-Rise Commercial",
      "357": "Multi-Family (5+ Units)",
      "358": "High-Rise Apartments",
      "359": "Large Apartments (100+ Units)",
      "360": "Apartments",
      "361": "Apartment Complex (5+ Units)",
      "167": "Shopping Center/Strip Mall",
      "179": "Regional Mall",
      "183": "Community Shopping Center",
    };

    return codeMap[propertyUseCode || ""] || "Commercial Real Estate";
  }

  private buildCommercialSearchQuery(options: SearchBusinessListOptions): any {
    const query: any = {
      limit: options.limit || 50,
      size: options.limit || 50, // RealEstateAPI requires 'size' parameter
    };

    // ===== GEO FILTERS =====
    if (options.state && options.state.length > 0) {
      query.state = options.state[0]; // RealEstateAPI takes single state
    }

    // ===== PORTFOLIO FILTERS (Find Investors!) =====
    if (options.properties_owned_min) query.properties_owned_min = options.properties_owned_min;
    if (options.properties_owned_max) query.properties_owned_max = options.properties_owned_max;
    if (options.portfolio_value_min) query.portfolio_value_min = options.portfolio_value_min;
    if (options.portfolio_value_max) query.portfolio_value_max = options.portfolio_value_max;
    if (options.portfolio_equity_min) query.portfolio_equity_min = options.portfolio_equity_min;
    if (options.portfolio_equity_max) query.portfolio_equity_max = options.portfolio_equity_max;
    if (options.portfolio_mortgage_balance_min) {
      query.portfolio_mortgage_balance_min = options.portfolio_mortgage_balance_min;
    }
    if (options.portfolio_mortgage_balance_max) {
      query.portfolio_mortgage_balance_max = options.portfolio_mortgage_balance_max;
    }

    // ===== ACTIVE BUYER DISCOVERY =====
    if (options.portfolio_purchased_last12_min) {
      query.portfolio_purchased_last12_min = options.portfolio_purchased_last12_min;
    }
    if (options.portfolio_purchased_last12_max) {
      query.portfolio_purchased_last12_max = options.portfolio_purchased_last12_max;
    }

    // ===== EQUITY FILTERS (Find Motivated Sellers!) =====
    if (options.estimated_equity_min) query.estimated_equity_min = options.estimated_equity_min;
    if (options.estimated_equity_max) query.estimated_equity_max = options.estimated_equity_max;
    if (options.equity_percent_min) query.equity_percent_min = options.equity_percent_min;
    if (options.equity_percent_max) query.equity_percent_max = options.equity_percent_max;
    if (options.high_equity) query.high_equity = true;
    if (options.free_clear) query.free_clear = true;

    // ===== PROPERTY VALUE FILTERS =====
    if (options.assessed_value_min) query.assessed_value_min = options.assessed_value_min;
    if (options.assessed_value_max) query.assessed_value_max = options.assessed_value_max;
    if (options.value_min) query.value_min = options.value_min;
    if (options.value_max) query.value_max = options.value_max;
    if (options.last_sale_price_min) query.last_sale_price_min = options.last_sale_price_min;
    if (options.last_sale_price_max) query.last_sale_price_max = options.last_sale_price_max;

    // ===== PROPERTY CHARACTERISTICS =====
    if (options.building_size_min) query.building_size_min = options.building_size_min;
    if (options.building_size_max) query.building_size_max = options.building_size_max;
    if (options.lot_size_min) query.lot_size_min = options.lot_size_min;
    if (options.lot_size_max) query.lot_size_max = options.lot_size_max;
    if (options.beds_min) query.beds_min = options.beds_min;
    if (options.beds_max) query.beds_max = options.beds_max;
    if (options.baths_min) query.baths_min = options.baths_min;
    if (options.baths_max) query.baths_max = options.baths_max;
    if (options.units_min) query.units_min = options.units_min;
    if (options.units_max) query.units_max = options.units_max;
    if (options.year_built_min) query.year_built_min = options.year_built_min;
    if (options.year_built_max) query.year_built_max = options.year_built_max;

    // ===== OWNER FILTERS =====
    if (options.absentee_owner) query.absentee_owner = true;
    if (options.out_of_state_owner) query.out_of_state_owner = true;
    if (options.in_state_owner) query.in_state_owner = true;
    if (options.corporate_owned) query.corporate_owned = true;
    if (options.individual_owned) query.individual_owned = true;
    if (options.years_owned_min) query.years_owned_min = options.years_owned_min;
    if (options.years_owned_max) query.years_owned_max = options.years_owned_max;

    // ===== PROPERTY TYPE FLAGS =====
    if (options.mfh_2to4) query.mfh_2to4 = true;
    if (options.mfh_5plus) query.mfh_5plus = true;
    if (options.vacant) query.vacant = true;
    if (options.pre_foreclosure) query.pre_foreclosure = true;
    if (options.foreclosure) query.foreclosure = true;
    if (options.cash_buyer) query.cash_buyer = true;
    if (options.investor_buyer) query.investor_buyer = true;

    // ===== MORTGAGE FILTERS =====
    if (options.mortgage_min) query.mortgage_min = options.mortgage_min;
    if (options.mortgage_max) query.mortgage_max = options.mortgage_max;
    if (options.assumable) query.assumable = true;

    // ===== INDUSTRY-SPECIFIC DEFAULTS =====
    if (options.industry && options.industry.length > 0) {
      const industry = options.industry[0].toLowerCase();

      if (industry.includes("construction") ||
          industry.includes("hvac") ||
          industry.includes("plumbing") ||
          industry.includes("electrical") ||
          industry.includes("roofing")) {
        // Target commercial office buildings for blue collar service businesses
        if (!query.property_use_code) {
          query.property_use_code = [136, 140, 169, 170, 171];
        }
      } else if (industry.includes("development") || industry.includes("multi-family")) {
        // Use multi-family flag for development opportunities
        if (!query.mfh_5plus && !query.mfh_2to4) {
          query.mfh_5plus = true; // Properties with 5+ units
          if (!query.units_min) query.units_min = 5;
        }
      } else if (!query.property_use_code) {
        // Default: broad commercial search - office buildings + multi-family + shopping
        query.property_use_code = [
          136, 140, 169, 170, 171, 184, // Office/Commercial
          357, 358, 359, 360, 361, // Multi-family 5+
          167, 179, 183, // Shopping centers
        ];
      }
    } else if (!query.property_use_code && !query.mfh_5plus && !query.mfh_2to4) {
      // Default: target commercial properties (only if no specific filters set)
      query.property_use_code = [
        136, 140, 169, 170, 171, 184, // Offices
        357, 358, 359, 360, 361, // Multi-family
      ];
    }

    // ===== DEFAULT QUALITY FILTER =====
    // Only add if no other value filters are set
    if (!query.assessed_value_min && !query.value_min && !query.portfolio_value_min) {
      query.assessed_value_min = 500000; // Default: properties worth $500k+
    }

    return query;
  }

  /**
   * SkipTrace a batch of property owners to get real contact data
   * Uses SkipTraceBatchAwait for synchronous bulk skip tracing
   */
  private async skipTraceBatch(properties: any[]): Promise<any[]> {
    try {
      // Build skip trace requests from property data
      const skips = properties.map((prop, index) => {
        const ownerInfo = prop.ownerInfo || {};
        const mailAddress = ownerInfo.mailAddress || {};

        const skipRequest: any = {
          key: String(index), // Use index as key for matching
          address: mailAddress.streetAddress || mailAddress.address,
          city: mailAddress.city,
          state: mailAddress.state,
          zip: mailAddress.zip,
        };

        // Add owner names if individual owner (not company)
        if (ownerInfo.owner1Type === "Individual") {
          skipRequest.first_name = ownerInfo.owner1FirstName;
          skipRequest.last_name = ownerInfo.owner1LastName;
        }

        return skipRequest;
      }).filter(skip => skip.address && skip.city && skip.state); // Only skip trace if we have address

      if (skips.length === 0) {
        return [];
      }

      // Call SkipTraceBatchAwait API
      const { data } = await this.realEstateHttp.post(
        "/v1/SkipTraceBatchAwait",
        { skips },
      );

      return data.results || [];
    } catch (error: any) {
      console.error("SkipTrace batch failed:", error.message);
      return []; // Return empty array if skip trace fails
    }
  }

  /**
   * Get PropertyDetail for a property to get full owner info
   */
  private async getPropertyDetail(propertyId: string): Promise<any> {
    try {
      const { data } = await this.realEstateHttp.post(
        "/v2/PropertyDetail",
        { id: propertyId },
      );
      return data;
    } catch (error: any) {
      console.error(`PropertyDetail failed for ${propertyId}:`, error.message);
      return null;
    }
  }

  /**
   * Map property + skip trace data to BusinessLead with AUTO-INTELLIGENCE
   */
  private mapPropertyWithSkipTrace(property: any, skipTraceResult: any): BusinessLead {
    const address = property.propertyInfo?.address || property.address || {};
    const ownerInfo = property.ownerInfo || property.owner || {};

    // Get skip trace contact data
    const identity = skipTraceResult?.output?.identity || {};
    const demographics = skipTraceResult?.output?.demographics || {};
    const phones = identity.phones || [];
    const emails = identity.emails || [];

    // Use skip trace name or fall back to property owner name
    const skipTraceName = identity.names?.[0]?.fullName;
    const name = skipTraceName ||
                 ownerInfo.owner1FullName ||
                 ownerInfo.owner1_full_name ||
                 `Property Owner - ${address.streetAddress || address.street_address || "Unknown"}`;

    // Get best email (prefer personal over work)
    const bestEmail = emails.find((e: any) => e.emailType === "personal")?.email ||
                     emails[0]?.email;

    // Get best phone (prefer connected mobile)
    const bestPhone = phones.find((p: any) => p.isConnected && p.phoneType === "mobile")?.phone ||
                     phones.find((p: any) => p.isConnected)?.phone ||
                     phones[0]?.phone;

    // Get job title from demographics or default
    const jobTitle = demographics.jobs?.[0]?.title || "Property Owner";

    // ===== AUTO-INTELLIGENCE =====
    const contactData = {
      verifiedEmail: !!bestEmail,
      verifiedPhone: !!bestPhone,
      hasMultiplePhones: phones.length > 1,
    };

    const propertyData = property; // Full property detail from RealEstateAPI

    // Auto-generate tags, score, status, and flags
    const tags = this.intelligenceService.autoTag(propertyData, contactData);
    const score = this.intelligenceService.autoScore(propertyData, contactData);
    const status = this.intelligenceService.autoStatus(propertyData, contactData);
    const flags = this.intelligenceService.autoFlag(propertyData, contactData);

    return {
      id: property.id || `prop-${Date.now()}-${Math.random()}`,
      name: name,
      company_name: ownerInfo.companyName || ownerInfo.company_name || name,
      email: bestEmail,
      phone: bestPhone,
      title: jobTitle,
      address: address.streetAddress || address.street_address,
      city: address.city,
      state: address.state,
      revenue: property.taxInfo?.assessedValue || property.estimatedValue || property.assessed_value,
      employees: property.propertyInfo?.buildingSquareFeet ?
                 Math.floor(property.propertyInfo.buildingSquareFeet / 200) : undefined,
      industry: this.mapPropertyTypeToIndustry(property.propertyInfo?.propertyUseCode || property.property_use_code),

      // ===== AUTO-GENERATED INTELLIGENCE =====
      tags,
      score,
      status,
      flags,
      metadata: {
        propertyId: property.id,
        skipTraceRequestId: skipTraceResult?.requestId,
        skipTraceMatch: skipTraceResult?.match,
        propertyData: {
          equityPercent: propertyData.equityPercent,
          estimatedEquity: propertyData.estimatedEquity,
          estimatedValue: propertyData.estimatedValue,
          propertiesOwned: propertyData.linkedProperties?.totalOwned,
          portfolioValue: propertyData.linkedProperties?.totalValue,
        },
      },
    };
  }

  async search(options: SearchBusinessListOptions): Promise<SearchBusinessListResult> {
    try {
      // Step 1: Search for properties
      const searchQuery = this.buildCommercialSearchQuery(options);
      const { data: searchData } = await this.realEstateHttp.post(
        "/v2/PropertySearch",
        searchQuery,
      );

      const propertyIds = searchData.data?.map((p: any) => p.id) || [];
      if (propertyIds.length === 0) {
        return {
          estimatedTotalHits: 0,
          limit: options.limit || 50,
          offset: options.offset || 0,
          hits: [],
        };
      }

      // Step 2: Get PropertyDetail for owner info (batch first 10 for preview)
      const detailPromises = propertyIds.slice(0, 10).map((id: string) =>
        this.getPropertyDetail(id)
      );
      const propertyDetails = (await Promise.all(detailPromises)).filter(Boolean);

      // Step 3: SkipTrace batch to get real contact data
      const skipTraceResults = await this.skipTraceBatch(propertyDetails);

      // Step 4: Map properties with skip trace data
      const leads: BusinessLead[] = propertyDetails
        .map((prop, index) => {
          const skipTraceResult = skipTraceResults.find((sr: any) => sr.input?.key === String(index));

          // Include all properties - with or without skip trace results
          return this.mapPropertyWithSkipTrace(prop, skipTraceResult);
        })
        .filter(Boolean) as BusinessLead[];

      return {
        estimatedTotalHits: searchData.total || leads.length,
        limit: options.limit || 50,
        offset: options.offset || 0,
        hits: leads,
      };
    } catch (error: any) {
      if (error instanceof AxiosError) {
        throw new InternalServerErrorException(
          error.response?.data?.message || "RealEstateAPI search failed",
        );
      }

      throw new InternalServerErrorException(error.message || "Search failed");
    }
  }
}
