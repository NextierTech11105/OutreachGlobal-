/**
 * Unified Lead Card DTOs
 * The final combined view of persona + business + property + contact
 */

import { PersonaIdentityDto, PersonaPhoneDto, PersonaEmailDto, PersonaAddressDto } from '../persona/persona.dto';

// ============================================
// UNIFIED LEAD CARD
// ============================================

export interface UnifiedLeadCardDto {
  id: string;
  cardType: 'business' | 'property' | 'combined';

  // ===== PERSONA =====
  personaId: string;
  firstName: string;
  lastName: string;
  fullName: string;

  // ===== BEST CONTACT INFO =====
  bestPhone: BestContactDto | null;
  bestEmail: BestContactDto | null;
  bestAddress: BestAddressDto | null;

  // All contact options
  allPhones: PersonaPhoneDto[];
  allEmails: PersonaEmailDto[];
  allAddresses: PersonaAddressDto[];

  // ===== BUSINESS INFO (if applicable) =====
  business: UnifiedBusinessInfoDto | null;

  // ===== PROPERTY INFO (if applicable) =====
  property: UnifiedPropertyInfoDto | null;

  // ===== SCORING =====
  leadScore: number;
  priorityTier: 1 | 2 | 3 | 4 | 5;
  scoreBreakdown: LeadScoreBreakdownDto;

  // ===== SIGNALS =====
  signals: LeadSignalDto[];
  hasDistress: boolean;
  distressLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';

  // ===== CAMPAIGN STATUS =====
  campaign: CampaignStatusDto;

  // ===== AGENT ASSIGNMENT =====
  assignedAgent: 'sabrina' | 'gianna' | null;
  agentRole: 'sms' | 'voice' | 'email' | null;

  // ===== TAGS & NOTES =====
  tags: string[];
  notes: string[];

  // ===== ENRICHMENT STATUS =====
  enrichment: EnrichmentStatusDto;

  // ===== TIMESTAMPS =====
  createdAt: string;
  updatedAt: string;
  lastContactedAt: string | null;
  lastResponseAt: string | null;
  nextFollowUpAt: string | null;
}

// ============================================
// CONTACT INFO
// ============================================

export interface BestContactDto {
  value: string;
  type: string;
  source: string;
  isVerified: boolean;
  isPrimary: boolean;
  confidence: number;
}

export interface BestAddressDto {
  street: string;
  city: string;
  state: string;
  zip: string;
  type: string;
  source: string;
  isCurrent: boolean;
}

// ============================================
// BUSINESS INFO
// ============================================

export interface UnifiedBusinessInfoDto {
  businessId: string;
  companyName: string;
  dbaName?: string;

  // Classification
  sector: string;
  subsector?: string;
  sicCode: string;
  sicDescription: string;

  // Size
  employeeCount?: number;
  annualRevenue?: number;
  revenueRange?: string;
  yearEstablished?: number;

  // Contact
  businessPhone?: string;
  businessEmail?: string;
  website?: string;

  // Address
  businessAddress: BestAddressDto;

  // Role
  personaRole: 'owner' | 'ceo' | 'partner' | 'employee' | 'unknown';
  roleTitle?: string;

  // Status
  status: 'active' | 'inactive' | 'unknown';

  // Enrichment
  apolloEnriched: boolean;
  linkedInCompanyUrl?: string;
}

// ============================================
// PROPERTY INFO
// ============================================

export interface UnifiedPropertyInfoDto {
  propertyId: string;
  propertyAddress: BestAddressDto;

  // Property type
  propertyType: string;
  propertyUse?: string;

  // Details
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  yearBuilt?: number;
  lotSqFt?: number;

  // Valuation
  estimatedValue?: number;
  assessedValue?: number;

  // Equity
  estimatedEquity?: number;
  equityPercent?: number;
  loanAmount?: number;

  // Ownership
  ownershipType: 'sole' | 'joint' | 'trust' | 'corporate';
  yearsOwned?: number;
  ownerOccupied?: boolean;
  absenteeOwner?: boolean;

  // Distress
  distressSignals: string[];

  // MLS
  listed?: boolean;
  listingPrice?: number;
  daysOnMarket?: number;
}

// ============================================
// SCORING
// ============================================

export interface LeadScoreBreakdownDto {
  totalScore: number;

  // Component scores (0-100)
  contactQuality: number;
  businessValue: number;
  propertyValue: number;
  distressLevel: number;
  engagementPotential: number;
  recency: number;

  // Weights applied
  weights: {
    contactQuality: number;
    businessValue: number;
    propertyValue: number;
    distressLevel: number;
    engagementPotential: number;
    recency: number;
  };

  // Factors
  positiveFactors: string[];
  negativeFactors: string[];
}

export interface LeadSignalDto {
  signal: string;
  signalType: 'distress' | 'opportunity' | 'status' | 'behavior';
  value: boolean | string | number;
  weight: number;
  detectedAt: string;
}

// ============================================
// CAMPAIGN STATUS
// ============================================

export interface CampaignStatusDto {
  status: 'new' | 'pending' | 'queued' | 'in_progress' | 'contacted' | 'responded' | 'converted' | 'dnc' | 'dead';

  // Channel status
  sms: ChannelStatusDto;
  email: ChannelStatusDto;
  voice: ChannelStatusDto;

  // History
  totalAttempts: number;
  successfulContacts: number;
  responses: number;

  // Scheduling
  lastAttemptAt?: string;
  nextAttemptAt?: string;
  optimalContactTime?: string;

  // Outcome
  outcome?: 'interested' | 'not_interested' | 'callback' | 'wrong_number' | 'no_answer' | 'voicemail';
  outcomeNotes?: string;
}

export interface ChannelStatusDto {
  status: 'pending' | 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'responded' | 'failed' | 'bounced' | 'dnc';
  attempts: number;
  lastAttemptAt?: string;
  lastResponseAt?: string;
  deliveryRate: number;
  responseRate: number;
}

// ============================================
// ENRICHMENT STATUS
// ============================================

export interface EnrichmentStatusDto {
  skipTraceCompleted: boolean;
  skipTraceAt?: string;
  apolloCompleted: boolean;
  apolloAt?: string;
  propertyDetailCompleted: boolean;
  propertyDetailAt?: string;
  identityMerged: boolean;
  identityMergedAt?: string;
  lastFullEnrichmentAt?: string;
  needsEnrichment: boolean;
  enrichmentPriority: 'low' | 'medium' | 'high';
}

// ============================================
// CREATION / UPDATE
// ============================================

export interface CreateUnifiedLeadCardDto {
  personaId: string;
  cardType: 'business' | 'property' | 'combined';
  businessId?: string;
  propertyId?: string;
  tags?: string[];
}

export interface UpdateUnifiedLeadCardDto {
  tags?: string[];
  notes?: string[];
  assignedAgent?: 'sabrina' | 'gianna' | null;
  campaignStatus?: CampaignStatusDto['status'];
  nextFollowUpAt?: string;
}

// ============================================
// QUERY / FILTER
// ============================================

export interface LeadCardQueryDto {
  // Filter by type
  cardTypes?: ('business' | 'property' | 'combined')[];

  // Filter by score
  minScore?: number;
  maxScore?: number;
  priorityTiers?: (1 | 2 | 3 | 4 | 5)[];

  // Filter by signals
  hasDistress?: boolean;
  distressLevels?: ('low' | 'medium' | 'high' | 'critical')[];
  signals?: string[];

  // Filter by campaign
  campaignStatuses?: CampaignStatusDto['status'][];
  assignedAgents?: ('sabrina' | 'gianna')[];

  // Filter by business
  sectors?: string[];
  subsectors?: string[];

  // Filter by property
  propertyTypes?: string[];
  minEquity?: number;
  maxEquity?: number;

  // Filter by contact
  hasPhone?: boolean;
  hasEmail?: boolean;

  // Filter by enrichment
  needsEnrichment?: boolean;

  // Filter by tags
  tags?: string[];

  // Sorting
  sortBy?: 'score' | 'createdAt' | 'updatedAt' | 'lastContactedAt' | 'nextFollowUpAt';
  sortOrder?: 'asc' | 'desc';

  // Pagination
  page?: number;
  perPage?: number;
}

export interface LeadCardQueryResultDto {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  leads: UnifiedLeadCardDto[];
}
