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
}

export interface BusinessLead {
  id: string;
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  title?: string;
}

export interface SearchBusinessListResult {
  estimatedTotalHits: number;
  limit: number;
  offset: number;
  hits: BusinessLead[];
}
