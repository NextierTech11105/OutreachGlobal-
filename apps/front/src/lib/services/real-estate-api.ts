// RealEstateAPI Service - Production Integration
// API Docs: https://developer.realestateapi.com
import type { PhoneNumber } from "@/types/lead";

const API_BASE_URL = "https://api.realestateapi.com/v2";
const API_KEY =
  process.env.REALESTATE_API_KEY ||
  process.env.REAL_ESTATE_API_KEY ||
  process.env.NEXT_PUBLIC_REAL_ESTATE_API_KEY ||
  "";

// ============ API Response Types ============

export interface PropertyAddress {
  address: string;
  city: string;
  county: string;
  fips: string;
  state: string;
  street: string;
  zip: string;
}

export interface PropertyNeighborhood {
  center: string;
  id: string;
  name: string;
  type: string;
}

export interface PropertySearchResult {
  id: string;
  propertyId: string;
  address: PropertyAddress;
  mailAddress?: PropertyAddress;
  propertyType:
    | "SFR"
    | "CONDO"
    | "MFR"
    | "LAND"
    | "MOBILE"
    | "TOWNHOUSE"
    | "OTHER";
  propertyUse: string;
  propertyUseCode: number;
  landUse: string;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number;
  lotSquareFeet: number;
  yearBuilt: number | null;
  stories: number;
  estimatedValue: number;
  estimatedEquity: number;
  equityPercent: number;
  assessedValue: number;
  assessedLandValue: number;
  assessedImprovementValue: number;
  openMortgageBalance: number;
  estimatedMortgagePayment: number;
  lenderName: string | null;
  loanTypeCode: string | null;
  maturityDateFirst: string | null;
  adjustableRate: boolean;
  owner1FirstName: string | null;
  owner1LastName: string | null;
  owner2FirstName: string | null;
  owner2LastName: string | null;
  companyName: string | null;
  ownerOccupied: boolean;
  absenteeOwner: boolean;
  inStateAbsenteeOwner: boolean;
  outOfStateAbsenteeOwner: boolean;
  corporateOwned: boolean;
  yearsOwned: number | null;
  highEquity: boolean;
  preForeclosure: boolean;
  foreclosure: boolean;
  auction: boolean;
  auctionDate: string | null;
  taxLien: boolean;
  vacant: boolean;
  inherited: boolean;
  death: boolean;
  cashBuyer: boolean;
  investorBuyer: boolean;
  reo: boolean;
  freeClear: boolean;
  mlsActive: boolean;
  mlsPending: boolean;
  mlsSold: boolean;
  mlsCancelled: boolean;
  mlsListingPrice: number | null;
  mlsDaysOnMarket: number | null;
  mlsStatus: string | null;
  mlsHasPhotos: boolean;
  lastSaleDate: string | null;
  lastSaleAmount: string | null;
  priorOwner: string | null;
  totalPropertiesOwned: string | null;
  totalPortfolioValue: string | null;
  totalPortfolioEquity: string | null;
  latitude: number;
  longitude: number;
  neighborhood: PropertyNeighborhood | null;
  floodZone: boolean;
  floodZoneType: string | null;
  suggestedRent: string | null;
  medianIncome: string | null;
  lastUpdateDate: string;
}

export interface PropertySearchResponse {
  live: boolean;
  input: Record<string, unknown>;
  data: PropertySearchResult[];
  resultCount: number;
  resultIndex: number;
  recordCount: number;
  statusCode: number;
  statusMessage: string;
  requestExecutionTimeMS: string;
}

export interface PropertyDetailResponse {
  input: Record<string, unknown>;
  data: PropertySearchResult & {
    saleHistory: Array<{
      saleDate: string;
      saleAmount: number;
      buyerNames: string;
      sellerNames: string;
      documentType: string;
    }>;
    mortgageHistory: Array<{
      amount: number;
      lenderName: string;
      loanType: string;
      recordingDate: string;
    }>;
    schools: Array<{
      name: string;
      rating: number;
      type: string;
      grades: string;
    }>;
    demographics: {
      medianIncome: string;
      suggestedRent: string;
    };
    linkedProperties: {
      ids: string[];
      totalOwned: string;
      totalValue: string;
      totalEquity: string;
    };
  };
  statusCode: number;
  statusMessage: string;
}

// ============ Search Query Types ============

export type SortField =
  | "years_owned"
  | "equity_percent"
  | "year_built"
  | "building_size"
  | "lot_size"
  | "assessed_value"
  | "last_sale_date"
  | "estimated_equity"
  | "estimated_value"
  | "assessed_land_value";

export type SortOrder = "asc" | "desc";

export interface PropertySearchQuery {
  zip?: string;
  city?: string;
  state?: string;
  county?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  property_type?: string | string[];
  beds_min?: number;
  beds_max?: number;
  baths_min?: number;
  baths_max?: number;
  building_size_min?: number;
  building_size_max?: number;
  lot_size_min?: number;
  lot_size_max?: number;
  year_built_min?: number;
  year_built_max?: number;
  estimated_value_min?: number;
  estimated_value_max?: number;
  estimated_equity_min?: number;
  estimated_equity_max?: number;
  equity_percent_min?: number;
  equity_percent_max?: number;
  absentee_owner?: boolean;
  owner_occupied?: boolean;
  high_equity?: boolean;
  pre_foreclosure?: boolean;
  foreclosure?: boolean;
  auction?: boolean;
  tax_lien?: boolean;
  vacant?: boolean;
  inherited?: boolean;
  death?: boolean;
  corporate_owned?: boolean;
  cash_buyer?: boolean;
  investor_buyer?: boolean;
  free_clear?: boolean;
  mls_active?: boolean;
  mls_pending?: boolean;
  mls_sold?: boolean;
  size?: number;
  from?: number;
  sort?: Partial<Record<SortField, SortOrder>>;
  count?: boolean;
  ids_only?: boolean;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: PropertySearchQuery;
  resultCount: number;
  propertyIds: string[];
  createdAt: string;
  updatedAt: string;
  lastRunAt: string;
}

// Legacy types for backward compatibility
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

// ============ API Client Class ============

class RealEstateApiService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string = API_KEY, baseUrl: string = API_BASE_URL) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    method: "GET" | "POST" = "POST",
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `RealEstateAPI Error: ${response.status} - ${errorData.message || response.statusText}`,
      );
    }

    return response.json();
  }

  // ============ Property Search ============

  async searchProperties(
    query: PropertySearchQuery,
  ): Promise<PropertySearchResponse> {
    return this.request<PropertySearchResponse>(
      "/PropertySearch",
      "POST",
      query as Record<string, unknown>,
    );
  }

  async countProperties(
    query: Omit<PropertySearchQuery, "count">,
  ): Promise<number> {
    const response = await this.searchProperties({ ...query, count: true });
    return response.resultCount;
  }

  async getPropertyIds(
    query: Omit<PropertySearchQuery, "ids_only">,
    maxResults = 10000,
  ): Promise<string[]> {
    const allIds: string[] = [];
    let from = 0;
    const batchSize = 1000;

    while (allIds.length < maxResults) {
      const response = await this.request<{
        data: (string | number)[];
        resultCount: number;
      }>("/PropertySearch", "POST", {
        ...query,
        ids_only: true,
        size: batchSize,
        from,
      } as Record<string, unknown>);

      const ids = response.data.map((id) => String(id));
      allIds.push(...ids);

      if (ids.length < batchSize || allIds.length >= response.resultCount) {
        break;
      }
      from += batchSize;
    }

    return allIds.slice(0, maxResults);
  }

  // ============ Property Detail ============

  async getPropertyDetail(propertyId: string): Promise<PropertyDetailResponse> {
    return this.request<PropertyDetailResponse>("/PropertyDetail", "POST", {
      id: propertyId,
    });
  }

  async getPropertyDetailByAddress(
    address: string,
  ): Promise<PropertyDetailResponse> {
    return this.request<PropertyDetailResponse>("/PropertyDetail", "POST", {
      address,
    });
  }

  async getPropertyDetailByAddressParts(parts: {
    house?: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  }): Promise<PropertyDetailResponse> {
    return this.request<PropertyDetailResponse>(
      "/PropertyDetail",
      "POST",
      parts,
    );
  }

  async getPropertyDetailsBulk(
    propertyIds: string[],
  ): Promise<PropertyDetailResponse[]> {
    // Use PropertyDetailBulk endpoint for efficient batch lookups (max 250)
    const response = await this.request<{ data: PropertyDetailResponse[] }>(
      "/PropertyDetailBulk",
      "POST",
      propertyIds as unknown as Record<string, unknown>,
    );
    return response.data || [];
  }

  async getPropertyDetailsBatch(
    propertyIds: string[],
    batchSize = 250,
  ): Promise<PropertyDetailResponse[]> {
    const results: PropertyDetailResponse[] = [];

    // Process in batches of 250 (API limit)
    for (let i = 0; i < propertyIds.length; i += batchSize) {
      const batch = propertyIds.slice(i, i + batchSize);
      try {
        const batchResults = await this.getPropertyDetailsBulk(batch);
        results.push(...batchResults);
      } catch (err) {
        console.error(`Failed batch ${i / batchSize + 1}:`, err);
        // Fall back to individual calls for failed batch
        for (const id of batch) {
          try {
            const result = await this.getPropertyDetail(id);
            results.push(result);
          } catch (e) {
            console.error(`Failed to get detail for ${id}:`, e);
          }
        }
      }
    }

    return results;
  }

  // ============ Compound Search Helpers ============

  async searchAbsenteeOwners(
    location: { zip?: string; state?: string; city?: string },
    options: Partial<PropertySearchQuery> = {},
  ): Promise<PropertySearchResponse> {
    return this.searchProperties({
      ...location,
      absentee_owner: true,
      ...options,
    });
  }

  async searchHighEquity(
    location: { zip?: string; state?: string; city?: string },
    minEquity?: number,
    options: Partial<PropertySearchQuery> = {},
  ): Promise<PropertySearchResponse> {
    return this.searchProperties({
      ...location,
      high_equity: true,
      ...(minEquity && { estimated_equity_min: minEquity }),
      ...options,
    });
  }

  async searchPreForeclosure(
    location: { zip?: string; state?: string; city?: string },
    options: Partial<PropertySearchQuery> = {},
  ): Promise<PropertySearchResponse> {
    return this.searchProperties({
      ...location,
      pre_foreclosure: true,
      ...options,
    });
  }

  async searchVacant(
    location: { zip?: string; state?: string; city?: string },
    options: Partial<PropertySearchQuery> = {},
  ): Promise<PropertySearchResponse> {
    return this.searchProperties({
      ...location,
      vacant: true,
      ...options,
    });
  }

  async searchInvestorTargets(
    location: { zip?: string; state?: string; city?: string },
    options: Partial<PropertySearchQuery> = {},
  ): Promise<PropertySearchResponse> {
    return this.searchProperties({
      ...location,
      absentee_owner: true,
      high_equity: true,
      sort: { years_owned: "desc" },
      ...options,
    });
  }

  // ============ Saved Search / ID Tracking ============

  async runSavedSearchForIds(query: PropertySearchQuery): Promise<{
    count: number;
    ids: string[];
  }> {
    const [countResponse, ids] = await Promise.all([
      this.searchProperties({ ...query, count: true }),
      this.getPropertyIds(query),
    ]);

    return {
      count: countResponse.resultCount,
      ids,
    };
  }

  detectChanges(
    previousIds: string[],
    currentIds: string[],
  ): {
    added: string[];
    removed: string[];
    unchanged: string[];
  } {
    const prevSet = new Set(previousIds);
    const currSet = new Set(currentIds);

    return {
      added: currentIds.filter((id) => !prevSet.has(id)),
      removed: previousIds.filter((id) => !currSet.has(id)),
      unchanged: currentIds.filter((id) => prevSet.has(id)),
    };
  }

  // ============ Legacy Methods ============

  async fetchProperties(
    zipCode: string,
    limit = 100,
  ): Promise<RealEstateApiProperty[]> {
    const response = await this.searchProperties({ zip: zipCode, size: limit });

    return response.data.map((prop) => ({
      REI_ID: prop.id,
      "Lot Width": Math.sqrt(prop.lotSquareFeet) || 0,
      "Lot Depth": Math.sqrt(prop.lotSquareFeet) || 0,
      Block: "",
      Lot: "",
      "Zoning Code": prop.propertyUse || "",
      Neighborhood: prop.neighborhood?.name || "",
      "Absentee Owner": prop.absenteeOwner,
      Vacant: prop.vacant,
      "Loan Type": prop.loanTypeCode || "",
      "Lender Name": prop.lenderName || "",
      "Lis Pendens Date": prop.preForeclosure ? prop.lastUpdateDate : null,
      "Judgment Date": null,
      "Auction Schedule Date": prop.auctionDate,
      "Sale Date": prop.lastSaleDate,
      "Owner Phone": null,
      "Owner Mobile": null,
      "Owner Work Phone": null,
      "Property Manager Phone": null,
    }));
  }

  async transformData(
    apiData: RealEstateApiProperty[],
  ): Promise<EnrichedPropertyRecord[]> {
    return apiData.map((property) => ({
      meta: {
        record_id: `REC-${property.REI_ID}`,
        real_estate_api_id: property.REI_ID,
        zoho_unique_id: "",
      },
      property: {
        address: "",
        city: "",
        state: "",
        zip: "",
        county: "",
        zoning: property["Zoning Code"],
        lot_size_sqft: property["Lot Width"] * property["Lot Depth"],
        building_sqft: 0,
        property_type: "Residential",
        year_built: 0,
      },
      owner: {
        name: "",
        type: property["Absentee Owner"] ? "LLC" : "Individual",
        mailing_address: "",
      },
      contact: {
        phone: property["Owner Phone"] || "",
        phoneNumbers: [],
        email: "",
        verified: false,
        skip_trace_score: 0,
      },
      event_flags: {
        pre_foreclosure: property["Lis Pendens Date"] !== null,
        lis_pendens: property["Lis Pendens Date"] !== null,
        auction_scheduled: property["Auction Schedule Date"] !== null,
        judgment: property["Judgment Date"] !== null,
        deceased_owner: false,
        absentee_owner: property["Absentee Owner"],
        vacant: property["Vacant"],
      },
    }));
  }

  async applyAutoTags(
    records: EnrichedPropertyRecord[],
    _tagRules: ApiTag[],
  ): Promise<EnrichedPropertyRecord[]> {
    return records;
  }

  async verifyWithTwilio(
    records: EnrichedPropertyRecord[],
  ): Promise<EnrichedPropertyRecord[]> {
    return records;
  }

  async syncWithZoho(
    records: EnrichedPropertyRecord[],
  ): Promise<EnrichedPropertyRecord[]> {
    return records;
  }
}

// Export singleton instance
export const realEstateApi = new RealEstateApiService();

// Legacy function exports
export async function fetchPropertiesFromRealEstateApi(
  _apiKey: string,
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
