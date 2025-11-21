export interface SearchBusinessListOptions {
  q: string;
  limit?: number;
  offset?: number;
  state?: string[];
  title?: string[];
  company_name?: string[];
  company_domain?: string[];
  industry?: string[];
  token: string;

  // Portfolio Search Filters
  properties_owned_min?: number;
  properties_owned_max?: number;
  portfolio_value_min?: number;
  portfolio_value_max?: number;
  portfolio_equity_min?: number;
  portfolio_equity_max?: number;
  portfolio_mortgage_balance_min?: number;
  portfolio_mortgage_balance_max?: number;

  // Active Buyer Discovery
  portfolio_purchased_last12_min?: number;
  portfolio_purchased_last12_max?: number;

  // Equity Filters
  estimated_equity_min?: number;
  estimated_equity_max?: number;
  equity_percent_min?: number;
  equity_percent_max?: number;
  high_equity?: boolean;
  free_clear?: boolean; // No mortgage

  // Property Value Filters
  assessed_value_min?: number;
  assessed_value_max?: number;
  value_min?: number; // Estimated value
  value_max?: number;
  last_sale_price_min?: number;
  last_sale_price_max?: number;

  // Property Characteristics
  building_size_min?: number;
  building_size_max?: number;
  lot_size_min?: number;
  lot_size_max?: number;
  beds_min?: number;
  beds_max?: number;
  baths_min?: number;
  baths_max?: number;
  units_min?: number;
  units_max?: number;
  year_built_min?: number;
  year_built_max?: number;

  // Owner Filters
  absentee_owner?: boolean;
  out_of_state_owner?: boolean;
  in_state_owner?: boolean;
  corporate_owned?: boolean;
  individual_owned?: boolean;
  years_owned_min?: number;
  years_owned_max?: number;

  // Property Type Flags
  mfh_2to4?: boolean; // 2-4 unit multi-family
  mfh_5plus?: boolean; // 5+ unit multi-family
  vacant?: boolean;
  pre_foreclosure?: boolean;
  foreclosure?: boolean;
  cash_buyer?: boolean;
  investor_buyer?: boolean;

  // Mortgage Filters
  mortgage_min?: number;
  mortgage_max?: number;
  assumable?: boolean; // Assumable mortgage
}

export interface BusinessLead {
  id: string;
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  title?: string;
  address?: string;
  city?: string;
  state?: string;
  revenue?: number;
  employees?: number;
  industry?: string;
}

export interface SearchBusinessListResult {
  estimatedTotalHits: number;
  limit: number;
  offset: number;
  hits: BusinessLead[];
}
