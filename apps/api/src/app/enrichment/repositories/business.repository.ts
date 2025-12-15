/**
 * Business Repository
 * Database operations for businesses and business-persona links
 */
import { Injectable } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { eq, and, or, desc, asc, like, inArray } from "drizzle-orm";
import { businesses, businessOwners } from "@/database/schema";
import { generateUlid } from "@/database/columns/ulid";

export interface CreateBusinessInput {
  teamId: string;
  name: string;
  sicCode?: string;
  sector?: string;
  subSector?: string;
  phone?: string;
  email?: string;
  website?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  employeeCount?: number;
  annualRevenue?: number;
  sourceFile?: string;
}

export interface BusinessWithOwners {
  id: string;
  name: string;
  sector?: string;
  subSector?: string;
  owners: Array<{
    personaId: string;
    firstName?: string;
    lastName?: string;
    title?: string;
    roleType: string;
    isDecisionMaker: boolean;
  }>;
}

@Injectable()
export class BusinessRepository {
  constructor(@InjectDB() private db: DrizzleClient) {}

  /**
   * Create a new business
   */
  async create(input: CreateBusinessInput): Promise<string> {
    const id = generateUlid("biz");
    const normalizedName = input.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s&-]/g, "")
      .replace(/\s+(inc|llc|ltd|corp|corporation|company|co)\.?$/i, "")
      .trim();

    await this.db.insert(businesses).values({
      id,
      teamId: input.teamId,
      name: input.name,
      normalizedName,
      sicCode: input.sicCode,
      sector: input.sector,
      subSector: input.subSector,
      phone: input.phone,
      email: input.email,
      website: input.website,
      street: input.street,
      city: input.city,
      state: input.state,
      zip: input.zip,
      employeeCount: input.employeeCount,
      annualRevenue: input.annualRevenue,
      sourceFile: input.sourceFile,
      isActive: true,
      apolloEnriched: false,
    });

    return id;
  }

  /**
   * Find by ID
   */
  async findById(id: string): Promise<typeof businesses.$inferSelect | null> {
    const result = await this.db.query.businesses.findFirst({
      where: (t, { eq }) => eq(t.id, id),
    });
    return result || null;
  }

  /**
   * Find by normalized name
   */
  async findByName(
    teamId: string,
    name: string,
  ): Promise<typeof businesses.$inferSelect | null> {
    const normalizedName = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s&-]/g, "")
      .replace(/\s+(inc|llc|ltd|corp|corporation|company|co)\.?$/i, "")
      .trim();

    const result = await this.db.query.businesses.findFirst({
      where: (t, { eq, and }) =>
        and(eq(t.teamId, teamId), eq(t.normalizedName, normalizedName)),
    });
    return result || null;
  }

  /**
   * Find by website domain
   */
  async findByDomain(
    teamId: string,
    domain: string,
  ): Promise<typeof businesses.$inferSelect | null> {
    // Normalize domain
    const normalizedDomain = domain
      .toLowerCase()
      .replace(/^(https?:\/\/)?(www\.)?/, "")
      .split("/")[0];

    const result = await this.db.query.businesses.findFirst({
      where: (t, { eq, and, like }) =>
        and(eq(t.teamId, teamId), like(t.website, `%${normalizedDomain}%`)),
    });
    return result || null;
  }

  /**
   * List businesses by sector
   */
  async listBySector(
    teamId: string,
    sector: string,
    options: { subSector?: string; limit?: number; offset?: number } = {},
  ): Promise<Array<typeof businesses.$inferSelect>> {
    const conditions = [
      eq(businesses.teamId, teamId),
      eq(businesses.sector, sector),
      eq(businesses.isActive, true),
    ];

    if (options.subSector) {
      conditions.push(eq(businesses.subSector, options.subSector));
    }

    const results = await this.db.query.businesses.findMany({
      where: and(...conditions),
      orderBy: (t) => [desc(t.createdAt)],
      limit: options.limit || 100,
      offset: options.offset || 0,
    });

    return results;
  }

  /**
   * List businesses needing Apollo enrichment
   */
  async listNeedingApolloEnrichment(
    teamId: string,
    limit = 100,
  ): Promise<Array<typeof businesses.$inferSelect>> {
    const results = await this.db.query.businesses.findMany({
      where: (t, { eq, and }) =>
        and(
          eq(t.teamId, teamId),
          eq(t.isActive, true),
          eq(t.apolloEnriched, false),
        ),
      orderBy: (t) => [asc(t.createdAt)],
      limit,
    });

    return results;
  }

  /**
   * Get business with owners
   */
  async getWithOwners(businessId: string): Promise<BusinessWithOwners | null> {
    const business = await this.db.query.businesses.findFirst({
      where: (t, { eq }) => eq(t.id, businessId),
    });

    if (!business) return null;

    const owners = await this.db.query.businessOwners.findMany({
      where: (t, { eq, and }) =>
        and(eq(t.businessId, businessId), eq(t.isCurrent, true)),
      orderBy: (t) => [desc(t.isDecisionMaker), desc(t.roleConfidence)],
    });

    return {
      id: business.id,
      name: business.name,
      sector: business.sector || undefined,
      subSector: business.subSector || undefined,
      owners: owners.map((o) => ({
        personaId: o.personaId,
        title: o.title || undefined,
        roleType: o.roleType,
        isDecisionMaker: o.isDecisionMaker,
      })),
    };
  }

  /**
   * Link persona to business
   */
  async linkPersona(
    teamId: string,
    businessId: string,
    personaId: string,
    options: {
      title?: string;
      roleType?: string;
      isDecisionMaker?: boolean;
      source?: string;
    } = {},
  ): Promise<string> {
    const id = generateUlid("bowner");

    await this.db
      .insert(businessOwners)
      .values({
        id,
        teamId,
        businessId,
        personaId,
        title: options.title,
        roleType: options.roleType || "unknown",
        roleConfidence: 0.5,
        isDecisionMaker: options.isDecisionMaker || false,
        source: options.source || "manual",
        isCurrent: true,
      })
      .onConflictDoNothing();

    return id;
  }

  /**
   * Count businesses by sector
   */
  async countBySector(teamId: string): Promise<Record<string, number>> {
    const all = await this.db.query.businesses.findMany({
      where: (t, { eq, and }) =>
        and(eq(t.teamId, teamId), eq(t.isActive, true)),
    });

    const counts: Record<string, number> = {};
    for (const business of all) {
      const sector = business.sector || "uncategorized";
      counts[sector] = (counts[sector] || 0) + 1;
    }

    return counts;
  }

  /**
   * Count businesses by enrichment status
   */
  async countByEnrichmentStatus(teamId: string): Promise<{
    total: number;
    apolloEnriched: number;
    needsEnrichment: number;
    withDecisionMakers: number;
  }> {
    const allBusinesses = await this.db.query.businesses.findMany({
      where: (t, { eq, and }) =>
        and(eq(t.teamId, teamId), eq(t.isActive, true)),
    });

    const total = allBusinesses.length;
    const apolloEnriched = allBusinesses.filter((b) => b.apolloEnriched).length;

    // Count businesses with at least one decision maker
    const businessIds = allBusinesses.map((b) => b.id);
    const decisionMakerLinks =
      businessIds.length > 0
        ? await this.db.query.businessOwners.findMany({
            where: (t, { and, eq, inArray }) =>
              and(
                inArray(t.businessId, businessIds),
                eq(t.isDecisionMaker, true),
              ),
          })
        : [];

    const businessesWithDm = new Set(
      decisionMakerLinks.map((l) => l.businessId),
    ).size;

    return {
      total,
      apolloEnriched,
      needsEnrichment: total - apolloEnriched,
      withDecisionMakers: businessesWithDm,
    };
  }
}
