/**
 * Null Object Pattern Helpers
 *
 * These functions return safe placeholder objects instead of null/undefined
 * when data is missing. Each object includes an `isEmpty: true` flag to
 * indicate it's a placeholder that shouldn't be treated as real data.
 *
 * Usage:
 *   const phone = getFirstOrDefault(phones, createEmptyPhone);
 *   if (!phone.isEmpty) {
 *     // Safe to use phone.normalizedNumber, etc.
 *   }
 */

// =============================================================================
// EMPTY OBJECT TYPES
// =============================================================================

export interface EmptyPhone {
  isEmpty: true;
  id: null;
  personaId: null;
  phoneNumber: "";
  normalizedNumber: "";
  phoneType: "unknown";
  carrier: null;
  lineType: null;
  isValid: false;
  isConnected: null;
  isDoNotCall: false;
  isPrimary: false;
  source: "";
  score: 0;
  lastVerifiedAt: null;
  verificationSource: null;
  createdAt: null;
  updatedAt: null;
}

export interface EmptyEmail {
  isEmpty: true;
  id: null;
  personaId: null;
  emailAddress: "";
  normalizedAddress: "";
  emailType: "unknown";
  isValid: false;
  isPrimary: false;
  isUnsubscribed: false;
  source: "";
  score: 0;
  lastVerifiedAt: null;
  createdAt: null;
  updatedAt: null;
}

export interface EmptyAddress {
  isEmpty: true;
  id: null;
  personaId: null;
  street: "";
  street2: null;
  city: "";
  state: "";
  zip: "";
  zip4: null;
  county: null;
  country: "";
  addressType: "unknown";
  isCurrent: false;
  isPrimary: false;
  latitude: null;
  longitude: null;
  source: "";
  moveInDate: null;
  moveOutDate: null;
  createdAt: null;
  updatedAt: null;
}

export interface EmptyBusiness {
  isEmpty: true;
  id: null;
  teamId: null;
  // Core identity
  name: "";
  normalizedName: "";
  legalName: null;
  dba: null;
  // Classification (USBizData)
  sicCode: null;
  sicDescription: null;
  naicsCode: null;
  naicsDescription: null;
  sector: null;
  subSector: null;
  // Contact
  phone: null;
  email: null;
  website: null;
  // Location
  street: null;
  street2: null;
  city: null;
  state: null;
  zip: null;
  county: null;
  latitude: null;
  longitude: null;
  // Metrics (USBizData)
  employeeCount: null;
  employeeRange: null;
  annualRevenue: null;
  revenueRange: null;
  yearFounded: null;
  yearsInBusiness: null;
  // Status
  isActive: false;
  entityType: null;
  stateOfIncorporation: null;
  // Source tracking
  sourceFile: null;
  sourceRecordId: null;
  // Apollo.io enrichment
  apolloEnriched: false;
  apolloEnrichedAt: null;
  apolloId: null;
  linkedInUrl: null;
  linkedInCompanyUrl: null;
  facebookUrl: null;
  twitterUrl: null;
  shortDescription: null;
  industry: null;
  industryTag: null;
  technologies: null;
  fundingTotal: null;
  latestFundingDate: null;
  latestFundingAmount: null;
  companyType: null;
  createdAt: null;
  updatedAt: null;
}

export interface EmptyLeadCard {
  isEmpty: true;
  id: null;
  teamId: null;
  personaId: null;
  businessId: null;
  propertyId: null;
  // Identity
  firstName: "";
  lastName: "";
  fullName: "";
  // Contact info
  primaryPhone: null;
  primaryPhoneType: null;
  primaryEmail: null;
  primaryEmailType: null;
  // Location
  city: null;
  state: null;
  zip: null;
  // Role
  title: null;
  roleType: "unknown";
  isDecisionMaker: false;
  // Scoring
  totalScore: 0;
  dataQualityScore: 0;
  contactReachabilityScore: 0;
  roleValueScore: 0;
  propertyOpportunityScore: 0;
  businessFitScore: 0;
  scoreBreakdown: null;
  // Campaign assignment
  assignedAgent: null;
  assignedChannel: null;
  assignedPriority: null;
  campaignTemplateId: null;
  campaignReason: null;
  assignedAt: null;
  // Lead status
  status: "new";
  statusChangedAt: null;
  // Enrichment status
  enrichmentStatus: "pending";
  skipTraceStatus: "pending";
  apolloStatus: "pending";
  propertyDetailStatus: "skipped";
  enrichmentErrorCount: 0;
  lastEnrichmentError: null;
  // Contact attempt tracking
  lastActivityAt: null;
  lastContactedAt: null;
  lastContactChannel: null;
  lastResponseAt: null;
  contactAttempts: 0;
  // SMS tracking
  smsAttempts: 0;
  lastSmsAt: null;
  lastSmsStatus: null;
  lastSmsMessage: null;
  // Email tracking
  emailAttempts: 0;
  lastEmailAt: null;
  lastEmailStatus: null;
  lastEmailSubject: null;
  // Call tracking
  callAttempts: 0;
  lastCallAt: null;
  lastCallStatus: null;
  lastCallDuration: null;
  // Response tracking
  totalResponses: 0;
  smsResponses: 0;
  emailResponses: 0;
  lastResponseChannel: null;
  // Tags
  tags: null;
  notes: null;
  // Source
  sources: [];
  primarySource: "";
  rawDataPaths: null;
  createdAt: null;
  updatedAt: null;
}

export interface EmptyContactability {
  isEmpty: true;
  // Phone contactability
  phoneIsValid: null;
  phoneActivityScore: null;
  phoneContactGrade: null;
  phoneLineType: null;
  phoneNameMatch: null;
  phoneCarrier: null;
  phoneIsDoNotCall: false;
  // Email contactability
  emailIsValid: null;
  emailIsDeliverable: null;
  emailContactGrade: null;
  emailAgeScore: null;
  emailNameMatch: null;
  // TCPA/Litigator (DO NOT MODIFY LOGIC - only defaults)
  isLitigatorRisk: false;
  tcpaConsent: null;
  tcpaConsentDate: null;
  // Overall
  contactabilityScore: 0;
  isContactable: false;
  riskTier: null;
  routingDecision: null;
  routingDescription: null;
  validatedAt: null;
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Creates an empty phone placeholder with isEmpty: true
 */
export function createEmptyPhone(): EmptyPhone {
  return {
    isEmpty: true,
    id: null,
    personaId: null,
    phoneNumber: "",
    normalizedNumber: "",
    phoneType: "unknown",
    carrier: null,
    lineType: null,
    isValid: false,
    isConnected: null,
    isDoNotCall: false,
    isPrimary: false,
    source: "",
    score: 0,
    lastVerifiedAt: null,
    verificationSource: null,
    createdAt: null,
    updatedAt: null,
  };
}

/**
 * Creates an empty email placeholder with isEmpty: true
 */
export function createEmptyEmail(): EmptyEmail {
  return {
    isEmpty: true,
    id: null,
    personaId: null,
    emailAddress: "",
    normalizedAddress: "",
    emailType: "unknown",
    isValid: false,
    isPrimary: false,
    isUnsubscribed: false,
    source: "",
    score: 0,
    lastVerifiedAt: null,
    createdAt: null,
    updatedAt: null,
  };
}

/**
 * Creates an empty address placeholder with isEmpty: true
 */
export function createEmptyAddress(): EmptyAddress {
  return {
    isEmpty: true,
    id: null,
    personaId: null,
    street: "",
    street2: null,
    city: "",
    state: "",
    zip: "",
    zip4: null,
    county: null,
    country: "",
    addressType: "unknown",
    isCurrent: false,
    isPrimary: false,
    latitude: null,
    longitude: null,
    source: "",
    moveInDate: null,
    moveOutDate: null,
    createdAt: null,
    updatedAt: null,
  };
}

/**
 * Creates an empty business placeholder with isEmpty: true
 * Includes all USBizData + Apollo.io fields
 */
export function createEmptyBusiness(): EmptyBusiness {
  return {
    isEmpty: true,
    id: null,
    teamId: null,
    name: "",
    normalizedName: "",
    legalName: null,
    dba: null,
    sicCode: null,
    sicDescription: null,
    naicsCode: null,
    naicsDescription: null,
    sector: null,
    subSector: null,
    phone: null,
    email: null,
    website: null,
    street: null,
    street2: null,
    city: null,
    state: null,
    zip: null,
    county: null,
    latitude: null,
    longitude: null,
    employeeCount: null,
    employeeRange: null,
    annualRevenue: null,
    revenueRange: null,
    yearFounded: null,
    yearsInBusiness: null,
    isActive: false,
    entityType: null,
    stateOfIncorporation: null,
    sourceFile: null,
    sourceRecordId: null,
    apolloEnriched: false,
    apolloEnrichedAt: null,
    apolloId: null,
    linkedInUrl: null,
    linkedInCompanyUrl: null,
    facebookUrl: null,
    twitterUrl: null,
    shortDescription: null,
    industry: null,
    industryTag: null,
    technologies: null,
    fundingTotal: null,
    latestFundingDate: null,
    latestFundingAmount: null,
    companyType: null,
    createdAt: null,
    updatedAt: null,
  };
}

/**
 * Creates an empty lead card placeholder with isEmpty: true
 * Includes contact attempt tracking for SMS, email, and calls
 */
export function createEmptyLeadCard(): EmptyLeadCard {
  return {
    isEmpty: true,
    id: null,
    teamId: null,
    personaId: null,
    businessId: null,
    propertyId: null,
    firstName: "",
    lastName: "",
    fullName: "",
    primaryPhone: null,
    primaryPhoneType: null,
    primaryEmail: null,
    primaryEmailType: null,
    city: null,
    state: null,
    zip: null,
    title: null,
    roleType: "unknown",
    isDecisionMaker: false,
    totalScore: 0,
    dataQualityScore: 0,
    contactReachabilityScore: 0,
    roleValueScore: 0,
    propertyOpportunityScore: 0,
    businessFitScore: 0,
    scoreBreakdown: null,
    assignedAgent: null,
    assignedChannel: null,
    assignedPriority: null,
    campaignTemplateId: null,
    campaignReason: null,
    assignedAt: null,
    status: "new",
    statusChangedAt: null,
    enrichmentStatus: "pending",
    skipTraceStatus: "pending",
    apolloStatus: "pending",
    propertyDetailStatus: "skipped",
    enrichmentErrorCount: 0,
    lastEnrichmentError: null,
    lastActivityAt: null,
    lastContactedAt: null,
    lastContactChannel: null,
    lastResponseAt: null,
    contactAttempts: 0,
    smsAttempts: 0,
    lastSmsAt: null,
    lastSmsStatus: null,
    lastSmsMessage: null,
    emailAttempts: 0,
    lastEmailAt: null,
    lastEmailStatus: null,
    lastEmailSubject: null,
    callAttempts: 0,
    lastCallAt: null,
    lastCallStatus: null,
    lastCallDuration: null,
    totalResponses: 0,
    smsResponses: 0,
    emailResponses: 0,
    lastResponseChannel: null,
    tags: null,
    notes: null,
    sources: [],
    primarySource: "",
    rawDataPaths: null,
    createdAt: null,
    updatedAt: null,
  };
}

/**
 * Creates an empty contactability placeholder with isEmpty: true
 * NOTE: TCPA/litigator fields are set to safe defaults only
 */
export function createEmptyContactability(): EmptyContactability {
  return {
    isEmpty: true,
    phoneIsValid: null,
    phoneActivityScore: null,
    phoneContactGrade: null,
    phoneLineType: null,
    phoneNameMatch: null,
    phoneCarrier: null,
    phoneIsDoNotCall: false,
    emailIsValid: null,
    emailIsDeliverable: null,
    emailContactGrade: null,
    emailAgeScore: null,
    emailNameMatch: null,
    isLitigatorRisk: false,
    tcpaConsent: null,
    tcpaConsentDate: null,
    contactabilityScore: 0,
    isContactable: false,
    riskTier: null,
    routingDecision: null,
    routingDescription: null,
    validatedAt: null,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Safely gets the first item from an array or returns a default object.
 * This prevents crashes when accessing array[0] on empty arrays.
 *
 * @param array - The array to get the first item from
 * @param defaultFactory - Function that creates the default object
 * @returns The first item or the default object
 *
 * @example
 * const phone = getFirstOrDefault(phones, createEmptyPhone);
 * // phone is never undefined - either a real phone or EmptyPhone
 */
export function getFirstOrDefault<T, D>(
  array: T[] | null | undefined,
  defaultFactory: () => D
): T | D {
  if (!array || array.length === 0) {
    return defaultFactory();
  }
  return array[0];
}

/**
 * Finds an item in array by predicate, or returns first item, or returns default.
 * Useful for finding primary items with fallback.
 *
 * @param array - The array to search
 * @param predicate - Function to find the preferred item
 * @param defaultFactory - Function that creates the default object
 * @returns The matching item, first item, or default
 *
 * @example
 * const phone = findOrDefault(
 *   phones,
 *   (p) => p.isPrimary,
 *   createEmptyPhone
 * );
 */
export function findOrDefault<T, D>(
  array: T[] | null | undefined,
  predicate: (item: T) => boolean,
  defaultFactory: () => D
): T | D {
  if (!array || array.length === 0) {
    return defaultFactory();
  }
  const found = array.find(predicate);
  return found ?? array[0];
}

/**
 * Type guard to check if an object is an empty placeholder
 *
 * @example
 * const phone = getFirstOrDefault(phones, createEmptyPhone);
 * if (!isEmpty(phone)) {
 *   // phone is a real phone, not a placeholder
 *   sendSms(phone.normalizedNumber);
 * }
 */
export function isEmpty(
  obj: unknown
): obj is
  | EmptyPhone
  | EmptyEmail
  | EmptyAddress
  | EmptyBusiness
  | EmptyLeadCard
  | EmptyContactability {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "isEmpty" in obj &&
    (obj as { isEmpty: unknown }).isEmpty === true
  );
}

/**
 * Type guard for non-empty objects (inverse of isEmpty)
 */
export function isNotEmpty<T>(
  obj:
    | T
    | EmptyPhone
    | EmptyEmail
    | EmptyAddress
    | EmptyBusiness
    | EmptyLeadCard
    | EmptyContactability
): obj is T {
  return !isEmpty(obj);
}

/**
 * Safe null coalesce that returns actual default values instead of propagating undefined.
 * Use this instead of `value ?? undefined` patterns.
 *
 * @example
 * // Instead of: phoneActivityScore: validation.phone.activityScore ?? undefined
 * // Use: phoneActivityScore: safeDefault(validation.phone.activityScore, null)
 */
export function safeDefault<T, D>(
  value: T | null | undefined,
  defaultValue: D
): T | D {
  return value ?? defaultValue;
}

/**
 * Safe array access that returns default instead of undefined.
 *
 * @example
 * // Instead of: const phone = phones[0] // can be undefined
 * // Use: const phone = safeArrayAccess(phones, 0, createEmptyPhone())
 */
export function safeArrayAccess<T, D>(
  array: T[] | null | undefined,
  index: number,
  defaultValue: D
): T | D {
  if (!array || index < 0 || index >= array.length) {
    return defaultValue;
  }
  return array[index];
}
