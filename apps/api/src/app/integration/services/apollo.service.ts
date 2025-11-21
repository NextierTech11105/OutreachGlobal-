import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance, AxiosError } from "axios";

// Apollo.io API Types
export interface ApolloSearchPeopleOptions {
  personTitles?: string[];
  personLocations?: string[];
  personSeniorities?: string[];
  organizationIndustryTagIds?: string[];
  organizationNumEmployeesRanges?: string[];
  q_keywords?: string;
  page?: number;
  perPage?: number;
}

export interface ApolloSearchCompaniesOptions {
  organizationLocations?: string[];
  organizationIndustryTagIds?: string[];
  organizationNumEmployeesRanges?: string[];
  q_organization_keyword?: string;
  page?: number;
  perPage?: number;
}

export interface ApolloEnrichPersonOptions {
  firstName?: string;
  lastName?: string;
  email?: string;
  linkedinUrl?: string;
  organizationName?: string;
}

export interface ApolloEnrichCompanyOptions {
  domain?: string;
  companyName?: string;
}

export interface ApolloIntentSignal {
  companyId: string;
  companyName: string;
  domain: string;
  signals: Array<{
    type: 'job_change' | 'funding' | 'hiring' | 'technology_change' | 'web_traffic';
    timestamp: string;
    description: string;
    confidence: number;
  }>;
}

@Injectable()
export class ApolloService {
  private readonly logger = new Logger(ApolloService.name);
  private http: AxiosInstance;
  private apiKey: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get("APOLLO_API_KEY") || "";

    this.http = axios.create({
      baseURL: "https://api.apollo.io/v1",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
    });

    // Add API key to all requests
    this.http.interceptors.request.use((config) => {
      config.headers["X-Api-Key"] = this.apiKey;
      return config;
    });
  }

  /**
   * Search for people (B2B contacts)
   */
  async searchPeople(options: ApolloSearchPeopleOptions) {
    try {
      const { data } = await this.http.post("/mixed_people/search", {
        person_titles: options.personTitles,
        person_locations: options.personLocations,
        person_seniorities: options.personSeniorities,
        organization_industry_tag_ids: options.organizationIndustryTagIds,
        organization_num_employees_ranges: options.organizationNumEmployeesRanges,
        q_keywords: options.q_keywords,
        page: options.page || 1,
        per_page: options.perPage || 25,
      });

      this.logger.log(`Found ${data.people?.length || 0} people`);
      return {
        people: data.people || [],
        pagination: data.pagination,
        totalResults: data.pagination?.total_entries || 0,
      };
    } catch (error) {
      this.handleError("searchPeople", error);
      throw error;
    }
  }

  /**
   * Search for companies
   */
  async searchCompanies(options: ApolloSearchCompaniesOptions) {
    try {
      const { data } = await this.http.post("/mixed_companies/search", {
        organization_locations: options.organizationLocations,
        organization_industry_tag_ids: options.organizationIndustryTagIds,
        organization_num_employees_ranges: options.organizationNumEmployeesRanges,
        q_organization_keyword: options.q_organization_keyword,
        page: options.page || 1,
        per_page: options.perPage || 25,
      });

      this.logger.log(`Found ${data.organizations?.length || 0} companies`);
      return {
        companies: data.organizations || [],
        pagination: data.pagination,
        totalResults: data.pagination?.total_entries || 0,
      };
    } catch (error) {
      this.handleError("searchCompanies", error);
      throw error;
    }
  }

  /**
   * Enrich a person (get contact info, social profiles, etc.)
   */
  async enrichPerson(options: ApolloEnrichPersonOptions) {
    try {
      const { data } = await this.http.post("/people/match", {
        first_name: options.firstName,
        last_name: options.lastName,
        email: options.email,
        linkedin_url: options.linkedinUrl,
        organization_name: options.organizationName,
        reveal_personal_emails: true,
        reveal_phone_number: true,
      });

      this.logger.log(`Enriched person: ${data.person?.name || 'Unknown'}`);
      return data.person;
    } catch (error) {
      this.handleError("enrichPerson", error);
      throw error;
    }
  }

  /**
   * Enrich a company (get firmographics, technologies, etc.)
   */
  async enrichCompany(options: ApolloEnrichCompanyOptions) {
    try {
      const { data } = await this.http.post("/organizations/enrich", {
        domain: options.domain,
        name: options.companyName,
      });

      this.logger.log(`Enriched company: ${data.organization?.name || 'Unknown'}`);
      return data.organization;
    } catch (error) {
      this.handleError("enrichCompany", error);
      throw error;
    }
  }

  /**
   * Get job changes (intent signals for people who recently changed jobs)
   */
  async getJobChanges(options: {
    personTitles?: string[];
    personLocations?: string[];
    sinceDays?: number;
  }) {
    try {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - (options.sinceDays || 30));

      const { data } = await this.http.post("/mixed_people/search", {
        person_titles: options.personTitles,
        person_locations: options.personLocations,
        person_recently_changed_jobs: true,
        page: 1,
        per_page: 100,
      });

      this.logger.log(`Found ${data.people?.length || 0} job changes`);
      return {
        jobChanges: data.people || [],
        totalResults: data.pagination?.total_entries || 0,
      };
    } catch (error) {
      this.handleError("getJobChanges", error);
      throw error;
    }
  }

  /**
   * Monitor intent signals for a list of companies
   */
  async monitorIntentSignals(companyDomains: string[]): Promise<ApolloIntentSignal[]> {
    const signals: ApolloIntentSignal[] = [];

    for (const domain of companyDomains) {
      try {
        // Get company info
        const company = await this.enrichCompany({ domain });

        if (!company) continue;

        const companySignals: ApolloIntentSignal = {
          companyId: company.id,
          companyName: company.name,
          domain: domain,
          signals: [],
        };

        // Check for hiring signals
        if (company.current_technologies?.length > 0) {
          companySignals.signals.push({
            type: 'technology_change',
            timestamp: new Date().toISOString(),
            description: `Uses technologies: ${company.current_technologies.slice(0, 5).join(', ')}`,
            confidence: 0.7,
          });
        }

        // Check for growth signals
        if (company.estimated_num_employees) {
          companySignals.signals.push({
            type: 'hiring',
            timestamp: new Date().toISOString(),
            description: `Company size: ${company.estimated_num_employees} employees`,
            confidence: 0.8,
          });
        }

        // Check for funding signals
        if (company.total_funding) {
          companySignals.signals.push({
            type: 'funding',
            timestamp: new Date().toISOString(),
            description: `Total funding: $${company.total_funding}`,
            confidence: 0.9,
          });
        }

        if (companySignals.signals.length > 0) {
          signals.push(companySignals);
        }

        // Rate limiting - 1 request per second
        await this.sleep(1000);
      } catch (error: any) {
        this.logger.warn(`Failed to monitor ${domain}:`, error.message);
        continue;
      }
    }

    this.logger.log(`Monitored ${signals.length} companies with intent signals`);
    return signals;
  }

  /**
   * Search for commercial property owners (construction, HVAC, etc.)
   */
  async searchCommercialPropertyOwners(options: {
    location?: string;
    minEmployees?: number;
    maxEmployees?: number;
  }) {
    const industries = [
      "5739cac31e32eb4f83000041", // Construction
      "5739cac31e32eb4f83000042", // HVAC
      "5739cac31e32eb4f83000043", // Plumbing
      "5739cac31e32eb4f83000044", // Electrical
      "5739cac31e32eb4f83000045", // Roofing
    ];

    const employeeRange = this.getEmployeeRange(
      options.minEmployees || 10,
      options.maxEmployees || 500
    );

    return this.searchCompanies({
      organizationLocations: options.location ? [options.location] : undefined,
      organizationIndustryTagIds: industries,
      organizationNumEmployeesRanges: [employeeRange],
      perPage: 100,
    });
  }

  /**
   * Get account health check
   */
  async healthCheck() {
    try {
      const { data } = await this.http.get("/auth/health");
      return {
        healthy: true,
        ...data,
      };
    } catch (error: any) {
      return {
        healthy: false,
        error: error.message,
      };
    }
  }

  // Helper methods

  private getEmployeeRange(min: number, max: number): string {
    if (min <= 10 && max >= 50) return "1,50";
    if (min <= 51 && max >= 200) return "51,200";
    if (min <= 201 && max >= 500) return "201,500";
    if (min <= 501 && max >= 1000) return "501,1000";
    if (min <= 1001 && max >= 5000) return "1001,5000";
    return "5001,10000";
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private handleError(method: string, error: any) {
    if (error instanceof AxiosError) {
      this.logger.error(
        `Apollo ${method} failed:`,
        error.response?.data || error.message
      );
    } else {
      this.logger.error(`Apollo ${method} failed:`, error);
    }
  }
}
