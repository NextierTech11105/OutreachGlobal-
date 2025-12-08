/**
 * RealEstateAPI Service
 * Integration with RealEstateAPI for property data and skip tracing
 */
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance, AxiosError } from "axios";

// Property Detail Types
export interface PropertyDetailRequest {
  address: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface PropertyDetailResponse {
  success: boolean;
  data?: {
    id: string;
    address: {
      address: string;
      city: string;
      state: string;
      zip: string;
      county: string;
      lat: number;
      lng: number;
    };
    characteristics: {
      propertyType: string;
      yearBuilt: number;
      bedrooms: number;
      bathrooms: number;
      squareFeet: number;
      lotSizeAcres: number;
      lotSizeSqFt: number;
      stories: number;
      units: number;
    };
    valuation: {
      estimatedValue: number;
      estimatedEquity: number;
      equityPercent: number;
      assessedValue: number;
      assessedYear: number;
    };
    mortgage: {
      loanAmount: number;
      loanType: string;
      loanDate: string;
      interestRate: number;
      maturityDate: string;
      isAdjustable: boolean;
      lender: string;
    };
    owner: {
      name: string;
      ownerType: string;
      mailingAddress: string;
      isAbsentee: boolean;
      isOutOfState: boolean;
      yearsOwned: number;
      acquisitionDate: string;
      acquisitionPrice: number;
    };
    distress: {
      preForeclosure: boolean;
      foreclosure: boolean;
      taxLien: boolean;
      vacant: boolean;
      inherited: boolean;
      divorce: boolean;
      probate: boolean;
      bankruptcy: boolean;
    };
    mls?: {
      listed: boolean;
      listingPrice: number;
      daysOnMarket: number;
      priceReduction: boolean;
      expired: boolean;
      agent: string;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

// SkipTrace Types
export interface SkipTraceRequest {
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  email?: string;
  phone?: string;
}

export interface SkipTraceResponse {
  success: boolean;
  input: Record<string, string>;
  output?: {
    identity?: {
      first_name?: string;
      last_name?: string;
      middle_name?: string;
      suffix?: string;
      aliases?: string[];
      dob?: string;
      age?: number;
      gender?: string;
    };
    phones?: Array<{
      phone_number: string;
      phone_type: string;
      carrier?: string;
      line_type?: string;
      is_connected?: boolean;
      is_primary?: boolean;
      last_seen?: string;
      score?: number;
    }>;
    emails?: Array<{
      email_address: string;
      email_type?: string;
      is_valid?: boolean;
      is_primary?: boolean;
      last_seen?: string;
      score?: number;
    }>;
    addresses?: Array<{
      street_address?: string;
      city?: string;
      state?: string;
      zip?: string;
      zip4?: string;
      county?: string;
      address_type?: string;
      is_current?: boolean;
      move_in_date?: string;
      move_out_date?: string;
      lat?: number;
      lng?: number;
    }>;
    social_profiles?: Array<{
      platform: string;
      url: string;
      username?: string;
    }>;
    demographics?: {
      education?: string;
      occupation?: string;
      employer?: string;
      income_range?: string;
      net_worth_range?: string;
      marital_status?: string;
      household_size?: number;
      has_children?: boolean;
      home_owner_status?: string;
      length_of_residence?: number;
      interests?: string[];
    };
    relatives?: Array<{
      first_name: string;
      last_name: string;
      relationship?: string;
      age?: number;
      phone?: string;
    }>;
    associates?: Array<{
      first_name: string;
      last_name: string;
      type?: string;
      phone?: string;
    }>;
  };
  error?: {
    code: string;
    message: string;
  };
  match_score?: number;
}

// Bulk SkipTrace Types
export interface BulkSkipTraceRequest {
  inputs: SkipTraceRequest[];
  webhookUrl?: string;
}

export interface BulkSkipTraceResponse {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  results?: SkipTraceResponse[];
  estimatedCompletionTime?: string;
}

@Injectable()
export class RealEstateApiService {
  private readonly logger = new Logger(RealEstateApiService.name);
  private http: AxiosInstance;
  private apiKey: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get("REAL_ESTATE_API_KEY") || this.configService.get("REALESTATE_API_KEY") || "";

    this.http = axios.create({
      baseURL: "https://api.realestateapi.com/v2",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
      },
      timeout: 30000,
    });
  }

  /**
   * Get property details by address
   */
  async getPropertyDetail(request: PropertyDetailRequest): Promise<PropertyDetailResponse> {
    try {
      const { data } = await this.http.post("/PropertyDetail", {
        address: request.address,
        city: request.city,
        state: request.state,
        zip: request.zip,
      });

      return {
        success: true,
        data: this.mapPropertyDetail(data),
      };
    } catch (error) {
      return this.handleError(error, "PropertyDetail");
    }
  }

  /**
   * Perform single skip trace lookup
   */
  async skipTrace(request: SkipTraceRequest): Promise<SkipTraceResponse> {
    try {
      const { data } = await this.http.post("/SkipTrace", {
        first_name: request.firstName,
        last_name: request.lastName,
        address: request.address,
        city: request.city,
        state: request.state,
        zip: request.zip,
        email: request.email,
        phone: request.phone,
      });

      return data as SkipTraceResponse;
    } catch (error) {
      return this.handleError(error, "SkipTrace");
    }
  }

  /**
   * Submit bulk skip trace job
   */
  async bulkSkipTrace(request: BulkSkipTraceRequest): Promise<BulkSkipTraceResponse> {
    try {
      const inputs = request.inputs.map((input) => ({
        first_name: input.firstName,
        last_name: input.lastName,
        address: input.address,
        city: input.city,
        state: input.state,
        zip: input.zip,
        email: input.email,
        phone: input.phone,
      }));

      const { data } = await this.http.post("/SkipTrace/Bulk", {
        inputs,
        webhook_url: request.webhookUrl,
      });

      return {
        jobId: data.job_id,
        status: data.status,
        totalRequests: data.total_requests,
        completedRequests: data.completed_requests || 0,
        failedRequests: data.failed_requests || 0,
        estimatedCompletionTime: data.estimated_completion_time,
      };
    } catch (error) {
      throw this.handleError(error, "BulkSkipTrace");
    }
  }

  /**
   * Check bulk skip trace job status
   */
  async getBulkSkipTraceStatus(jobId: string): Promise<BulkSkipTraceResponse> {
    try {
      const { data } = await this.http.get(`/SkipTrace/Bulk/${jobId}`);

      return {
        jobId: data.job_id,
        status: data.status,
        totalRequests: data.total_requests,
        completedRequests: data.completed_requests || 0,
        failedRequests: data.failed_requests || 0,
        results: data.results,
        estimatedCompletionTime: data.estimated_completion_time,
      };
    } catch (error) {
      throw this.handleError(error, "BulkSkipTraceStatus");
    }
  }

  /**
   * Await bulk skip trace completion with polling
   */
  async awaitBulkSkipTrace(
    jobId: string,
    options: { pollIntervalMs?: number; maxWaitMs?: number } = {}
  ): Promise<BulkSkipTraceResponse> {
    const pollInterval = options.pollIntervalMs || 5000;
    const maxWait = options.maxWaitMs || 300000; // 5 minutes default
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const status = await this.getBulkSkipTraceStatus(jobId);

      if (status.status === "completed" || status.status === "failed") {
        return status;
      }

      this.logger.log(
        `Bulk SkipTrace ${jobId}: ${status.completedRequests}/${status.totalRequests} complete`
      );

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Bulk SkipTrace job ${jobId} timed out after ${maxWait}ms`);
  }

  /**
   * Property search
   */
  async searchProperties(filters: Record<string, unknown>): Promise<{
    success: boolean;
    count: number;
    data: unknown[];
    error?: { code: string; message: string };
  }> {
    try {
      const { data } = await this.http.post("/PropertySearch", filters);

      return {
        success: true,
        count: data.resultCount || data.count || 0,
        data: data.data || data.properties || [],
      };
    } catch (error) {
      return this.handleError(error, "PropertySearch");
    }
  }

  /**
   * Map raw property detail to typed response
   */
  private mapPropertyDetail(raw: Record<string, unknown>): PropertyDetailResponse["data"] {
    return {
      id: raw.id as string || raw.propertyId as string || "",
      address: {
        address: (raw.address as Record<string, string>)?.address || raw.streetAddress as string || "",
        city: (raw.address as Record<string, string>)?.city || raw.city as string || "",
        state: (raw.address as Record<string, string>)?.state || raw.state as string || "",
        zip: (raw.address as Record<string, string>)?.zip || raw.zip as string || "",
        county: (raw.address as Record<string, string>)?.county || raw.county as string || "",
        lat: raw.latitude as number || 0,
        lng: raw.longitude as number || 0,
      },
      characteristics: {
        propertyType: raw.propertyType as string || "",
        yearBuilt: raw.yearBuilt as number || 0,
        bedrooms: raw.bedrooms as number || 0,
        bathrooms: raw.bathrooms as number || 0,
        squareFeet: raw.squareFeet as number || raw.sqft as number || 0,
        lotSizeAcres: raw.lotAcres as number || 0,
        lotSizeSqFt: raw.lotSqFt as number || 0,
        stories: raw.stories as number || 1,
        units: raw.units as number || 1,
      },
      valuation: {
        estimatedValue: raw.estimatedValue as number || 0,
        estimatedEquity: raw.estimatedEquity as number || 0,
        equityPercent: raw.equityPercent as number || 0,
        assessedValue: raw.assessedValue as number || 0,
        assessedYear: raw.assessedYear as number || 0,
      },
      mortgage: {
        loanAmount: raw.loanAmount as number || 0,
        loanType: raw.loanType as string || "",
        loanDate: raw.loanDate as string || "",
        interestRate: raw.interestRate as number || 0,
        maturityDate: raw.loanMaturityDate as string || "",
        isAdjustable: raw.adjustableRate as boolean || false,
        lender: raw.lender as string || "",
      },
      owner: {
        name: raw.owner1FullName as string || `${raw.owner1FirstName || ""} ${raw.owner1LastName || ""}`.trim(),
        ownerType: raw.ownerType as string || "individual",
        mailingAddress: raw.mailingAddress as string || "",
        isAbsentee: raw.absenteeOwner as boolean || false,
        isOutOfState: raw.outOfState as boolean || false,
        yearsOwned: raw.yearsOwned as number || 0,
        acquisitionDate: raw.lastSaleDate as string || "",
        acquisitionPrice: raw.lastSalePrice as number || 0,
      },
      distress: {
        preForeclosure: raw.preForeclosure as boolean || false,
        foreclosure: raw.foreclosure as boolean || false,
        taxLien: raw.taxLien as boolean || false,
        vacant: raw.vacant as boolean || false,
        inherited: raw.inherited as boolean || false,
        divorce: raw.divorce as boolean || false,
        probate: raw.probate as boolean || false,
        bankruptcy: raw.bankruptcy as boolean || false,
      },
      mls: raw.listed ? {
        listed: raw.listed as boolean || false,
        listingPrice: raw.listingPrice as number || 0,
        daysOnMarket: raw.daysOnMarket as number || 0,
        priceReduction: raw.priceReduction as boolean || false,
        expired: raw.listingExpired as boolean || false,
        agent: raw.listingAgent as string || "",
      } : undefined,
    };
  }

  /**
   * Handle API errors
   */
  private handleError(error: unknown, operation: string): any {
    if (error instanceof AxiosError) {
      const errorData = error.response?.data;
      this.logger.error(`${operation} failed:`, errorData || error.message);

      return {
        success: false,
        error: {
          code: errorData?.code || error.code || "API_ERROR",
          message: errorData?.message || error.message || "Unknown API error",
        },
      };
    }

    this.logger.error(`${operation} failed with unknown error:`, error);
    return {
      success: false,
      error: {
        code: "UNKNOWN_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}
