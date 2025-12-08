/**
 * Lead Card Generator
 * Creates and updates unified lead cards from multiple data sources
 */

import {
  UnifiedLeadCard,
  LeadScore,
  LeadStatus,
  LeadSourceType,
  PhoneInfo,
  EmailInfo,
  AddressInfo,
  SocialInfo,
  PersonIdentity,
  BusinessInfo,
  PropertyInfo,
  RoleInfo,
  EnrichmentState,
  CampaignAssignment,
  PartialLeadCard,
} from './leadcard.types';
import {
  deduplicatePhones,
  deduplicateEmails,
  deduplicateAddresses,
  deduplicateSocials,
  normalizeNameForCard,
} from './leadcard.normalizer';

// ============================================
// ID GENERATION
// ============================================

function generateLeadId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `lead_${timestamp}_${random}`;
}

// ============================================
// SCORING
// ============================================

export function calculateLeadScore(lead: Partial<UnifiedLeadCard>): LeadScore {
  const phones = lead.phones || [];
  const emails = lead.emails || [];
  const addresses = lead.addresses || [];
  const socials = lead.socials || [];
  const property = lead.property;
  const role = lead.role;

  // Data quality score (0-100)
  let dataQualityScore = 0;
  const hasPhone = phones.length > 0;
  const hasMobilePhone = phones.some(p => p.type === 'mobile');
  const hasEmail = emails.length > 0;
  const hasValidEmail = emails.some(e => e.isValid);
  const hasAddress = addresses.length > 0;
  const hasCurrentAddress = addresses.some(a => a.isCurrent);
  const hasSocial = socials.length > 0;
  const hasLinkedIn = socials.some(s => s.platform === 'linkedin');

  if (hasPhone) dataQualityScore += 15;
  if (hasMobilePhone) dataQualityScore += 10;
  if (hasEmail) dataQualityScore += 15;
  if (hasValidEmail) dataQualityScore += 10;
  if (hasAddress) dataQualityScore += 10;
  if (hasCurrentAddress) dataQualityScore += 5;
  if (hasSocial) dataQualityScore += 5;
  if (hasLinkedIn) dataQualityScore += 5;
  if (lead.person?.firstName && lead.person?.lastName) dataQualityScore += 15;
  if (lead.business) dataQualityScore += 10;

  // Contact reachability score (0-100)
  let contactReachabilityScore = 0;
  const validPhones = phones.filter(p => p.isValid && !p.isDoNotCall);
  const validEmails = emails.filter(e => e.isValid && !e.isUnsubscribed);

  contactReachabilityScore += Math.min(validPhones.length * 20, 50);
  contactReachabilityScore += Math.min(validEmails.length * 15, 30);
  if (validPhones.some(p => p.type === 'mobile')) contactReachabilityScore += 20;

  // Role value score (0-100)
  let roleValueScore = 0;
  const roleWeight = role ? getRoleWeight(role) : 10;
  roleValueScore = roleWeight;

  // Property opportunity score (0-100)
  let propertyOpportunityScore = 0;
  let distressSignalCount = 0;
  let equityLevel = 0;

  if (property) {
    // Equity scoring
    equityLevel = property.equityPercent || 0;
    if (equityLevel >= 70) propertyOpportunityScore += 30;
    else if (equityLevel >= 50) propertyOpportunityScore += 20;
    else if (equityLevel >= 30) propertyOpportunityScore += 10;

    // Distress signals
    if (property.isPreForeclosure) { distressSignalCount++; propertyOpportunityScore += 15; }
    if (property.isForeclosure) { distressSignalCount++; propertyOpportunityScore += 15; }
    if (property.isTaxLien) { distressSignalCount++; propertyOpportunityScore += 10; }
    if (property.isVacant) { distressSignalCount++; propertyOpportunityScore += 10; }
    if (property.isInherited) { distressSignalCount++; propertyOpportunityScore += 10; }
    if (property.isDivorce) { distressSignalCount++; propertyOpportunityScore += 10; }
    if (property.isProbate) { distressSignalCount++; propertyOpportunityScore += 10; }

    // Ownership factors
    if (property.isAbsentee) propertyOpportunityScore += 5;
    if (property.yearsOwned && property.yearsOwned >= 10) propertyOpportunityScore += 5;
    if (property.isFreeClear) propertyOpportunityScore += 10;

    // Cap at 100
    propertyOpportunityScore = Math.min(propertyOpportunityScore, 100);
  }

  // Business fit score (0-100)
  let businessFitScore = 0;
  if (lead.business) {
    if (lead.business.sicCode) businessFitScore += 20;
    if (lead.business.employeeCount) {
      if (lead.business.employeeCount >= 10 && lead.business.employeeCount <= 500) {
        businessFitScore += 30; // Sweet spot for B2B
      } else if (lead.business.employeeCount < 10) {
        businessFitScore += 15;
      } else {
        businessFitScore += 20;
      }
    }
    if (lead.business.annualRevenue) {
      if (lead.business.annualRevenue >= 500000) businessFitScore += 30;
      else if (lead.business.annualRevenue >= 100000) businessFitScore += 20;
      else businessFitScore += 10;
    }
    if (lead.business.website) businessFitScore += 10;
    if (lead.business.email) businessFitScore += 10;
  }

  // Calculate total score (weighted average)
  const totalScore = Math.round(
    (dataQualityScore * 0.25) +
    (contactReachabilityScore * 0.25) +
    (roleValueScore * 0.20) +
    (propertyOpportunityScore * 0.15) +
    (businessFitScore * 0.15)
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
      hasSocial,
      hasLinkedIn,
      roleWeight,
      distressSignalCount,
      equityLevel,
    },
  };
}

function getRoleWeight(role: RoleInfo): number {
  const weights: Record<string, number> = {
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
  const base = weights[role.roleType] || 10;
  return role.isDecisionMaker ? Math.min(base + 15, 100) : base;
}

// ============================================
// LEAD CARD CREATION
// ============================================

export interface CreateLeadCardInput {
  teamId: string;
  source: LeadSourceType;
  // Person info
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  // Contact info
  phones?: Partial<PhoneInfo>[];
  emails?: Partial<EmailInfo>[];
  addresses?: Partial<AddressInfo>[];
  socials?: Partial<SocialInfo>[];
  // Role
  title?: string;
  // Associated entities
  business?: Partial<BusinessInfo>;
  property?: Partial<PropertyInfo>;
}

export function createLeadCard(input: CreateLeadCardInput): UnifiedLeadCard {
  const now = new Date();
  const id = generateLeadId();

  // Normalize name
  const nameInfo = normalizeNameForCard(input.firstName, input.lastName, {
    middleName: input.middleName,
    suffix: input.suffix,
  });

  // Create person identity
  const person: PersonIdentity = {
    id: `person_${id}`,
    ...nameInfo,
    confidenceScore: 1.0,
    mergedFromIds: [],
  };

  // Process contact info
  const phones = processPhones(input.phones || [], input.source);
  const emails = processEmails(input.emails || [], input.source);
  const addresses = processAddresses(input.addresses || [], input.source);
  const socials = processSocials(input.socials || [], input.source);

  // Classify role
  const role = classifyRoleFromTitle(input.title);

  // Initial enrichment state
  const enrichment: EnrichmentState = {
    skipTraceStatus: 'pending',
    apolloStatus: 'pending',
    propertyDetailStatus: input.property ? 'pending' : 'skipped',
    errorCount: 0,
  };

  // Build the lead card
  const leadCard: UnifiedLeadCard = {
    id,
    teamId: input.teamId,
    person,
    primaryPhone: phones.find(p => p.isPrimary),
    primaryEmail: emails.find(e => e.isPrimary),
    primaryAddress: addresses.find(a => a.isPrimary),
    phones,
    emails,
    addresses,
    socials,
    role,
    business: input.business ? normalizeBusinessInfo(input.business) : undefined,
    property: input.property ? normalizePropertyInfo(input.property) : undefined,
    score: { totalScore: 0 } as LeadScore,
    status: 'new',
    enrichment,
    activities: [],
    sources: [input.source],
    primarySource: input.source,
    createdAt: now,
    updatedAt: now,
  };

  // Calculate score
  leadCard.score = calculateLeadScore(leadCard);

  return leadCard;
}

// ============================================
// LEAD CARD UPDATES
// ============================================

export function updateLeadCard(
  existing: UnifiedLeadCard,
  updates: PartialLeadCard,
  source: LeadSourceType
): UnifiedLeadCard {
  const now = new Date();

  // Merge phones
  const newPhones = updates.phones || [];
  const mergedPhones = deduplicatePhones([...existing.phones, ...newPhones]);

  // Merge emails
  const newEmails = updates.emails || [];
  const mergedEmails = deduplicateEmails([...existing.emails, ...newEmails]);

  // Merge addresses
  const newAddresses = updates.addresses || [];
  const mergedAddresses = deduplicateAddresses([...existing.addresses, ...newAddresses]);

  // Merge socials
  const newSocials = updates.socials || [];
  const mergedSocials = deduplicateSocials([...existing.socials, ...newSocials]);

  // Merge sources
  const sources = [...new Set([...existing.sources, source])];

  // Build updated card
  const updated: UnifiedLeadCard = {
    ...existing,
    ...updates,
    phones: mergedPhones,
    emails: mergedEmails,
    addresses: mergedAddresses,
    socials: mergedSocials,
    primaryPhone: mergedPhones.find(p => p.isPrimary),
    primaryEmail: mergedEmails.find(e => e.isPrimary),
    primaryAddress: mergedAddresses.find(a => a.isPrimary),
    sources,
    updatedAt: now,
  };

  // Merge person info if provided
  if (updates.person) {
    updated.person = {
      ...existing.person,
      ...updates.person,
      mergedFromIds: [...existing.person.mergedFromIds, ...(updates.person.mergedFromIds || [])],
    };
  }

  // Merge business info if provided
  if (updates.business) {
    updated.business = existing.business
      ? { ...existing.business, ...updates.business }
      : updates.business as BusinessInfo;
  }

  // Merge property info if provided
  if (updates.property) {
    updated.property = existing.property
      ? { ...existing.property, ...updates.property }
      : updates.property as PropertyInfo;
  }

  // Merge enrichment state
  if (updates.enrichment) {
    updated.enrichment = {
      ...existing.enrichment,
      ...updates.enrichment,
    };
  }

  // Recalculate score
  updated.score = calculateLeadScore(updated);

  return updated;
}

// ============================================
// MERGE LEAD CARDS
// ============================================

export function mergeLeadCards(
  primary: UnifiedLeadCard,
  secondary: UnifiedLeadCard
): UnifiedLeadCard {
  // Use primary as base, merge in secondary data
  const merged = updateLeadCard(primary, {
    phones: secondary.phones,
    emails: secondary.emails,
    addresses: secondary.addresses,
    socials: secondary.socials,
    business: secondary.business,
    property: secondary.property,
    person: {
      ...secondary.person,
      mergedFromIds: [secondary.id],
    },
  }, secondary.primarySource);

  // Merge activities
  merged.activities = [...primary.activities, ...secondary.activities]
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Update last activity
  if (merged.activities.length > 0) {
    merged.lastActivityAt = merged.activities[merged.activities.length - 1].timestamp;
  }

  // Track merged ID
  merged.person.mergedFromIds = [
    ...primary.person.mergedFromIds,
    ...secondary.person.mergedFromIds,
    secondary.id,
  ];

  return merged;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function processPhones(phones: Partial<PhoneInfo>[], source: LeadSourceType): PhoneInfo[] {
  const processed = phones.map(p => ({
    number: p.number || '',
    normalizedNumber: p.normalizedNumber || (p.number?.replace(/\D/g, '') || ''),
    type: p.type || 'unknown' as const,
    isPrimary: p.isPrimary || false,
    isValid: p.isValid ?? true,
    isDoNotCall: p.isDoNotCall || false,
    carrier: p.carrier,
    source: p.source || source,
    score: p.score || 0.5,
    lastVerified: p.lastVerified,
  })).filter(p => p.normalizedNumber.length >= 10);

  return deduplicatePhones(processed);
}

function processEmails(emails: Partial<EmailInfo>[], source: LeadSourceType): EmailInfo[] {
  const processed = emails.map(e => ({
    address: e.address || '',
    normalizedAddress: e.normalizedAddress || e.address?.toLowerCase().trim() || '',
    type: e.type || 'unknown' as const,
    isPrimary: e.isPrimary || false,
    isValid: e.isValid ?? true,
    isUnsubscribed: e.isUnsubscribed || false,
    domain: e.domain || e.address?.split('@')[1],
    source: e.source || source,
    score: e.score || 0.5,
    lastVerified: e.lastVerified,
  })).filter(e => e.normalizedAddress.includes('@'));

  return deduplicateEmails(processed);
}

function processAddresses(addresses: Partial<AddressInfo>[], source: LeadSourceType): AddressInfo[] {
  const processed = addresses.map(a => ({
    street: a.street || '',
    street2: a.street2,
    city: a.city || '',
    state: a.state || '',
    zip: a.zip || '',
    zip4: a.zip4,
    county: a.county,
    country: a.country || 'US',
    type: a.type || 'unknown' as const,
    isCurrent: a.isCurrent ?? true,
    isPrimary: a.isPrimary || false,
    latitude: a.latitude,
    longitude: a.longitude,
    source: a.source || source,
  })).filter(a => a.street && a.city && a.state && a.zip);

  return deduplicateAddresses(processed);
}

function processSocials(socials: Partial<SocialInfo>[], source: LeadSourceType): SocialInfo[] {
  const processed = socials.map(s => ({
    platform: s.platform || 'other' as const,
    profileUrl: s.profileUrl || '',
    username: s.username,
    displayName: s.displayName,
    isVerified: s.isVerified || false,
    source: s.source || source,
  })).filter(s => s.profileUrl);

  return deduplicateSocials(processed);
}

function classifyRoleFromTitle(title?: string): RoleInfo {
  if (!title) {
    return {
      roleType: 'unknown',
      isDecisionMaker: false,
      isOwner: false,
      isCLevel: false,
      isPartner: false,
      isInvestor: false,
      isSalesLead: false,
      confidence: 0,
    };
  }

  const lowerTitle = title.toLowerCase();

  // Owner patterns
  if (/owner|proprietor|founder|principal/i.test(lowerTitle)) {
    return {
      title,
      roleType: 'owner',
      isDecisionMaker: true,
      isOwner: true,
      isCLevel: false,
      isPartner: false,
      isInvestor: false,
      isSalesLead: false,
      confidence: 0.95,
    };
  }

  // CEO patterns
  if (/ceo|president|chief\s+executive|coo|cfo|cto/i.test(lowerTitle)) {
    return {
      title,
      roleType: 'ceo',
      isDecisionMaker: true,
      isOwner: false,
      isCLevel: true,
      isPartner: false,
      isInvestor: false,
      isSalesLead: false,
      confidence: 0.9,
    };
  }

  // Partner patterns
  if (/partner/i.test(lowerTitle)) {
    return {
      title,
      roleType: 'partner',
      isDecisionMaker: true,
      isOwner: false,
      isCLevel: false,
      isPartner: true,
      isInvestor: false,
      isSalesLead: false,
      confidence: 0.85,
    };
  }

  // Default
  return {
    title,
    roleType: 'unknown',
    isDecisionMaker: false,
    isOwner: false,
    isCLevel: false,
    isPartner: false,
    isInvestor: false,
    isSalesLead: false,
    confidence: 0.1,
  };
}

function normalizeBusinessInfo(business: Partial<BusinessInfo>): BusinessInfo {
  return {
    id: business.id || `biz_${Date.now()}`,
    name: business.name || '',
    normalizedName: business.normalizedName || business.name?.toLowerCase().trim() || '',
    isActive: business.isActive ?? true,
    ...business,
  };
}

function normalizePropertyInfo(property: Partial<PropertyInfo>): PropertyInfo {
  return {
    id: property.id || `prop_${Date.now()}`,
    address: property.address || {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: 'US',
      type: 'unknown',
      isCurrent: true,
      isPrimary: true,
      source: 'property',
    },
    ...property,
  };
}

// ============================================
// CAMPAIGN ASSIGNMENT
// ============================================

export function assignCampaign(lead: UnifiedLeadCard): CampaignAssignment {
  const now = new Date();

  // Decision makers -> Gianna via SMS
  if (lead.role.isDecisionMaker) {
    return {
      agent: 'gianna',
      channel: lead.primaryPhone ? 'sms' : 'email',
      priority: lead.role.roleType === 'owner' ? 'high' : 'medium',
      reason: `Decision maker: ${lead.role.roleType}`,
      assignedAt: now,
    };
  }

  // Sales leads -> Sabrina via email
  if (lead.role.isSalesLead) {
    return {
      agent: 'sabrina',
      channel: 'email',
      priority: 'medium',
      reason: 'Sales lead for relationship building',
      assignedAt: now,
    };
  }

  // High score leads -> Gianna SMS
  if (lead.score.totalScore >= 70) {
    return {
      agent: 'gianna',
      channel: lead.primaryPhone ? 'sms' : 'email',
      priority: 'medium',
      reason: `High score lead: ${lead.score.totalScore}`,
      assignedAt: now,
    };
  }

  // Default -> Sabrina Email
  return {
    agent: 'sabrina',
    channel: 'email',
    priority: 'low',
    reason: 'Standard lead processing',
    assignedAt: now,
  };
}
