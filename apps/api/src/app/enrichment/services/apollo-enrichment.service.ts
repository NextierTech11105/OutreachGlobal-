/**
 * Apollo Enrichment Service
 * Enriches businesses with company data and executive contacts
 */
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance, AxiosError } from "axios";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { generateUlid } from "@/database/columns/ulid";
import { businesses, businessOwners, personas, personaEmails, personaPhones } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

// Apollo API Types
export interface ApolloCompanySearchRequest {
  domain?: string;
  name?: string;
  page?: number;
  per_page?: number;
}

export interface ApolloCompanyResponse {
  organization?: {
    id: string;
    name: string;
    website_url: string;
    linkedin_url: string;
    phone: string;
    founded_year: number;
    employee_count: string;
    estimated_num_employees: number;
    annual_revenue: number;
    annual_revenue_printed: string;
    industry: string;
    industries: string[];
    sic_codes: string[];
    naics_codes: string[];
    street_address: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    primary_domain: string;
    technologies: string[];
  };
  people?: ApolloPersonResult[];
}

export interface ApolloPeopleSearchRequest {
  organization_ids?: string[];
  organization_domains?: string[];
  titles?: string[];
  seniority?: string[];
  page?: number;
  per_page?: number;
}

export interface ApolloPersonResult {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  title: string;
  seniority: string;
  departments: string[];
  email: string;
  email_status: string;
  phone_numbers: Array<{
    raw_number: string;
    sanitized_number: string;
    type: string;
  }>;
  linkedin_url: string;
  organization_id: string;
  organization?: {
    id: string;
    name: string;
  };
}

export interface ApolloEnrichmentJob {
  teamId: string;
  businessId: string;
  domain?: string;
  companyName?: string;
}

export interface ApolloEnrichmentResult {
  success: boolean;
  businessId: string;
  companyUpdated: boolean;
  executivesFound: number;
  personasCreated: number;
  error?: string;
}

@Injectable()
export class ApolloEnrichmentService {
  private readonly logger = new Logger(ApolloEnrichmentService.name);
  private http: AxiosInstance;
  private apiKey: string;

  constructor(
    private configService: ConfigService,
    @InjectDB() private db: DrizzleClient,
    @InjectQueue("lead-card") private leadCardQueue: Queue,
    @InjectQueue("skiptrace") private skipTraceQueue: Queue,
  ) {
    this.apiKey = this.configService.get("APOLLO_API_KEY") || "";

    this.http = axios.create({
      baseURL: "https://api.apollo.io/v1",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "x-api-key": this.apiKey,
      },
      timeout: 30000,
    });
  }

  /**
   * Enrich a business with Apollo company and people data
   */
  async enrichBusiness(job: ApolloEnrichmentJob): Promise<ApolloEnrichmentResult> {
    const { teamId, businessId, domain, companyName } = job;

    this.logger.log(`Starting Apollo enrichment for business ${businessId}`);

    if (!domain && !companyName) {
      return {
        success: false,
        businessId,
        companyUpdated: false,
        executivesFound: 0,
        personasCreated: 0,
        error: "Either domain or company name is required",
      };
    }

    try {
      // Step 1: Enrich company
      const companyData = await this.enrichCompany(domain, companyName);
      let companyUpdated = false;

      if (companyData) {
        await this.updateBusinessWithApolloData(businessId, companyData);
        companyUpdated = true;
      }

      // Step 2: Find executives
      const organizationId = companyData?.id;
      const searchDomain = domain || companyData?.primary_domain;

      let executivesFound = 0;
      let personasCreated = 0;

      if (organizationId || searchDomain) {
        const people = await this.findExecutives(organizationId, searchDomain);
        executivesFound = people.length;

        // Step 3: Create personas for each executive
        for (const person of people) {
          const created = await this.createExecutivePersona(teamId, businessId, person);
          if (created) personasCreated++;
        }
      }

      // Update business enrichment status
      await this.db
        .update(businesses)
        .set({
          apolloEnriched: true,
          apolloEnrichedAt: new Date(),
        })
        .where(eq(businesses.id, businessId));

      this.logger.log(
        `Apollo enrichment complete for ${businessId}: company=${companyUpdated}, executives=${executivesFound}, personas=${personasCreated}`
      );

      return {
        success: true,
        businessId,
        companyUpdated,
        executivesFound,
        personasCreated,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Apollo enrichment failed for ${businessId}: ${errorMsg}`);

      return {
        success: false,
        businessId,
        companyUpdated: false,
        executivesFound: 0,
        personasCreated: 0,
        error: errorMsg,
      };
    }
  }

  /**
   * Enrich company from Apollo
   */
  private async enrichCompany(domain?: string, name?: string): Promise<ApolloCompanyResponse["organization"] | null> {
    try {
      const { data } = await this.http.post("/organizations/enrich", {
        domain,
        name,
      });

      return data.organization || null;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Find executives at a company
   */
  private async findExecutives(
    organizationId?: string,
    domain?: string
  ): Promise<ApolloPersonResult[]> {
    try {
      const request: ApolloPeopleSearchRequest = {
        per_page: 25,
        seniority: ["owner", "founder", "c_suite", "partner", "vp", "director", "manager"],
      };

      if (organizationId) {
        request.organization_ids = [organizationId];
      } else if (domain) {
        request.organization_domains = [domain];
      } else {
        return [];
      }

      const { data } = await this.http.post("/mixed_people/search", request);
      return data.people || [];
    } catch (error) {
      this.logger.error("Failed to search for executives:", error);
      return [];
    }
  }

  /**
   * Update business record with Apollo company data
   */
  private async updateBusinessWithApolloData(
    businessId: string,
    company: NonNullable<ApolloCompanyResponse["organization"]>
  ): Promise<void> {
    await this.db
      .update(businesses)
      .set({
        website: company.website_url || undefined,
        employeeCount: company.estimated_num_employees || undefined,
        annualRevenue: company.annual_revenue || undefined,
        yearFounded: company.founded_year || undefined,
        sicCode: company.sic_codes?.[0] || undefined,
        naicsCode: company.naics_codes?.[0] || undefined,
        street: company.street_address || undefined,
        city: company.city || undefined,
        state: company.state || undefined,
        zip: company.postal_code || undefined,
      })
      .where(eq(businesses.id, businessId));
  }

  /**
   * Create persona and link for an Apollo executive
   */
  private async createExecutivePersona(
    teamId: string,
    businessId: string,
    person: ApolloPersonResult
  ): Promise<boolean> {
    const firstName = person.first_name;
    const lastName = person.last_name;

    if (!firstName || !lastName) return false;

    // Normalize name for matching
    const normalizedFirst = firstName.toLowerCase().trim();
    const normalizedLast = lastName.toLowerCase().trim();

    // Check for existing persona
    const existing = await this.db.query.personas.findFirst({
      where: (t, { eq, and }) =>
        and(
          eq(t.teamId, teamId),
          eq(t.normalizedFirstName, normalizedFirst),
          eq(t.normalizedLastName, normalizedLast)
        ),
    });

    let personaId: string;

    if (existing) {
      personaId = existing.id;

      // Update Apollo status if not already done
      if (!existing.apolloCompleted) {
        await this.db
          .update(personas)
          .set({
            apolloCompleted: true,
            apolloCompletedAt: new Date(),
            lastEnrichedAt: new Date(),
          })
          .where(eq(personas.id, personaId));
      }
    } else {
      // Create new persona
      personaId = generateUlid("persona");

      await this.db.insert(personas).values({
        id: personaId,
        teamId,
        firstName,
        lastName,
        fullName: person.name,
        normalizedFirstName: normalizedFirst,
        normalizedLastName: normalizedLast,
        primarySource: "apollo",
        confidenceScore: 0.9,
        skipTraceCompleted: false,
        apolloCompleted: true,
        apolloCompletedAt: new Date(),
        lastEnrichedAt: new Date(),
        isActive: true,
      });

      // Queue for SkipTrace to get more contact info
      await this.skipTraceQueue.add(
        "ENRICH_PERSONA",
        {
          teamId,
          personaId,
          sourceType: "business",
          sourceId: businessId,
          firstName,
          lastName,
          email: person.email,
        },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 10000 },
        }
      );
    }

    // Add email if available
    if (person.email) {
      await this.db
        .insert(personaEmails)
        .values({
          id: generateUlid("pemail"),
          teamId,
          personaId,
          emailAddress: person.email,
          normalizedAddress: person.email.toLowerCase().trim(),
          emailType: "business",
          domain: person.email.split("@")[1],
          isValid: person.email_status === "valid",
          isPrimary: true,
          source: "apollo",
          score: person.email_status === "valid" ? 0.9 : 0.5,
        })
        .onConflictDoNothing();
    }

    // Add phone numbers
    for (const phone of person.phone_numbers || []) {
      const normalizedNumber = phone.sanitized_number?.replace(/\D/g, "") || phone.raw_number?.replace(/\D/g, "");
      if (normalizedNumber && normalizedNumber.length >= 10) {
        await this.db
          .insert(personaPhones)
          .values({
            id: generateUlid("pphone"),
            teamId,
            personaId,
            phoneNumber: phone.raw_number,
            normalizedNumber: normalizedNumber.slice(-10),
            phoneType: phone.type === "mobile" ? "mobile" : "landline",
            isValid: true,
            isPrimary: false,
            source: "apollo",
            score: 0.8,
          })
          .onConflictDoNothing();
      }
    }

    // Classify role
    const roleInfo = this.classifyRole(person.title, person.seniority);

    // Create business-persona link
    await this.db
      .insert(businessOwners)
      .values({
        id: generateUlid("bowner"),
        teamId,
        personaId,
        businessId,
        title: person.title,
        roleType: roleInfo.roleType,
        roleConfidence: roleInfo.confidence,
        isDecisionMaker: roleInfo.isDecisionMaker,
        isOwner: roleInfo.isOwner,
        isCLevel: roleInfo.isCLevel,
        isPartner: roleInfo.isPartner,
        isInvestor: roleInfo.isInvestor,
        isSalesLead: roleInfo.isSalesLead,
        department: person.departments?.[0],
        seniorityLevel: person.seniority,
        source: "apollo",
        isCurrent: true,
      })
      .onConflictDoNothing();

    // Queue lead card update
    await this.leadCardQueue.add(
      "UPDATE_FROM_APOLLO",
      {
        teamId,
        personaId,
        businessId,
      },
      {
        attempts: 2,
        backoff: { type: "exponential", delay: 5000 },
      }
    );

    return true;
  }

  /**
   * Classify role from title and seniority
   */
  private classifyRole(title?: string, seniority?: string): {
    roleType: string;
    confidence: number;
    isDecisionMaker: boolean;
    isOwner: boolean;
    isCLevel: boolean;
    isPartner: boolean;
    isInvestor: boolean;
    isSalesLead: boolean;
  } {
    const lowerTitle = (title || "").toLowerCase();
    const lowerSeniority = (seniority || "").toLowerCase();

    // Owner/Founder
    if (lowerSeniority.includes("owner") || lowerSeniority.includes("founder") ||
        lowerTitle.includes("owner") || lowerTitle.includes("founder") || lowerTitle.includes("principal")) {
      return {
        roleType: "owner",
        confidence: 0.95,
        isDecisionMaker: true,
        isOwner: true,
        isCLevel: false,
        isPartner: false,
        isInvestor: false,
        isSalesLead: false,
      };
    }

    // C-Suite
    if (lowerSeniority.includes("c_suite") || /\bceo|cfo|coo|cto|cmo|cro\b/i.test(lowerTitle) ||
        lowerTitle.includes("chief")) {
      return {
        roleType: "ceo",
        confidence: 0.9,
        isDecisionMaker: true,
        isOwner: false,
        isCLevel: true,
        isPartner: false,
        isInvestor: false,
        isSalesLead: false,
      };
    }

    // Partner
    if (lowerSeniority.includes("partner") || lowerTitle.includes("partner")) {
      return {
        roleType: "partner",
        confidence: 0.85,
        isDecisionMaker: true,
        isOwner: false,
        isCLevel: false,
        isPartner: true,
        isInvestor: false,
        isSalesLead: false,
      };
    }

    // VP/Director
    if (lowerSeniority.includes("vp") || lowerSeniority.includes("director") ||
        lowerTitle.includes("vp") || lowerTitle.includes("vice president") || lowerTitle.includes("director")) {
      return {
        roleType: "executive",
        confidence: 0.8,
        isDecisionMaker: true,
        isOwner: false,
        isCLevel: false,
        isPartner: false,
        isInvestor: false,
        isSalesLead: false,
      };
    }

    // Manager
    if (lowerSeniority.includes("manager") || lowerTitle.includes("manager")) {
      return {
        roleType: "manager",
        confidence: 0.7,
        isDecisionMaker: false,
        isOwner: false,
        isCLevel: false,
        isPartner: false,
        isInvestor: false,
        isSalesLead: lowerTitle.includes("sales"),
      };
    }

    // Default
    return {
      roleType: "professional",
      confidence: 0.5,
      isDecisionMaker: false,
      isOwner: false,
      isCLevel: false,
      isPartner: false,
      isInvestor: false,
      isSalesLead: false,
    };
  }
}
