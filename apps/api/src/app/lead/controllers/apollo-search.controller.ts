import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { UseAuthGuard } from "@/app/auth/decorators";

interface SearchParams {
  searchQuery?: string;
  state?: string[];
  title?: string[];
  company_name?: string[];
  company_domain?: string[];
  industry?: string[];
}

interface ApolloPerson {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  title?: string;
  email?: string;
  phone_numbers?: Array<{ sanitized_number?: string }>;
  city?: string;
  state?: string;
  country?: string;
  organization?: {
    name?: string;
    website_url?: string;
    estimated_num_employees?: number;
    industry?: string;
    annual_revenue?: number;
  };
  linkedin_url?: string;
}

// INTERNAL API - Requires JWT authentication
// This controller proxies requests to Apollo.io API using server-side credentials
@Controller("business-list")
@UseAuthGuard()
export class ApolloSearchController {
  private readonly apolloApiKey: string;
  private readonly apolloApiBase = "https://api.apollo.io/v1";

  constructor(private configService: ConfigService) {
    this.apolloApiKey = this.configService.get("APOLLO_API_KEY") || "";
  }

  @Post("search")
  async search(@Body() body: SearchParams) {
    if (!this.apolloApiKey) {
      return {
        hits: [],
        estimatedTotalHits: 0,
        error: "Apollo API key not configured",
      };
    }

    try {
      const {
        searchQuery,
        state,
        title,
        company_name,
        company_domain,
        industry,
      } = body;

      // Build Apollo search parameters
      const searchParams: Record<string, unknown> = {
        page: 1,
        per_page: 25,
      };

      if (searchQuery) {
        searchParams.q_keywords = searchQuery;
      }

      // Default to decision makers if no title specified
      if (title?.length) {
        searchParams.person_titles = title;
      } else {
        // Default: search for owners, CEOs, presidents, founders
        searchParams.person_titles = [
          "Owner",
          "CEO",
          "Chief Executive Officer",
          "President",
          "Founder",
          "Co-Founder",
          "Managing Director",
          "Principal",
          "Partner",
        ];
      }

      if (company_name?.length) {
        searchParams.q_organization_name = company_name[0];
      }

      if (company_domain?.length) {
        searchParams.organization_domains = company_domain;
      }

      if (industry?.length) {
        // Use organization_industry_keywords for text-based industry filtering
        searchParams.q_organization_industry_keywords = industry;
      }

      if (state?.length) {
        searchParams.person_locations = state.map(
          (s: string) => `United States, ${s}`,
        );
      }

      const response = await axios.post(
        `${this.apolloApiBase}/mixed_people/search`,
        searchParams,
        {
          headers: {
            "Content-Type": "application/json",
            "X-Api-Key": this.apolloApiKey,
          },
        },
      );

      const data = response.data;

      // Transform Apollo results to match expected format
      const hits = (data.people || []).map((person: ApolloPerson) => ({
        id: person.id,
        name:
          person.name ||
          `${person.first_name || ""} ${person.last_name || ""}`.trim(),
        title: person.title || null,
        email: person.email || null,
        phone: person.phone_numbers?.[0]?.sanitized_number || null,
        address: null,
        city: person.city || null,
        state: person.state || null,
        company_name: person.organization?.name || null,
        company_domain:
          person.organization?.website_url
            ?.replace(/^https?:\/\//, "")
            .replace(/\/$/, "") || null,
        employees: person.organization?.estimated_num_employees || null,
        industry: person.organization?.industry || null,
        revenue: person.organization?.annual_revenue
          ? person.organization.annual_revenue * 100
          : null,
        linkedin_url: person.linkedin_url || null,
      }));

      return {
        hits,
        estimatedTotalHits: data.pagination?.total_entries || hits.length,
      };
    } catch (error) {
      console.error("Apollo search error:", error);
      if (axios.isAxiosError(error)) {
        throw new HttpException(
          error.response?.data?.message || "Apollo search failed",
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        "Search failed",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("companies")
  async searchCompanies(
    @Body()
    body: {
      name?: string;
      industry?: string[];
      state?: string[];
      city?: string[];
      employees_min?: number;
      employees_max?: number;
      revenue_min?: number;
      revenue_max?: number;
    },
  ) {
    if (!this.apolloApiKey) {
      return {
        hits: [],
        estimatedTotalHits: 0,
        error: "Apollo API key not configured",
      };
    }

    try {
      const {
        name,
        industry,
        state,
        city,
        employees_min,
        employees_max,
        revenue_min,
        revenue_max,
      } = body;

      // Build Apollo organization search parameters
      const searchParams: Record<string, unknown> = {
        page: 1,
        per_page: 25,
      };

      if (name) {
        searchParams.q_organization_name = name;
      }

      if (industry?.length) {
        searchParams.q_organization_keyword_tags = industry;
      }

      if (state?.length) {
        searchParams.organization_locations = state.map(
          (s: string) => `United States, ${s}`,
        );
      }

      if (city?.length) {
        searchParams.organization_locations = city;
      }

      if (employees_min || employees_max) {
        searchParams.organization_num_employees_ranges = [];
        if (employees_min && employees_max) {
          (searchParams.organization_num_employees_ranges as string[]).push(
            `${employees_min},${employees_max}`,
          );
        } else if (employees_min) {
          (searchParams.organization_num_employees_ranges as string[]).push(
            `${employees_min},`,
          );
        } else if (employees_max) {
          (searchParams.organization_num_employees_ranges as string[]).push(
            `,${employees_max}`,
          );
        }
      }

      const response = await axios.post(
        `${this.apolloApiBase}/mixed_companies/search`,
        searchParams,
        {
          headers: {
            "Content-Type": "application/json",
            "X-Api-Key": this.apolloApiKey,
          },
        },
      );

      const data = response.data;

      // Transform Apollo organization results
      const hits = (data.organizations || data.accounts || []).map(
        (org: {
          id: string;
          name?: string;
          website_url?: string;
          industry?: string;
          estimated_num_employees?: number;
          annual_revenue?: number;
          city?: string;
          state?: string;
          country?: string;
          phone?: string;
          linkedin_url?: string;
          founded_year?: number;
        }) => ({
          id: org.id,
          name: org.name || null,
          domain:
            org.website_url?.replace(/^https?:\/\//, "").replace(/\/$/, "") ||
            null,
          website: org.website_url || null,
          industry: org.industry || null,
          employees: org.estimated_num_employees || null,
          revenue: org.annual_revenue || null,
          city: org.city || null,
          state: org.state || null,
          country: org.country || null,
          phone: org.phone || null,
          linkedin_url: org.linkedin_url || null,
          founded_year: org.founded_year || null,
        }),
      );

      return {
        hits,
        estimatedTotalHits: data.pagination?.total_entries || hits.length,
      };
    } catch (error) {
      console.error("Apollo company search error:", error);
      if (axios.isAxiosError(error)) {
        throw new HttpException(
          error.response?.data?.message || "Company search failed",
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        "Company search failed",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
