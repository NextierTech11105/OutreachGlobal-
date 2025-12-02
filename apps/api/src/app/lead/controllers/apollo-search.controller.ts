import { Controller, Post, Body, HttpException, HttpStatus } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

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

@Controller("api/business-list")
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
      const { searchQuery, state, title, company_name, company_domain, industry } = body;

      // Build Apollo search parameters
      const searchParams: Record<string, unknown> = {
        page: 1,
        per_page: 25,
      };

      if (searchQuery) {
        searchParams.q_keywords = searchQuery;
      }

      if (title?.length) {
        searchParams.person_titles = title;
      }

      if (company_name?.length) {
        searchParams.q_organization_name = company_name[0];
      }

      if (company_domain?.length) {
        searchParams.organization_domains = company_domain;
      }

      if (industry?.length) {
        searchParams.organization_industry_tag_ids = industry;
      }

      if (state?.length) {
        searchParams.person_locations = state.map((s: string) => `United States, ${s}`);
      }

      const response = await axios.post(
        `${this.apolloApiBase}/mixed_people/search`,
        searchParams,
        {
          headers: {
            "Content-Type": "application/json",
            "X-Api-Key": this.apolloApiKey,
          },
        }
      );

      const data = response.data;

      // Transform Apollo results to match expected format
      const hits = (data.people || []).map((person: ApolloPerson) => ({
        id: person.id,
        name: person.name || `${person.first_name || ""} ${person.last_name || ""}`.trim(),
        title: person.title || null,
        email: person.email || null,
        phone: person.phone_numbers?.[0]?.sanitized_number || null,
        address: null,
        city: person.city || null,
        state: person.state || null,
        company_name: person.organization?.name || null,
        company_domain: person.organization?.website_url?.replace(/^https?:\/\//, "").replace(/\/$/, "") || null,
        employees: person.organization?.estimated_num_employees || null,
        industry: person.organization?.industry || null,
        revenue: person.organization?.annual_revenue ? person.organization.annual_revenue * 100 : null,
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
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      throw new HttpException("Search failed", HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
