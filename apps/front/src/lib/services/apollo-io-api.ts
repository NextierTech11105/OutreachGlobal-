// Apollo.io API Service - B2B Data Enrichment & Contact Discovery
// API Docs: https://apolloio.github.io/apollo-api-docs/

const APOLLO_API_BASE_URL = "https://api.apollo.io/api/v1";
const APOLLO_API_KEY =
  process.env.APOLLO_IO_API_KEY ||
  process.env.NEXT_PUBLIC_APOLLO_IO_API_KEY ||
  "";

// ============ Response Types ============

export interface ApolloPerson {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  email_status: "verified" | "guessed" | "unavailable" | "bounced" | "pending";
  linkedin_url: string;
  title: string;
  photo_url: string;
  twitter_url: string | null;
  github_url: string | null;
  facebook_url: string | null;
  headline: string;
  city: string;
  state: string;
  country: string;
  seniority: string;
  departments: string[];
  subdepartments: string[];
  functions: string[];
  phone_numbers: ApolloPhone[];
  employment_history: ApolloEmployment[];
  organization_id: string;
  organization: ApolloOrganization | null;
}

export interface ApolloPhone {
  raw_number: string;
  sanitized_number: string;
  type: "work_direct" | "work_hq" | "mobile" | "personal" | "other";
  position: number;
  status: "valid" | "invalid" | "unknown";
  dnc_status: string | null;
  dnc_other_info: string | null;
}

export interface ApolloEmployment {
  id: string;
  created_at: string;
  current: boolean;
  degree: string | null;
  description: string | null;
  emails: string[] | null;
  end_date: string | null;
  grade_level: string | null;
  kind: string | null;
  major: string | null;
  organization_id: string | null;
  organization_name: string;
  raw_address: string | null;
  start_date: string | null;
  title: string;
  updated_at: string;
  key: string;
}

export interface ApolloOrganization {
  id: string;
  name: string;
  website_url: string;
  blog_url: string | null;
  angellist_url: string | null;
  linkedin_url: string;
  twitter_url: string | null;
  facebook_url: string | null;
  languages: string[];
  alexa_ranking: number | null;
  phone: string | null;
  linkedin_uid: string;
  founded_year: number | null;
  publicly_traded_symbol: string | null;
  publicly_traded_exchange: string | null;
  logo_url: string;
  crunchbase_url: string | null;
  primary_domain: string;
  sanitized_phone: string | null;
  industry: string;
  keywords: string[];
  estimated_num_employees: number | null;
  industries: string[];
  secondary_industries: string[];
  raw_address: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  owned_by_organization_id: string | null;
  suborganizations: string[];
  num_suborganizations: number;
  seo_description: string;
  short_description: string;
  annual_revenue_printed: string | null;
  annual_revenue: number | null;
  total_funding: number | null;
  total_funding_printed: string | null;
  latest_funding_round_date: string | null;
  latest_funding_stage: string | null;
  technology_names: string[];
  current_technologies: ApollioTechnology[];
  organization_revenue_in_thousands: number | null;
  account_id: string | null;
}

export interface ApollioTechnology {
  uid: string;
  name: string;
  category: string;
}

export interface ApolloSearchResponse {
  people: ApolloPerson[];
  contacts: ApolloPerson[];
  pagination: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
}

export interface ApolloEnrichResponse {
  person: ApolloPerson | null;
  organization: ApolloOrganization | null;
}

// ============ Search Query Types ============

export interface ApolloPersonSearchQuery {
  q_organization_domains?: string[];
  q_organization_name?: string;
  q_organization_keyword_tags?: string[];
  person_titles?: string[];
  person_not_titles?: string[];
  person_seniorities?: (
    | "owner"
    | "founder"
    | "c_suite"
    | "partner"
    | "vp"
    | "head"
    | "director"
    | "manager"
    | "senior"
    | "entry"
    | "intern"
  )[];
  q_keywords?: string;
  person_locations?: string[];
  organization_locations?: string[];
  organization_num_employees_ranges?: string[];
  organization_not_num_employees_ranges?: string[];
  organization_industry_tag_ids?: string[];
  organization_not_industry_tag_ids?: string[];
  organization_revenue_ranges?: string[];
  person_departments?: string[];
  contact_email_status?: ("verified" | "guessed" | "unavailable")[];
  page?: number;
  per_page?: number;
}

export interface ApolloOrganizationSearchQuery {
  q_organization_name?: string;
  q_organization_keyword_tags?: string[];
  organization_locations?: string[];
  organization_num_employees_ranges?: string[];
  organization_industry_tag_ids?: string[];
  organization_revenue_ranges?: string[];
  page?: number;
  per_page?: number;
}

export interface ApolloEnrichQuery {
  // Person enrichment
  email?: string;
  first_name?: string;
  last_name?: string;
  linkedin_url?: string;
  organization_name?: string;
  domain?: string;
  // Organization enrichment
  reveal_personal_emails?: boolean;
  reveal_phone_number?: boolean;
}

// ============ Contact Types (for saving enriched people) ============

export interface ApolloContactInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  organization_name?: string;
  website_url?: string;
  direct_phone?: string;
  mobile_phone?: string;
  title?: string;
  linkedin_url?: string;
  // Additional optional fields
  present_raw_address?: string;
  city?: string;
  state?: string;
  country?: string;
  label_names?: string[];
  contact_stage_id?: string;
  typed_custom_fields?: Record<string, unknown>;
}

export interface ApolloContact {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  email: string | null;
  linkedin_url: string | null;
  title: string | null;
  contact_stage_id: string;
  owner_id: string;
  creator_id: string;
  person_id: string | null;
  organization_name: string | null;
  organization_id: string | null;
  source: string;
  original_source: string;
  photo_url: string | null;
  phone_numbers: ApolloPhone[];
  created_at: string;
  updated_at: string;
}

// ============ API Client ============

class ApolloIoApiService {
  private apiKey: string;
  private baseUrl: string;

  constructor(
    apiKey: string = APOLLO_API_KEY,
    baseUrl: string = APOLLO_API_BASE_URL,
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    method: "GET" | "POST" = "POST",
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Apollo.io uses api_key in the request body, not header
    const requestBody = body
      ? { ...body, api_key: this.apiKey }
      : { api_key: this.apiKey };

    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Apollo.io API Error: ${response.status} - ${errorData.message || response.statusText}`,
      );
    }

    return response.json();
  }

  // ============ People Search ============

  async searchPeople(
    query: ApolloPersonSearchQuery,
  ): Promise<ApolloSearchResponse> {
    return this.request<ApolloSearchResponse>(
      "/mixed_people/search",
      "POST",
      query as Record<string, unknown>,
    );
  }

  async searchPeopleByCompany(
    domain: string,
    options: Partial<ApolloPersonSearchQuery> = {},
  ): Promise<ApolloSearchResponse> {
    return this.searchPeople({
      q_organization_domains: [domain],
      ...options,
    });
  }

  async searchDecisionMakers(
    domain: string,
    options: Partial<ApolloPersonSearchQuery> = {},
  ): Promise<ApolloSearchResponse> {
    return this.searchPeople({
      q_organization_domains: [domain],
      person_seniorities: [
        "owner",
        "founder",
        "c_suite",
        "partner",
        "vp",
        "head",
        "director",
      ],
      ...options,
    });
  }

  async searchByTitle(
    titles: string[],
    options: Partial<ApolloPersonSearchQuery> = {},
  ): Promise<ApolloSearchResponse> {
    return this.searchPeople({
      person_titles: titles,
      ...options,
    });
  }

  // ============ Organization Search ============

  async searchOrganizations(query: ApolloOrganizationSearchQuery): Promise<{
    organizations: ApolloOrganization[];
    pagination: ApolloSearchResponse["pagination"];
  }> {
    return this.request(
      "/mixed_companies/search",
      "POST",
      query as Record<string, unknown>,
    );
  }

  async searchOrganizationsByIndustry(
    industries: string[],
    options: Partial<ApolloOrganizationSearchQuery> = {},
  ): Promise<{
    organizations: ApolloOrganization[];
    pagination: ApolloSearchResponse["pagination"];
  }> {
    return this.searchOrganizations({
      organization_industry_tag_ids: industries,
      ...options,
    });
  }

  // ============ Enrichment ============

  async enrichPerson(query: ApolloEnrichQuery): Promise<ApolloEnrichResponse> {
    return this.request<ApolloEnrichResponse>(
      "/people/match",
      "POST",
      query as Record<string, unknown>,
    );
  }

  async enrichPersonByEmail(email: string): Promise<ApolloEnrichResponse> {
    return this.enrichPerson({ email, reveal_phone_number: true });
  }

  async enrichPersonByLinkedIn(
    linkedinUrl: string,
  ): Promise<ApolloEnrichResponse> {
    return this.enrichPerson({
      linkedin_url: linkedinUrl,
      reveal_phone_number: true,
    });
  }

  async enrichOrganization(
    domain: string,
  ): Promise<{ organization: ApolloOrganization | null }> {
    return this.request("/organizations/enrich", "POST", { domain });
  }

  // ============ Contacts API ============

  /**
   * Create a contact in Apollo from enriched person data.
   * This saves the contact to your Apollo account so you don't consume credits
   * when enriching the same person again.
   */
  async createContact(
    input: ApolloContactInput,
  ): Promise<{ contact: ApolloContact }> {
    return this.request<{ contact: ApolloContact }>(
      "/contacts",
      "POST",
      input as Record<string, unknown>,
    );
  }

  /**
   * Convert an enriched person to a contact to save credits on future lookups.
   */
  async createContactFromEnrichedPerson(
    person: ApolloPerson,
  ): Promise<{ contact: ApolloContact }> {
    const mobilePhone = person.phone_numbers?.find(
      (p) => p.type === "mobile",
    )?.raw_number;
    const directPhone = person.phone_numbers?.find(
      (p) => p.type === "work_direct",
    )?.raw_number;

    return this.createContact({
      first_name: person.first_name,
      last_name: person.last_name,
      email: person.email,
      organization_name: person.organization?.name,
      website_url: person.organization?.website_url,
      title: person.title,
      linkedin_url: person.linkedin_url,
      mobile_phone: mobilePhone,
      direct_phone: directPhone,
      city: person.city,
      state: person.state,
      country: person.country,
    });
  }

  /**
   * Bulk create contacts from enriched people
   */
  async createContactsBulk(
    people: ApolloPerson[],
    concurrency = 5,
  ): Promise<{ contact: ApolloContact }[]> {
    const results: { contact: ApolloContact }[] = [];

    for (let i = 0; i < people.length; i += concurrency) {
      const batch = people.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map((p) =>
          this.createContactFromEnrichedPerson(p).catch((err) => {
            console.error("Create contact failed:", err);
            return { contact: null as unknown as ApolloContact };
          }),
        ),
      );
      results.push(...batchResults.filter((r) => r.contact));
    }

    return results;
  }

  // ============ Bulk Operations ============

  async enrichPeopleBulk(
    queries: ApolloEnrichQuery[],
    concurrency = 5,
  ): Promise<ApolloEnrichResponse[]> {
    const results: ApolloEnrichResponse[] = [];

    for (let i = 0; i < queries.length; i += concurrency) {
      const batch = queries.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map((q) =>
          this.enrichPerson(q).catch((err) => {
            console.error("Enrich failed:", err);
            return { person: null, organization: null };
          }),
        ),
      );
      results.push(...batchResults);
    }

    return results;
  }

  // ============ Commercial Real Estate Searches ============

  async searchCommercialRealEstateContacts(
    location?: string,
    options: Partial<ApolloPersonSearchQuery> = {},
  ): Promise<ApolloSearchResponse> {
    return this.searchPeople({
      person_titles: [
        "Property Manager",
        "Asset Manager",
        "Real Estate Manager",
        "Director of Real Estate",
        "VP of Real Estate",
        "Commercial Property Manager",
        "Facilities Manager",
        "Director of Facilities",
        "Leasing Manager",
        "Portfolio Manager",
      ],
      ...(location && { person_locations: [location] }),
      ...options,
    });
  }

  async searchPropertyOwners(
    location?: string,
    options: Partial<ApolloPersonSearchQuery> = {},
  ): Promise<ApolloSearchResponse> {
    return this.searchPeople({
      person_titles: [
        "Owner",
        "Principal",
        "Managing Partner",
        "CEO",
        "President",
        "Founder",
      ],
      q_organization_keyword_tags: [
        "real estate",
        "property",
        "commercial real estate",
        "property management",
        "real estate investment",
      ],
      ...(location && { organization_locations: [location] }),
      ...options,
    });
  }

  async searchInvestmentFirmContacts(
    options: Partial<ApolloPersonSearchQuery> = {},
  ): Promise<ApolloSearchResponse> {
    return this.searchPeople({
      person_seniorities: ["owner", "founder", "c_suite", "partner", "vp"],
      q_organization_keyword_tags: [
        "real estate investment",
        "private equity real estate",
        "reit",
        "real estate fund",
        "commercial real estate investment",
      ],
      ...options,
    });
  }

  // ============ B2B Prospect Searches ============

  async searchB2BProspects(
    industry: string,
    location?: string,
    employeeRange?: string,
    options: Partial<ApolloPersonSearchQuery> = {},
  ): Promise<ApolloSearchResponse> {
    const query: ApolloPersonSearchQuery = {
      person_seniorities: [
        "owner",
        "founder",
        "c_suite",
        "partner",
        "vp",
        "head",
        "director",
      ],
      ...options,
    };

    if (industry) {
      query.q_organization_keyword_tags = [industry];
    }
    if (location) {
      query.organization_locations = [location];
    }
    if (employeeRange) {
      query.organization_num_employees_ranges = [employeeRange];
    }

    return this.searchPeople(query);
  }
}

// Export singleton instance
export const apolloIoApi = new ApolloIoApiService();

// Helper function for commercial real estate B2B searches
export async function searchCommercialRealEstateB2B(params: {
  location?: string;
  propertyType?: string;
  page?: number;
  perPage?: number;
}) {
  const { location, propertyType, page = 1, perPage = 25 } = params;

  const titles =
    propertyType === "industrial"
      ? [
          "Warehouse Manager",
          "Logistics Manager",
          "Distribution Manager",
          "Industrial Property Manager",
        ]
      : propertyType === "retail"
        ? [
            "Retail Manager",
            "Store Manager",
            "Regional Manager",
            "Retail Property Manager",
          ]
        : propertyType === "office"
          ? [
              "Office Manager",
              "Facilities Manager",
              "Workplace Manager",
              "Corporate Real Estate",
            ]
          : [
              "Property Manager",
              "Asset Manager",
              "Real Estate Manager",
              "Portfolio Manager",
            ];

  return apolloIoApi.searchPeople({
    person_titles: titles,
    ...(location && { organization_locations: [location] }),
    page,
    per_page: perPage,
  });
}
