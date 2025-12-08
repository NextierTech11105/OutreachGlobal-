/**
 * Lead Card Service
 * Builds and maintains unified lead cards
 */
import { Injectable, Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { generateUlid } from "@/database/columns/ulid";
import { eq, and, desc } from "drizzle-orm";
import {
  unifiedLeadCards,
  personas,
  personaPhones,
  personaEmails,
  personaAddresses,
  businessOwners,
  propertyOwners,
  businesses,
  properties,
  leadActivities,
} from "@/database/schema";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

export interface CreateLeadCardJob {
  teamId: string;
  personaId: string;
  businessId?: string;
  propertyId?: string;
}

export interface LeadCardScore {
  totalScore: number;
  dataQualityScore: number;
  contactReachabilityScore: number;
  roleValueScore: number;
  propertyOpportunityScore: number;
  businessFitScore: number;
  breakdown: {
    hasPhone: boolean;
    hasMobilePhone: boolean;
    hasEmail: boolean;
    hasValidEmail: boolean;
    hasAddress: boolean;
    hasCurrentAddress: boolean;
    hasSocial: boolean;
    hasLinkedIn: boolean;
    roleWeight: number;
    distressSignalCount: number;
    equityLevel: number;
  };
}

@Injectable()
export class LeadCardService {
  private readonly logger = new Logger(LeadCardService.name);

  constructor(
    @InjectDB() private db: DrizzleClient,
    @InjectQueue("lead-card") private leadCardQueue: Queue,
  ) {}

  /**
   * Create or update a unified lead card
   */
  async createOrUpdateLeadCard(job: CreateLeadCardJob): Promise<string> {
    const { teamId, personaId, businessId, propertyId } = job;

    this.logger.log(`Creating/updating lead card for persona ${personaId}`);

    // Get persona
    const persona = await this.db.query.personas.findFirst({
      where: (t, { eq }) => eq(t.id, personaId),
    });

    if (!persona) {
      throw new Error(`Persona ${personaId} not found`);
    }

    // Get best contact info
    const phones = await this.db.query.personaPhones.findMany({
      where: (t, { eq }) => eq(t.personaId, personaId),
      orderBy: (t) => [desc(t.score), desc(t.isPrimary)],
    });

    const emails = await this.db.query.personaEmails.findMany({
      where: (t, { eq }) => eq(t.personaId, personaId),
      orderBy: (t) => [desc(t.score), desc(t.isPrimary)],
    });

    const addresses = await this.db.query.personaAddresses.findMany({
      where: (t, { eq, and }) => and(eq(t.personaId, personaId), eq(t.isCurrent, true)),
      orderBy: (t) => [desc(t.isPrimary)],
    });

    // Get role info
    const businessLink = businessId
      ? await this.db.query.businessOwners.findFirst({
          where: (t, { eq, and }) =>
            and(eq(t.personaId, personaId), eq(t.businessId, businessId)),
        })
      : await this.db.query.businessOwners.findFirst({
          where: (t, { eq }) => eq(t.personaId, personaId),
          orderBy: (t) => [desc(t.isDecisionMaker), desc(t.roleConfidence)],
        });

    // Get business info
    const business = businessLink
      ? await this.db.query.businesses.findFirst({
          where: (t, { eq }) => eq(t.id, businessLink.businessId),
        })
      : null;

    // Get property info
    const propertyLink = propertyId
      ? await this.db.query.propertyOwners.findFirst({
          where: (t, { eq, and }) =>
            and(eq(t.personaId, personaId), eq(t.propertyId, propertyId)),
        })
      : await this.db.query.propertyOwners.findFirst({
          where: (t, { eq }) => eq(t.personaId, personaId),
          orderBy: (t) => [desc(t.isCurrentOwner)],
        });

    const property = propertyLink
      ? (await this.db.query.properties.findFirst({
          where: (t, { eq }) => eq(t.id, propertyLink.propertyId),
        })) ?? null
      : null;

    // Calculate score - extract property fields from metadata if available
    const propertyMetadata = property?.metadata as Record<string, unknown> | null;
    const propertyForScore = property ? {
      equityPercent: propertyMetadata?.equityPercent as number | null ?? null,
      preForeclosure: propertyMetadata?.preForeclosure as boolean | null ?? null,
      taxLien: propertyMetadata?.taxLien as boolean | null ?? null,
      vacant: propertyMetadata?.vacant as boolean | null ?? null,
    } : null;
    const score = this.calculateScore(phones, emails, addresses, businessLink, propertyForScore);

    // Determine primary contact info
    const primaryPhone = phones.find((p) => p.isPrimary) || phones[0];
    const primaryEmail = emails.find((e) => e.isPrimary) || emails[0];
    const currentAddress = addresses[0];

    // Determine campaign assignment
    const { agent, channel, priority, reason } = this.determineCampaignAssignment(
      businessLink,
      score.totalScore
    );

    // Check for existing lead card
    const existingCard = await this.db.query.unifiedLeadCards.findFirst({
      where: (t, { eq, and }) => and(eq(t.teamId, teamId), eq(t.personaId, personaId)),
    });

    const leadCardData = {
      teamId,
      personaId,
      businessId: business?.id || null,
      propertyId: property?.id || null,
      // Identity
      firstName: persona.firstName,
      lastName: persona.lastName,
      fullName: persona.fullName,
      // Best contact
      primaryPhone: primaryPhone?.normalizedNumber || null,
      primaryPhoneType: primaryPhone?.phoneType || null,
      primaryEmail: primaryEmail?.normalizedAddress || null,
      primaryEmailType: primaryEmail?.emailType || null,
      // Location
      city: currentAddress?.city || null,
      state: currentAddress?.state || null,
      zip: currentAddress?.zip || null,
      // Role
      title: businessLink?.title || null,
      roleType: businessLink?.roleType || "unknown",
      isDecisionMaker: businessLink?.isDecisionMaker || false,
      // Scoring
      totalScore: score.totalScore,
      dataQualityScore: score.dataQualityScore,
      contactReachabilityScore: score.contactReachabilityScore,
      roleValueScore: score.roleValueScore,
      propertyOpportunityScore: score.propertyOpportunityScore,
      businessFitScore: score.businessFitScore,
      scoreBreakdown: score.breakdown,
      // Campaign
      assignedAgent: agent,
      assignedChannel: channel,
      assignedPriority: priority,
      campaignReason: reason,
      assignedAt: new Date(),
      // Enrichment status
      skipTraceStatus: persona.skipTraceCompleted ? "completed" : "pending",
      apolloStatus: persona.apolloCompleted ? "completed" : "pending",
      propertyDetailStatus: property ? "completed" : "skipped",
      // Source
      sources: [persona.primarySource],
      primarySource: persona.primarySource,
    };

    let leadCardId: string;

    if (existingCard) {
      // Update existing
      await this.db
        .update(unifiedLeadCards)
        .set(leadCardData)
        .where(eq(unifiedLeadCards.id, existingCard.id));
      leadCardId = existingCard.id;

      this.logger.log(`Updated lead card ${leadCardId}`);
    } else {
      // Create new
      leadCardId = generateUlid("ulc");
      await this.db.insert(unifiedLeadCards).values({
        id: leadCardId,
        ...leadCardData,
        status: "new",
        enrichmentStatus: "pending",
      });

      this.logger.log(`Created lead card ${leadCardId}`);
    }

    return leadCardId;
  }

  /**
   * Calculate lead card score
   */
  private calculateScore(
    phones: Array<{ phoneType: string; isValid: boolean; isDoNotCall: boolean }>,
    emails: Array<{ emailType: string; isValid: boolean; isUnsubscribed: boolean }>,
    addresses: Array<{ isCurrent: boolean }>,
    businessLink: { roleType: string; isDecisionMaker: boolean } | null | undefined,
    property: { equityPercent?: number | null; preForeclosure?: boolean | null; taxLien?: boolean | null; vacant?: boolean | null } | null
  ): LeadCardScore {
    const hasPhone = phones.length > 0;
    const hasMobilePhone = phones.some((p) => p.phoneType === "mobile");
    const hasEmail = emails.length > 0;
    const hasValidEmail = emails.some((e) => e.isValid);
    const hasAddress = addresses.length > 0;
    const hasCurrentAddress = addresses.some((a) => a.isCurrent);

    // Data quality score (0-100)
    let dataQualityScore = 0;
    if (hasPhone) dataQualityScore += 15;
    if (hasMobilePhone) dataQualityScore += 10;
    if (hasEmail) dataQualityScore += 15;
    if (hasValidEmail) dataQualityScore += 10;
    if (hasAddress) dataQualityScore += 10;
    if (hasCurrentAddress) dataQualityScore += 5;
    dataQualityScore += 15; // Has name

    // Contact reachability score (0-100)
    const validPhones = phones.filter((p) => p.isValid && !p.isDoNotCall);
    const validEmails = emails.filter((e) => e.isValid && !e.isUnsubscribed);
    let contactReachabilityScore = 0;
    contactReachabilityScore += Math.min(validPhones.length * 20, 50);
    contactReachabilityScore += Math.min(validEmails.length * 15, 30);
    if (validPhones.some((p) => p.phoneType === "mobile")) contactReachabilityScore += 20;

    // Role value score (0-100)
    const roleWeights: Record<string, number> = {
      owner: 100,
      ceo: 95,
      partner: 85,
      investor: 80,
      sales_manager: 70,
      executive: 65,
      manager: 50,
      professional: 30,
      unknown: 10,
    };
    const roleWeight = roleWeights[businessLink?.roleType || "unknown"] || 10;
    let roleValueScore = roleWeight;
    if (businessLink?.isDecisionMaker) roleValueScore = Math.min(roleValueScore + 15, 100);

    // Property opportunity score (0-100)
    let propertyOpportunityScore = 0;
    let distressSignalCount = 0;
    let equityLevel = 0;

    if (property) {
      equityLevel = property.equityPercent || 0;
      if (equityLevel >= 70) propertyOpportunityScore += 30;
      else if (equityLevel >= 50) propertyOpportunityScore += 20;
      else if (equityLevel >= 30) propertyOpportunityScore += 10;

      if (property.preForeclosure) {
        distressSignalCount++;
        propertyOpportunityScore += 15;
      }
      if (property.taxLien) {
        distressSignalCount++;
        propertyOpportunityScore += 10;
      }
      if (property.vacant) {
        distressSignalCount++;
        propertyOpportunityScore += 10;
      }

      propertyOpportunityScore = Math.min(propertyOpportunityScore, 100);
    }

    // Business fit score (simplified)
    const businessFitScore = businessLink ? 50 : 0;

    // Total score (weighted average)
    const totalScore = Math.round(
      dataQualityScore * 0.25 +
        contactReachabilityScore * 0.25 +
        roleValueScore * 0.2 +
        propertyOpportunityScore * 0.15 +
        businessFitScore * 0.15
    );

    return {
      totalScore,
      dataQualityScore,
      contactReachabilityScore,
      roleValueScore,
      propertyOpportunityScore,
      businessFitScore,
      breakdown: {
        hasPhone,
        hasMobilePhone,
        hasEmail,
        hasValidEmail,
        hasAddress,
        hasCurrentAddress,
        hasSocial: false,
        hasLinkedIn: false,
        roleWeight,
        distressSignalCount,
        equityLevel,
      },
    };
  }

  /**
   * Determine campaign assignment
   * Gianna = SMS for Commercial/B2B deal sourcing
   * Sabrina = Email for Residential Real Estate
   */
  private determineCampaignAssignment(
    businessLink: { isDecisionMaker: boolean; roleType: string; isSalesLead?: boolean } | null | undefined,
    totalScore: number
  ): {
    agent: "sabrina" | "gianna";
    channel: "sms" | "email";
    priority: "high" | "medium" | "low";
    reason: string;
  } {
    // Business decision makers -> Gianna SMS (commercial/B2B)
    if (businessLink?.isDecisionMaker) {
      return {
        agent: "gianna",
        channel: "sms",
        priority: businessLink.roleType === "owner" ? "high" : "medium",
        reason: `Decision maker: ${businessLink.roleType}`,
      };
    }

    // Sales leads -> Sabrina Email
    if (businessLink?.isSalesLead) {
      return {
        agent: "sabrina",
        channel: "email",
        priority: "medium",
        reason: "Sales lead for relationship building",
      };
    }

    // High score B2B leads -> Gianna SMS
    if (totalScore >= 70 && businessLink) {
      return {
        agent: "gianna",
        channel: "sms",
        priority: "medium",
        reason: `High score B2B lead: ${totalScore}`,
      };
    }

    // Default/Residential -> Sabrina Email
    return {
      agent: "sabrina",
      channel: "email",
      priority: "low",
      reason: "Standard lead processing",
    };
  }

  /**
   * Log activity for a lead card
   */
  async logActivity(
    teamId: string,
    leadCardId: string,
    activityType: string,
    options: {
      agent?: string;
      channel?: string;
      subject?: string;
      content?: string;
      metadata?: Record<string, unknown>;
      externalId?: string;
    } = {}
  ): Promise<void> {
    await this.db.insert(leadActivities).values({
      id: generateUlid("lact"),
      teamId,
      leadCardId,
      activityType,
      agent: options.agent,
      channel: options.channel,
      subject: options.subject,
      content: options.content,
      metadata: options.metadata,
      externalId: options.externalId,
    });

    // Update last activity timestamp
    await this.db
      .update(unifiedLeadCards)
      .set({ lastActivityAt: new Date() })
      .where(eq(unifiedLeadCards.id, leadCardId));
  }
}
