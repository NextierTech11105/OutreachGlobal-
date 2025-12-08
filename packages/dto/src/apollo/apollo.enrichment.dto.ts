/**
 * Apollo Enrichment DTOs
 * Company and executive enrichment from Apollo.io
 */

// ============================================
// COMPANY ENRICHMENT
// ============================================

export interface ApolloCompanyEnrichmentDto {
  apolloId: string;
  // Basic info
  name: string;
  domain?: string;
  website?: string;
  linkedInUrl?: string;
  // Description
  shortDescription?: string;
  description?: string;
  // Industry
  industry?: string;
  industryTag?: string;
  subIndustry?: string;
  keywords?: string[];
  // Size
  employeeCount?: number;
  employeeRange?: string;
  estimatedRevenue?: number;
  revenueRange?: string;
  // Location
  headquarters?: ApolloLocationDto;
  locations?: ApolloLocationDto[];
  // Contact
  phone?: string;
  email?: string;
  // Social
  facebookUrl?: string;
  twitterUrl?: string;
  crunchbaseUrl?: string;
  // Tech
  technologies?: string[];
  techCategories?: string[];
  // Funding
  fundingTotal?: number;
  fundingRounds?: ApolloFundingRoundDto[];
  latestFundingDate?: string;
  latestFundingAmount?: number;
  latestFundingRound?: string;
  investors?: string[];
  // Company type
  companyType?: 'private' | 'public' | 'nonprofit' | 'government' | 'education';
  foundedYear?: number;
  // SIC/NAICS
  sicCode?: string;
  sicDescription?: string;
  naicsCode?: string;
  naicsDescription?: string;
  // Metadata
  rawResponse?: Record<string, unknown>;
  enrichedAt: string;
}

export interface ApolloLocationDto {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  countryCode?: string;
  isPrimary: boolean;
}

export interface ApolloFundingRoundDto {
  fundingType: string;
  fundingAmount?: number;
  fundingDate?: string;
  investors?: string[];
  leadInvestors?: string[];
}

// ============================================
// PERSON/EXECUTIVE ENRICHMENT
// ============================================

export interface ApolloPersonEnrichmentDto {
  apolloId: string;
  // Identity
  firstName: string;
  lastName: string;
  fullName: string;
  // Title & Role
  title?: string;
  headline?: string;
  seniority?: 'owner' | 'founder' | 'c_suite' | 'vp' | 'director' | 'manager' | 'senior' | 'entry' | 'other';
  departments?: string[];
  // Role classification
  role: ExecutiveRoleDto;
  // Contact
  email?: string;
  emailStatus?: 'verified' | 'guessed' | 'invalid' | 'unknown';
  phone?: string;
  mobilePhone?: string;
  directDial?: string;
  // Social
  linkedInUrl?: string;
  twitterUrl?: string;
  facebookUrl?: string;
  // Company
  companyApolloId?: string;
  companyName?: string;
  companyDomain?: string;
  // Location
  city?: string;
  state?: string;
  country?: string;
  // Employment
  employmentHistory?: ApolloEmploymentDto[];
  // Education
  education?: ApolloEducationDto[];
  // Skills
  skills?: string[];
  interests?: string[];
  // Metadata
  photoUrl?: string;
  rawResponse?: Record<string, unknown>;
  enrichedAt: string;
}

export interface ExecutiveRoleDto {
  roleType: 'owner' | 'ceo' | 'president' | 'partner' | 'investor' | 'sales_manager' | 'decision_maker' | 'other';
  roleTitle: string;
  isOwner: boolean;
  isCLevel: boolean;
  isFounder: boolean;
  isPartner: boolean;
  isInvestor: boolean;
  isSalesLead: boolean;
  isDecisionMaker: boolean;
  confidence: number;
}

export interface ApolloEmploymentDto {
  companyName: string;
  companyApolloId?: string;
  title: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
  description?: string;
}

export interface ApolloEducationDto {
  school: string;
  degree?: string;
  major?: string;
  startYear?: number;
  endYear?: number;
}

// ============================================
// ENRICHMENT REQUESTS
// ============================================

export interface ApolloCompanyEnrichmentRequestDto {
  // At least one required
  domain?: string;
  name?: string;
  linkedInUrl?: string;
  // Source reference
  businessId?: string;
}

export interface ApolloPersonEnrichmentRequestDto {
  // At least one required
  email?: string;
  linkedInUrl?: string;
  // Or name + company
  firstName?: string;
  lastName?: string;
  companyName?: string;
  companyDomain?: string;
  // Source reference
  personaId?: string;
  businessId?: string;
}

export interface ApolloBulkEnrichmentRequestDto {
  companies?: ApolloCompanyEnrichmentRequestDto[];
  people?: ApolloPersonEnrichmentRequestDto[];
}

export interface ApolloBulkEnrichmentResponseDto {
  success: boolean;
  companies: ApolloCompanyEnrichmentDto[];
  people: ApolloPersonEnrichmentDto[];
  errors?: Array<{ input: Record<string, unknown>; error: string }>;
  creditsUsed: number;
  creditsRemaining: number;
}

// ============================================
// EXECUTIVE SEARCH
// ============================================

export interface ApolloExecutiveSearchRequestDto {
  companyDomain?: string;
  companyName?: string;
  companyApolloId?: string;
  // Filter by role
  roles?: Array<'owner' | 'ceo' | 'president' | 'partner' | 'investor' | 'sales_manager'>;
  seniorities?: Array<'owner' | 'founder' | 'c_suite' | 'vp' | 'director' | 'manager'>;
  titles?: string[];
  departments?: string[];
  // Pagination
  page?: number;
  perPage?: number;
}

export interface ApolloExecutiveSearchResponseDto {
  success: boolean;
  total: number;
  page: number;
  perPage: number;
  executives: ApolloPersonEnrichmentDto[];
}

// ============================================
// ROLE CLASSIFICATION
// ============================================

export const OWNER_TITLES = [
  'owner', 'co-owner', 'business owner', 'proprietor', 'principal'
];

export const CEO_TITLES = [
  'ceo', 'chief executive officer', 'chief executive'
];

export const PRESIDENT_TITLES = [
  'president', 'co-president'
];

export const PARTNER_TITLES = [
  'partner', 'managing partner', 'general partner', 'senior partner'
];

export const INVESTOR_TITLES = [
  'investor', 'angel investor', 'venture partner', 'board member', 'chairman'
];

export const SALES_MANAGER_TITLES = [
  'sales manager', 'vp of sales', 'head of sales', 'sales director',
  'business development manager', 'bd manager', 'account executive'
];

export const C_SUITE_TITLES = [
  'ceo', 'cfo', 'cto', 'coo', 'cmo', 'cio', 'cpo', 'cro',
  'chief executive', 'chief financial', 'chief technology',
  'chief operating', 'chief marketing', 'chief information',
  'chief product', 'chief revenue'
];

export function classifyExecutiveRole(title: string): ExecutiveRoleDto {
  const normalizedTitle = title.toLowerCase().trim();

  const isOwner = OWNER_TITLES.some(t => normalizedTitle.includes(t));
  const isCEO = CEO_TITLES.some(t => normalizedTitle.includes(t));
  const isPresident = PRESIDENT_TITLES.some(t => normalizedTitle.includes(t));
  const isPartner = PARTNER_TITLES.some(t => normalizedTitle.includes(t));
  const isInvestor = INVESTOR_TITLES.some(t => normalizedTitle.includes(t));
  const isSalesLead = SALES_MANAGER_TITLES.some(t => normalizedTitle.includes(t));
  const isCLevel = C_SUITE_TITLES.some(t => normalizedTitle.includes(t));
  const isFounder = normalizedTitle.includes('founder') || normalizedTitle.includes('co-founder');

  let roleType: ExecutiveRoleDto['roleType'] = 'other';
  let confidence = 0.5;

  if (isOwner) {
    roleType = 'owner';
    confidence = 0.95;
  } else if (isCEO) {
    roleType = 'ceo';
    confidence = 0.95;
  } else if (isPresident) {
    roleType = 'president';
    confidence = 0.9;
  } else if (isPartner) {
    roleType = 'partner';
    confidence = 0.9;
  } else if (isInvestor) {
    roleType = 'investor';
    confidence = 0.85;
  } else if (isSalesLead) {
    roleType = 'sales_manager';
    confidence = 0.85;
  } else if (isCLevel || isFounder) {
    roleType = 'decision_maker';
    confidence = 0.8;
  }

  return {
    roleType,
    roleTitle: title,
    isOwner,
    isCLevel,
    isFounder,
    isPartner,
    isInvestor,
    isSalesLead,
    isDecisionMaker: isOwner || isCEO || isPresident || isCLevel || isFounder,
    confidence
  };
}
