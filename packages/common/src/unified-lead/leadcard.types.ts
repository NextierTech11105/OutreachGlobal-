/**
 * Unified Lead Card Types
 * Core types for the unified lead card system
 */

import { CampaignAgent } from '../identity';

// ============================================
// LEAD SOURCE TYPES
// ============================================

export type LeadSourceType =
  | 'business'      // From B2B sector upload
  | 'property'      // From property search
  | 'consumer'      // Direct consumer data
  | 'apollo'        // Apollo enrichment
  | 'skiptrace'     // SkipTrace enrichment
  | 'manual';       // Manual entry

export type LeadStatus =
  | 'new'
  | 'enriching'
  | 'ready'
  | 'contacted'
  | 'responded'
  | 'qualified'
  | 'converted'
  | 'dead';

export type EnrichmentStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'skipped';

// ============================================
// CONTACT INFO TYPES
// ============================================

export interface PhoneInfo {
  number: string;
  normalizedNumber: string;
  type: 'mobile' | 'landline' | 'voip' | 'unknown';
  isPrimary: boolean;
  isValid: boolean;
  isDoNotCall: boolean;
  carrier?: string;
  source: LeadSourceType;
  score: number;
  lastVerified?: Date;
}

export interface EmailInfo {
  address: string;
  normalizedAddress: string;
  type: 'personal' | 'business' | 'unknown';
  isPrimary: boolean;
  isValid: boolean;
  isUnsubscribed: boolean;
  domain?: string;
  source: LeadSourceType;
  score: number;
  lastVerified?: Date;
}

export interface AddressInfo {
  street: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  zip4?: string;
  county?: string;
  country: string;
  type: 'residential' | 'commercial' | 'mailing' | 'unknown';
  isCurrent: boolean;
  isPrimary: boolean;
  latitude?: number;
  longitude?: number;
  source: LeadSourceType;
}

export interface SocialInfo {
  platform: 'linkedin' | 'facebook' | 'twitter' | 'instagram' | 'other';
  profileUrl: string;
  username?: string;
  displayName?: string;
  isVerified: boolean;
  source: LeadSourceType;
}

// ============================================
// IDENTITY TYPES
// ============================================

export interface PersonIdentity {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  fullName: string;
  normalizedFirstName: string;
  normalizedLastName: string;
  age?: number;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'unknown';
  // Matching metadata
  confidenceScore: number;
  mergedFromIds: string[];
}

// ============================================
// BUSINESS TYPES
// ============================================

export interface BusinessInfo {
  id: string;
  name: string;
  normalizedName: string;
  legalName?: string;
  dba?: string;
  // Classification
  sicCode?: string;
  sicDescription?: string;
  naicsCode?: string;
  naicsDescription?: string;
  sector?: string;
  subSector?: string;
  // Contact
  phone?: string;
  email?: string;
  website?: string;
  // Location
  address?: AddressInfo;
  // Metrics
  employeeCount?: number;
  employeeRange?: string;
  annualRevenue?: number;
  revenueRange?: string;
  yearFounded?: number;
  // Status
  isActive: boolean;
  entityType?: string;
  stateOfIncorporation?: string;
}

// ============================================
// PROPERTY TYPES
// ============================================

export interface PropertyInfo {
  id: string;
  address: AddressInfo;
  // Property details
  propertyType?: string;
  yearBuilt?: number;
  squareFeet?: number;
  bedrooms?: number;
  bathrooms?: number;
  lotSizeAcres?: number;
  lotSizeSqFt?: number;
  // Valuation
  estimatedValue?: number;
  estimatedEquity?: number;
  equityPercent?: number;
  assessedValue?: number;
  taxAmount?: number;
  // Ownership
  ownerType?: 'individual' | 'corporate' | 'trust' | 'estate' | 'unknown';
  yearsOwned?: number;
  isAbsentee?: boolean;
  isOutOfState?: boolean;
  // Distress signals
  isPreForeclosure?: boolean;
  isForeclosure?: boolean;
  isTaxLien?: boolean;
  isVacant?: boolean;
  isInherited?: boolean;
  isDivorce?: boolean;
  isProbate?: boolean;
  isBankruptcy?: boolean;
  // MLS signals
  isListed?: boolean;
  listingPrice?: number;
  daysOnMarket?: number;
  isExpired?: boolean;
  // Loan info
  loanAmount?: number;
  loanType?: string;
  interestRate?: number;
  loanMaturityDate?: string;
  isAdjustable?: boolean;
  isFreeClear?: boolean;
}

// ============================================
// ROLE & CAMPAIGN TYPES
// ============================================

export type ExecutiveRole =
  | 'owner'
  | 'ceo'
  | 'partner'
  | 'investor'
  | 'sales_manager'
  | 'executive'
  | 'manager'
  | 'professional'
  | 'unknown';

export interface RoleInfo {
  title?: string;
  roleType: ExecutiveRole;
  isDecisionMaker: boolean;
  isOwner: boolean;
  isCLevel: boolean;
  isPartner: boolean;
  isInvestor: boolean;
  isSalesLead: boolean;
  confidence: number;
}

// CampaignAgent imported from '../identity'
export type CampaignChannel = 'sms' | 'email' | 'call' | 'mail';
export type CampaignPriority = 'high' | 'medium' | 'low';

export interface CampaignAssignment {
  agent: CampaignAgent;
  channel: CampaignChannel;
  priority: CampaignPriority;
  templateId?: string;
  reason: string;
  assignedAt: Date;
}

// ============================================
// SCORING TYPES
// ============================================

export interface LeadScore {
  totalScore: number;
  // Component scores (0-100)
  dataQualityScore: number;
  contactReachabilityScore: number;
  roleValueScore: number;
  propertyOpportunityScore: number;
  businessFitScore: number;
  // Breakdown
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

// ============================================
// ENRICHMENT TRACKING
// ============================================

export interface EnrichmentState {
  skipTraceStatus: EnrichmentStatus;
  skipTraceCompletedAt?: Date;
  skipTraceProvider?: string;
  apolloStatus: EnrichmentStatus;
  apolloCompletedAt?: Date;
  propertyDetailStatus: EnrichmentStatus;
  propertyDetailCompletedAt?: Date;
  // Error tracking
  lastError?: string;
  errorCount: number;
  retryAfter?: Date;
}

// ============================================
// ACTIVITY TRACKING
// ============================================

export interface LeadActivity {
  id: string;
  type: 'sms_sent' | 'sms_received' | 'email_sent' | 'email_received' | 'call_made' | 'call_received' | 'note_added' | 'status_changed';
  timestamp: Date;
  agent?: CampaignAgent;
  channel?: CampaignChannel;
  content?: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// UNIFIED LEAD CARD
// ============================================

export interface UnifiedLeadCard {
  id: string;
  teamId: string;
  // Core identity
  person: PersonIdentity;
  // Contact info (best of each type)
  primaryPhone?: PhoneInfo;
  primaryEmail?: EmailInfo;
  primaryAddress?: AddressInfo;
  // All contact info
  phones: PhoneInfo[];
  emails: EmailInfo[];
  addresses: AddressInfo[];
  socials: SocialInfo[];
  // Role
  role: RoleInfo;
  // Associated entities
  business?: BusinessInfo;
  property?: PropertyInfo;
  // Scoring
  score: LeadScore;
  // Campaign
  campaign?: CampaignAssignment;
  // Status
  status: LeadStatus;
  // Enrichment
  enrichment: EnrichmentState;
  // Activity
  activities: LeadActivity[];
  lastActivityAt?: Date;
  // Source tracking
  sources: LeadSourceType[];
  primarySource: LeadSourceType;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  // Raw data reference
  rawDataPaths?: string[];
}

// ============================================
// PARTIAL TYPES FOR UPDATES
// ============================================

export type PartialLeadCard = Partial<Omit<UnifiedLeadCard, 'id' | 'teamId' | 'createdAt'>>;

export interface LeadCardUpdate {
  leadId: string;
  updates: PartialLeadCard;
  source: LeadSourceType;
  timestamp: Date;
}

// ============================================
// FILTER & QUERY TYPES
// ============================================

export interface LeadCardFilter {
  status?: LeadStatus[];
  sources?: LeadSourceType[];
  agents?: CampaignAgent[];
  channels?: CampaignChannel[];
  priorities?: CampaignPriority[];
  roleTypes?: ExecutiveRole[];
  minScore?: number;
  maxScore?: number;
  hasPhone?: boolean;
  hasEmail?: boolean;
  hasBusiness?: boolean;
  hasProperty?: boolean;
  hasDistressSignal?: boolean;
  enrichmentStatus?: EnrichmentStatus;
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  searchQuery?: string;
}

export interface LeadCardSort {
  field: 'score' | 'createdAt' | 'updatedAt' | 'lastActivityAt' | 'priority';
  direction: 'asc' | 'desc';
}

export interface LeadCardQuery {
  filter?: LeadCardFilter;
  sort?: LeadCardSort;
  limit?: number;
  offset?: number;
}
