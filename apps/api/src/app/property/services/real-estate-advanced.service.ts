import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance, AxiosError } from "axios";
import {
  PropertySearchOptions,
  PropertySearchResponse,
  PropertyCountResponse,
  PropertySummaryResponse,
  PropertyDetailResponse,
  CreateSavedSearchRequest,
  CreateSavedSearchResponse,
  RetrieveSavedSearchRequest,
  RetrieveSavedSearchResponse,
  GetAllSavedSearchesRequest,
  GetAllSavedSearchesResponse,
  DeleteSavedSearchRequest,
  DeleteSavedSearchResponse,
  SkipTraceRequest,
  SkipTraceResponse,
} from "../types/real-estate-advanced.type";

/**
 * Enhanced RealEstateAPI Service
 *
 * Supports the full RealEstateAPI feature set:
 * - Advanced property searches (compound queries, polygons, sorting)
 * - Saved searches with daily auto-import
 * - Skip tracing
 * - Commercial property targeting
 * - Count/Summary queries (0 credits!)
 */
@Injectable()
export class RealEstateAdvancedService {
  private readonly logger = new Logger(RealEstateAdvancedService.name);
  private http: AxiosInstance;
  private apiKey: string;
  private skipTraceKey: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get("REALESTATE_API_KEY") || "";
    this.skipTraceKey = this.configService.get("REALESTATE_SKIP_TRACE_KEY") || "";

    this.http = axios.create({
      baseURL: "https://api.realestateapi.com",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
      },
      timeout: 30000,
    });
  }

  // ==================== PROPERTY SEARCH ====================

  /**
   * Advanced Property Search
   * Supports compound queries, polygons, sorting, filtering, etc.
   */
  async searchProperties(options: PropertySearchOptions): Promise<PropertySearchResponse> {
    try {
      const { data } = await this.http.post<PropertySearchResponse>(
        "/v2/PropertySearch",
        this.buildSearchQuery(options)
      );

      this.logger.log(
        `Property search: ${data.data?.length || 0} results, ${data.credits} credits`
      );

      return data;
    } catch (error: any) {
      this.handleError("searchProperties", error);
      throw error;
    }
  }

  /**
   * Count Query - Check results before spending credits!
   * Returns count only, costs 0 credits
   */
  async countProperties(options: PropertySearchOptions): Promise<PropertyCountResponse> {
    try {
      const { data } = await this.http.post<PropertyCountResponse>(
        "/v2/PropertySearch",
        { ...this.buildSearchQuery(options), count: true }
      );

      this.logger.log(`Property count: ${data.count} properties found (0 credits)`);

      return data;
    } catch (error: any) {
      this.handleError("countProperties", error);
      throw error;
    }
  }

  /**
   * Summary Query - Get statistics about an area
   * Returns counts for vacant, absentee, etc.
   */
  async getSummary(options: PropertySearchOptions): Promise<PropertySummaryResponse> {
    try {
      const { data } = await this.http.post<PropertySummaryResponse>(
        "/v2/PropertySearch",
        { ...this.buildSearchQuery(options), summary: true }
      );

      this.logger.log(`Summary: ${JSON.stringify(data.summary)}`);

      return data;
    } catch (error: any) {
      this.handleError("getSummary", error);
      throw error;
    }
  }

  /**
   * Get Property Details by ID
   */
  async getPropertyDetail(id: string): Promise<PropertyDetailResponse> {
    try {
      const { data } = await this.http.post<PropertyDetailResponse>(
        "/v2/PropertyDetail",
        { id }
      );

      this.logger.log(`Property detail: ${id} (${data.credits} credits)`);

      return data;
    } catch (error: any) {
      this.handleError("getPropertyDetail", error);
      throw error;
    }
  }

  // ==================== SAVED SEARCHES ====================

  /**
   * Create Saved Search
   * Set up automated daily monitoring for properties
   */
  async createSavedSearch(request: CreateSavedSearchRequest): Promise<CreateSavedSearchResponse> {
    try {
      const { data } = await this.http.post<CreateSavedSearchResponse>(
        "/v1/PropertyPortfolio/SavedSearch/Create",
        {
          search_name: request.search_name,
          search_query: this.buildSearchQuery(request.search_query),
          list_size: request.list_size || 10000,
          meta_data: request.meta_data || {},
        }
      );

      this.logger.log(
        `Created saved search: ${data.data.searchId} - "${request.search_name}"`
      );

      return data;
    } catch (error: any) {
      this.handleError("createSavedSearch", error);
      throw error;
    }
  }

  /**
   * Retrieve Saved Search - Get Daily Updates
   * Returns added/updated/deleted properties
   */
  async retrieveSavedSearch(request: RetrieveSavedSearchRequest): Promise<RetrieveSavedSearchResponse> {
    try {
      const { data } = await this.http.post<RetrieveSavedSearchResponse>(
        "/v1/PropertyPortfolio/SavedSearch",
        { search_id: request.search_id }
      );

      this.logger.log(
        `Retrieved saved search: ${request.search_id} - ` +
        `Added: ${data.data.summary.added}, Updated: ${data.data.summary.updated}, ` +
        `Deleted: ${data.data.summary.deleted} (0 credits)`
      );

      return data;
    } catch (error: any) {
      this.handleError("retrieveSavedSearch", error);
      throw error;
    }
  }

  /**
   * Get All Saved Searches
   * Filter by metadata (team_id, campaign_id, etc.)
   */
  async getAllSavedSearches(request?: GetAllSavedSearchesRequest): Promise<GetAllSavedSearchesResponse> {
    try {
      const { data } = await this.http.post<GetAllSavedSearchesResponse>(
        "/v1/PropertyPortfolio/SavedSearch/List",
        { filter: request?.filter || {} }
      );

      this.logger.log(`Found ${data.data.length} saved searches`);

      return data;
    } catch (error: any) {
      this.handleError("getAllSavedSearches", error);
      throw error;
    }
  }

  /**
   * Delete Saved Search
   */
  async deleteSavedSearch(request: DeleteSavedSearchRequest): Promise<DeleteSavedSearchResponse> {
    try {
      const { data } = await this.http.post<DeleteSavedSearchResponse>(
        "/v1/PropertyPortfolio/SavedSearch/Delete",
        { search_id: request.search_id }
      );

      this.logger.log(`Deleted saved search: ${request.search_id}`);

      return data;
    } catch (error: any) {
      this.handleError("deleteSavedSearch", error);
      throw error;
    }
  }

  // ==================== SKIP TRACING ====================

  /**
   * Skip Trace - Get contact information
   * Costs 2 credits per property
   */
  async skipTrace(request: SkipTraceRequest): Promise<SkipTraceResponse> {
    try {
      // Use skip trace key if available
      const headers = this.skipTraceKey
        ? { "x-api-key": this.skipTraceKey }
        : { "x-api-key": this.apiKey };

      const { data } = await this.http.post<SkipTraceResponse>(
        "/v2/SkipTrace",
        { id: request.id },
        { headers }
      );

      this.logger.log(`Skip traced: ${request.id} (${data.credits} credits)`);

      return data;
    } catch (error: any) {
      this.handleError("skipTrace", error);
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Build search query from options
   * Handles all advanced features
   */
  private buildSearchQuery(options: PropertySearchOptions): any {
    const query: any = {};

    // Basic filters
    if (options.state) query.state = options.state;
    if (options.city) query.city = options.city;
    if (options.zip) query.zip = options.zip;
    if (options.county) query.county = options.county;

    // Property characteristics
    if (options.property_type) query.property_type = options.property_type;
    if (options.property_use_code) query.property_use_code = options.property_use_code;
    if (options.beds_min) query.beds_min = options.beds_min;
    if (options.beds_max) query.beds_max = options.beds_max;
    if (options.baths_min) query.baths_min = options.baths_min;
    if (options.baths_max) query.baths_max = options.baths_max;
    if (options.year_built_min) query.year_built_min = options.year_built_min;
    if (options.year_built_max) query.year_built_max = options.year_built_max;
    if (options.living_square_feet_min) query.living_square_feet_min = options.living_square_feet_min;
    if (options.living_square_feet_max) query.living_square_feet_max = options.living_square_feet_max;
    if (options.lot_size_min) query.lot_size_min = options.lot_size_min;
    if (options.lot_size_max) query.lot_size_max = options.lot_size_max;

    // Value & equity
    if (options.estimated_value_min) query.estimated_value_min = options.estimated_value_min;
    if (options.estimated_value_max) query.estimated_value_max = options.estimated_value_max;
    if (options.equity_percent_min) query.equity_percent_min = options.equity_percent_min;
    if (options.equity_percent_max) query.equity_percent_max = options.equity_percent_max;

    // Owner characteristics
    if (options.absentee_owner !== undefined) query.absentee_owner = options.absentee_owner;
    if (options.corporate_owned !== undefined) query.corporate_owned = options.corporate_owned;
    if (options.years_owned_min) query.years_owned_min = options.years_owned_min;
    if (options.years_owned_max) query.years_owned_max = options.years_owned_max;
    if (options.properties_owned_min) query.properties_owned_min = options.properties_owned_min;
    if (options.properties_owned_max) query.properties_owned_max = options.properties_owned_max;

    // Commercial/MLS
    if (options.mls_active !== undefined) query.mls_active = options.mls_active;
    if (options.mfh_5plus !== undefined) query.mfh_5plus = options.mfh_5plus;
    if (options.units_min) query.units_min = options.units_min;
    if (options.units_max) query.units_max = options.units_max;

    // Foreclosure
    if (options.pre_foreclosure !== undefined) query.pre_foreclosure = options.pre_foreclosure;
    if (options.notice_type) query.notice_type = options.notice_type;

    // Mortgage/Liens
    if (options.document_type_code) query.document_type_code = options.document_type_code;

    // Search modifiers
    if (options.size) query.size = options.size;
    if (options.count !== undefined) query.count = options.count;
    if (options.ids_only !== undefined) query.ids_only = options.ids_only;
    if (options.summary !== undefined) query.summary = options.summary;

    // Geolocation
    if (options.polygon) query.polygon = options.polygon;
    if (options.multi_polygon) query.multi_polygon = options.multi_polygon;
    if (options.lat) query.lat = options.lat;
    if (options.lon) query.lon = options.lon;
    if (options.radius) query.radius = options.radius;

    // Compound queries
    if (options.and) query.and = options.and;
    if (options.or) query.or = options.or;

    // Exclude filters
    if (options.exclude) query.exclude = options.exclude;

    // Sorting
    if (options.sort) query.sort = options.sort;

    return query;
  }

  /**
   * Handle API errors
   */
  private handleError(method: string, error: any) {
    if (error instanceof AxiosError) {
      this.logger.error(
        `RealEstateAPI ${method} failed:`,
        error.response?.data || error.message
      );
    } else {
      this.logger.error(`RealEstateAPI ${method} failed:`, error);
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      // Test with a minimal count query (0 credits)
      await this.http.post("/v2/PropertySearch", {
        count: true,
        state: "FL",
      });

      return { healthy: true, apiKey: this.apiKey ? "Set" : "Missing" };
    } catch (error: any) {
      return {
        healthy: false,
        error: error.message,
        apiKey: this.apiKey ? "Set" : "Missing",
      };
    }
  }
}
