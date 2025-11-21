import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosError, AxiosInstance } from "axios";
import {
  SearchBusinessListOptions,
  SearchBusinessListResult,
  BusinessLead,
} from "../types/business-list.type";
import { SearchFacetsArgs } from "../args/facet.args";

@Injectable()
export class BusinessListService {
  private http: AxiosInstance;
  private realEstateHttp: AxiosInstance;

  constructor(private configService: ConfigService) {
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
      "136": "Commercial Real Estate",
      "140": "Commercial Real Estate",
      "169": "Office Buildings",
      "170": "Office Buildings",
      "171": "Office Buildings",
      "184": "Mixed-Use Development",
      "1000": "Multi-Family Development",
      "1001": "Multi-Family Development",
    };

    return codeMap[propertyUseCode || ""] || "Commercial Real Estate";
  }

  private buildCommercialSearchQuery(options: SearchBusinessListOptions): any {
    const query: any = {
      limit: options.limit || 50,
    };

    // Add state filter if provided
    if (options.state && options.state.length > 0) {
      query.state = options.state[0]; // RealEstateAPI takes single state
    }

    // Target commercial property types
    // Office buildings, multi-family 5+, commercial land, mixed-use
    const commercialCodes = [
      "136", "140", "169", "170", "171", "184", // Office/Commercial
      "1000", "1001", // Multi-family 5+
    ];

    query.property_use_code = commercialCodes.join(",");

    // Add industry-specific filters
    if (options.industry && options.industry.length > 0) {
      const industry = options.industry[0].toLowerCase();

      if (industry.includes("construction") ||
          industry.includes("hvac") ||
          industry.includes("plumbing") ||
          industry.includes("electrical") ||
          industry.includes("roofing")) {
        // Target commercial/industrial properties for blue collar businesses
        query.property_use_code = "136,140,169,170,171";
      } else if (industry.includes("development")) {
        // Target land and multi-family for development
        query.property_use_code = "1000,1001,184";
      }
    }

    // Add assessed value filter for quality leads (properties worth $500k+)
    query.assessed_value_min = 500000;

    return query;
  }

  async search(options: SearchBusinessListOptions): Promise<SearchBusinessListResult> {
    try {
      // Use RealEstateAPI for commercial property search
      const searchQuery = this.buildCommercialSearchQuery(options);

      const { data } = await this.realEstateHttp.post(
        "/v2/PropertySearch",
        searchQuery,
      );

      // Map RealEstateAPI results to BusinessLead format
      const properties = data.data || [];
      const leads: BusinessLead[] = properties.map((prop: any) =>
        this.mapPropertyToLead(prop)
      );

      return {
        estimatedTotalHits: data.total || leads.length,
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
