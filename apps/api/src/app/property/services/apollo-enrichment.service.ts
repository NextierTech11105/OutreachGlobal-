import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

export interface ApolloBusinessData {
  name: string;
  domain: string;
  phoneNumbers: string[];
  employees: number;
  revenue: number;
  industry: string;
  keywords: string[];
  technologies: string[];
  linkedinUrl: string;
  twitterUrl: string;
  facebookUrl: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  contacts: Array<{
    name: string;
    title: string;
    email: string;
    phone: string;
    linkedinUrl: string;
  }>;
}

export interface EnrichedBusinessProperty {
  propertyData: any;
  apolloData: ApolloBusinessData | null;
  enrichmentStatus: "success" | "partial" | "failed";
  enrichmentScore: number;
  signals: {
    hasWebsite: boolean;
    hasContacts: boolean;
    employeeCount: number;
    revenueRange: string;
    industry: string;
    businessAge: number;
    digitalPresence: boolean;
  };
}

@Injectable()
export class ApolloEnrichmentService {
  private apolloApiKey: string;
  private apolloBaseUrl = "https://api.apollo.io/v1";

  constructor(private config: ConfigService) {
    this.apolloApiKey = this.config.get<string>("APOLLO_API_KEY") || "";
    if (!this.apolloApiKey) {
      console.warn("Apollo API key not configured - enrichment will be disabled");
    }
  }

  async enrichBusinessProperty(propertyData: any): Promise<EnrichedBusinessProperty> {
    if (!this.apolloApiKey) {
      return {
        propertyData,
        apolloData: null,
        enrichmentStatus: "failed",
        enrichmentScore: 0,
        signals: this.getDefaultSignals(),
      };
    }

    try {
      const businessAddress = this.extractBusinessAddress(propertyData);

      const apolloData = await this.searchApolloByAddress(businessAddress);

      if (!apolloData) {
        return {
          propertyData,
          apolloData: null,
          enrichmentStatus: "failed",
          enrichmentScore: 0,
          signals: this.getDefaultSignals(),
        };
      }

      const signals = this.calculateSignals(apolloData);
      const enrichmentScore = this.calculateEnrichmentScore(apolloData, signals);

      return {
        propertyData,
        apolloData,
        enrichmentStatus: enrichmentScore > 50 ? "success" : "partial",
        enrichmentScore,
        signals,
      };
    } catch (error) {
      console.error("Apollo enrichment failed:", error);
      return {
        propertyData,
        apolloData: null,
        enrichmentStatus: "failed",
        enrichmentScore: 0,
        signals: this.getDefaultSignals(),
      };
    }
  }

  async enrichBusinessBatch(properties: any[]): Promise<EnrichedBusinessProperty[]> {
    const batchSize = 10;
    const results: EnrichedBusinessProperty[] = [];

    for (let i = 0; i < properties.length; i += batchSize) {
      const batch = properties.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((prop) => this.enrichBusinessProperty(prop)),
      );
      results.push(...batchResults);

      await this.delay(1000);
    }

    return results;
  }

  private async searchApolloByAddress(address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  }): Promise<ApolloBusinessData | null> {
    try {
      const response = await axios.post(
        `${this.apolloBaseUrl}/organizations/search`,
        {
          q_organization_name: "",
          organization_locations: [`${address.city}, ${address.state}`],
          page: 1,
          per_page: 1,
        },
        {
          headers: {
            "Cache-Control": "no-cache",
            "Content-Type": "application/json",
            "X-Api-Key": this.apolloApiKey,
          },
        },
      );

      if (!response.data?.organizations?.length) {
        return null;
      }

      const org = response.data.organizations[0];

      return {
        name: org.name || "",
        domain: org.website_url || "",
        phoneNumbers: org.phone_numbers || [],
        employees: org.estimated_num_employees || 0,
        revenue: this.parseRevenue(org.estimated_annual_revenue),
        industry: org.industry || "",
        keywords: org.keywords || [],
        technologies: org.technologies || [],
        linkedinUrl: org.linkedin_url || "",
        twitterUrl: org.twitter_url || "",
        facebookUrl: org.facebook_url || "",
        address: {
          street: address.street,
          city: org.city || address.city,
          state: org.state || address.state,
          zip: address.zip,
          country: org.country || "US",
        },
        contacts: [],
      };
    } catch (error) {
      console.error("Apollo API error:", error);
      return null;
    }
  }

  async getBusinessContacts(
    organizationId: string,
    jobTitles: string[] = ["Owner", "CEO", "President", "Partner"],
  ): Promise<any[]> {
    try {
      const response = await axios.post(
        `${this.apolloBaseUrl}/people/search`,
        {
          organization_ids: [organizationId],
          person_titles: jobTitles,
          page: 1,
          per_page: 10,
        },
        {
          headers: {
            "Cache-Control": "no-cache",
            "Content-Type": "application/json",
            "X-Api-Key": this.apolloApiKey,
          },
        },
      );

      return (
        response.data?.people?.map((person: any) => ({
          name: person.name || "",
          title: person.title || "",
          email: person.email || "",
          phone: person.phone_numbers?.[0] || "",
          linkedinUrl: person.linkedin_url || "",
        })) || []
      );
    } catch (error) {
      console.error("Apollo contacts API error:", error);
      return [];
    }
  }

  private extractBusinessAddress(propertyData: any): {
    street: string;
    city: string;
    state: string;
    zip: string;
  } {
    return {
      street: propertyData.address?.streetAddress || propertyData.address || "",
      city: propertyData.address?.city || propertyData.city || "",
      state: propertyData.address?.state || propertyData.state || "",
      zip: propertyData.address?.zip || propertyData.zipCode || "",
    };
  }

  private calculateSignals(apolloData: ApolloBusinessData): {
    hasWebsite: boolean;
    hasContacts: boolean;
    employeeCount: number;
    revenueRange: string;
    industry: string;
    businessAge: number;
    digitalPresence: boolean;
  } {
    const hasWebsite = !!apolloData.domain;
    const hasContacts = apolloData.contacts.length > 0;
    const digitalPresence =
      hasWebsite || !!apolloData.linkedinUrl || !!apolloData.twitterUrl;

    let revenueRange = "Unknown";
    if (apolloData.revenue > 0) {
      if (apolloData.revenue < 1000000) revenueRange = "<$1M";
      else if (apolloData.revenue < 5000000) revenueRange = "$1M-$5M";
      else if (apolloData.revenue < 10000000) revenueRange = "$5M-$10M";
      else if (apolloData.revenue < 50000000) revenueRange = "$10M-$50M";
      else revenueRange = "$50M+";
    }

    return {
      hasWebsite,
      hasContacts,
      employeeCount: apolloData.employees,
      revenueRange,
      industry: apolloData.industry,
      businessAge: 0,
      digitalPresence,
    };
  }

  private calculateEnrichmentScore(
    apolloData: ApolloBusinessData,
    signals: any,
  ): number {
    let score = 0;

    if (apolloData.name) score += 10;
    if (apolloData.domain) score += 20;
    if (apolloData.phoneNumbers.length > 0) score += 15;
    if (apolloData.employees > 0) score += 15;
    if (apolloData.revenue > 0) score += 15;
    if (apolloData.industry) score += 10;
    if (apolloData.contacts.length > 0) score += 15;

    return Math.min(score, 100);
  }

  private getDefaultSignals() {
    return {
      hasWebsite: false,
      hasContacts: false,
      employeeCount: 0,
      revenueRange: "Unknown",
      industry: "Unknown",
      businessAge: 0,
      digitalPresence: false,
    };
  }

  private parseRevenue(revenueString: string): number {
    if (!revenueString) return 0;

    const cleanStr = revenueString.replace(/[$,]/g, "");
    const match = cleanStr.match(/(\d+\.?\d*)\s*(M|K|B)?/i);

    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2]?.toUpperCase();

    if (unit === "B") return value * 1000000000;
    if (unit === "M") return value * 1000000;
    if (unit === "K") return value * 1000;

    return value;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async filterBlueCollarBusinesses(
    enrichedProperties: EnrichedBusinessProperty[],
  ): Promise<EnrichedBusinessProperty[]> {
    const blueCollarIndustries = [
      "construction",
      "plumbing",
      "electrical",
      "hvac",
      "roofing",
      "landscaping",
      "cleaning",
      "pest control",
      "auto repair",
      "mechanic",
      "painting",
      "flooring",
      "carpentry",
      "welding",
      "masonry",
      "excavation",
    ];

    return enrichedProperties.filter((prop) => {
      if (!prop.apolloData) return false;

      const industry = prop.apolloData.industry.toLowerCase();
      const name = prop.apolloData.name.toLowerCase();
      const keywords = prop.apolloData.keywords.map((k) => k.toLowerCase());

      return blueCollarIndustries.some(
        (blueCollar) =>
          industry.includes(blueCollar) ||
          name.includes(blueCollar) ||
          keywords.some((k) => k.includes(blueCollar)),
      );
    });
  }
}
