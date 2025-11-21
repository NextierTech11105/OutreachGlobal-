// Advanced RealEstateAPI Types - Supporting Full API Capabilities

export interface PropertySearchOptions {
  // Basic filters
  state?: string;
  city?: string;
  zip?: string | string[];
  county?: string;

  // Property characteristics
  property_type?: 'SFR' | 'CONDO' | 'TOWNHOUSE' | 'MFR' | 'LAND' | 'MOBILE' | 'OTHER';
  property_use_code?: number[];
  beds_min?: number;
  beds_max?: number;
  baths_min?: number;
  baths_max?: number;
  year_built_min?: number;
  year_built_max?: number;
  living_square_feet_min?: number;
  living_square_feet_max?: number;
  lot_size_min?: number;
  lot_size_max?: number;

  // Value & equity
  estimated_value_min?: number;
  estimated_value_max?: number;
  equity_percent_min?: number;
  equity_percent_max?: number;

  // Owner characteristics
  absentee_owner?: boolean;
  corporate_owned?: boolean;
  years_owned_min?: number;
  years_owned_max?: number;
  properties_owned_min?: number;
  properties_owned_max?: number;

  // Commercial/MLS
  mls_active?: boolean;
  mfh_5plus?: boolean; // Multi-family 5+ units
  units_min?: number;
  units_max?: number;

  // Foreclosure
  pre_foreclosure?: boolean;
  notice_type?: 'NOD' | 'LIS' | 'FC';

  // Mortgage/Liens
  document_type_code?: string[];

  // Search modifiers
  size?: number;
  count?: boolean; // If true, returns count only (0 credits!)
  ids_only?: boolean; // Returns only IDs (saves credits)
  summary?: boolean; // Returns statistics instead of properties

  // Geolocation
  polygon?: Array<{ lat: number | string; lon: number | string }>;
  multi_polygon?: Array<Array<{ lat: number | string; lon: number | string }>>;
  lat?: number;
  lon?: number;
  radius?: number; // miles

  // Compound queries
  and?: Array<Record<string, any>>;
  or?: Array<Record<string, any>>;

  // Exclude filters
  exclude?: Array<Record<string, any>>;

  // Sorting
  sort?: {
    years_owned?: 'asc' | 'desc';
    equity_percent?: 'asc' | 'desc';
    year_built?: 'asc' | 'desc';
    building_size?: 'asc' | 'desc';
    lot_size?: 'asc' | 'desc';
    assessed_value?: 'asc' | 'desc';
    last_sale_date?: 'asc' | 'desc';
    estimated_equity?: 'asc' | 'desc';
    estimated_value?: 'asc' | 'desc';
  };
}

export interface PropertySearchResponse {
  data: Property[];
  total: number;
  credits: number;
  statusCode: number;
  statusMessage: string;
}

export interface PropertyCountResponse {
  count: number;
  credits: number;
  statusCode: number;
  statusMessage: string;
}

export interface PropertySummaryResponse {
  summary: {
    total_properties: number;
    vacant: number;
    absentee: number;
    corporate_owned: number;
    pre_foreclosure: number;
    high_equity: number;
    [key: string]: number;
  };
  credits: number;
  statusCode: number;
  statusMessage: string;
}

export interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  county: string;

  // Property details
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  yearBuilt: number;
  livingSquareFeet: number;
  lotSize: number;

  // Owner info
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail?: string;
  ownerPhone?: string;
  absenteeOwner: boolean;
  corporateOwned: boolean;
  yearsOwned: number;
  propertiesOwned: number;

  // Mailing address
  mailAddress?: string;
  mailCity?: string;
  mailState?: string;
  mailZip?: string;

  // Value & equity
  estimatedValue: number;
  estimatedEquity: number;
  equityPercent: number;
  assessedValue: number;
  lastSalePrice: number;
  lastSaleDate: string;

  // Mortgage info
  mortgage1Amount?: number;
  mortgage1Date?: string;
  mortgage1Lender?: string;

  // MLS
  mlsActive?: boolean;
  mlsPrice?: number;
  mlsDate?: string;

  // Foreclosure
  preForeclosure?: boolean;
  noticeType?: string;
  noticeDate?: string;

  // Coordinates
  latitude: number;
  longitude: number;

  lastUpdateDate: string;
}

// Saved Search Types

export interface CreateSavedSearchRequest {
  search_name: string;
  search_query: PropertySearchOptions;
  list_size?: number; // Max 10,000
  meta_data?: Record<string, any>; // Custom metadata (team_id, campaign_id, etc.)
}

export interface CreateSavedSearchResponse {
  data: {
    searchId: string;
    searchName: string;
    xUserId?: string;
    results?: Property[];
    summary?: SavedSearchSummary;
  };
  credits: number;
  statusCode: number;
  statusMessage: string;
}

export interface RetrieveSavedSearchRequest {
  search_id: string;
}

export interface RetrieveSavedSearchResponse {
  data: {
    search: SavedSearch;
    results: PropertyChangeResult[];
    summary: SavedSearchSummary;
  };
  credits: number;
  statusCode: number;
  statusMessage: string;
}

export interface SavedSearch {
  searchId: string;
  accountId: number;
  xUserId?: string;
  searchName: string;
  searchQuery: string;
  list_size: number;
  lastReportDate: string;
  nextReportDate: string;
  createdAt: string;
  meta_data: Record<string, any>;
}

export interface PropertyChangeResult {
  id: string;
  changeType: 'added' | 'updated' | 'deleted' | null;
  lastUpdateDate: string;
}

export interface SavedSearchSummary {
  size: number;
  added: number;
  updated: number;
  deleted: number;
  unchanged: number;
}

export interface GetAllSavedSearchesRequest {
  filter?: {
    search_id?: string;
    x_user_id?: string;
    meta_data?: Record<string, any>;
  };
}

export interface GetAllSavedSearchesResponse {
  data: SavedSearch[];
  credits: number;
  statusCode: number;
  statusMessage: string;
}

export interface DeleteSavedSearchRequest {
  search_id: string;
}

export interface DeleteSavedSearchResponse {
  data: {
    searchId: string;
    deleted: boolean;
  };
  credits: number;
  statusCode: number;
  statusMessage: string;
}

// Property Detail Types

export interface PropertyDetailRequest {
  id: string;
}

export interface PropertyDetailResponse {
  data: Property; // Full property details
  credits: number;
  statusCode: number;
  statusMessage: string;
}

// Skip Trace Types

export interface SkipTraceRequest {
  id: string;
}

export interface SkipTraceResponse {
  data: {
    id: string;
    phones: Array<{
      number: string;
      type: 'mobile' | 'landline';
      status: 'active' | 'inactive';
    }>;
    emails: string[];
  };
  credits: number; // 2 credits per skip trace
  statusCode: number;
  statusMessage: string;
}
