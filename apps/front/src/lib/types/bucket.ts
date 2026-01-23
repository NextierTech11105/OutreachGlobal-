// Bucket & Lead Types for Real Estate + Apollo data

export type BucketSource = "real-estate" | "apollo" | "mixed" | "usbizdata" | "zoho" | "propwire" | "tracerfy";

// ═══════════════════════════════════════════════════════════════════════════════
// COLOR-CODED TAG SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pipeline Status - Where is this data in the workflow?
 * Color: Background color for visual clarity
 */
export type PipelineStatus = "raw" | "validated" | "skip_traced" | "ready" | "blocked" | "sent";

/**
 * PIPELINE ORDER:
 * 1. RAW - Freshly uploaded CSV
 * 2. SKIP_TRACED - Tracerfy enrichment (creates Lead ID, gets phone/email) - $0.02/lead
 * 3. VALIDATED - Trestle Real Contact scoring - $0.015/lead
 * 4. READY - Passed validation, ready for campaign
 * 5. BLOCKED - DNC, litigator, or failed validation
 * 6. SENT - Already pushed to SMS campaign
 */
export const PIPELINE_STATUS_CONFIG: Record<PipelineStatus, { label: string; color: string; bgColor: string; description: string; step: number }> = {
  raw: { label: "Raw", color: "#6B7280", bgColor: "#F3F4F6", description: "Freshly uploaded, not processed", step: 1 },
  skip_traced: { label: "Skip Traced", color: "#8B5CF6", bgColor: "#EDE9FE", description: "Enriched via Tracerfy ($0.02)", step: 2 },
  validated: { label: "Validated", color: "#3B82F6", bgColor: "#DBEAFE", description: "Scored via Trestle ($0.015)", step: 3 },
  ready: { label: "Ready", color: "#10B981", bgColor: "#D1FAE5", description: "Ready for SMS campaign", step: 4 },
  blocked: { label: "Blocked", color: "#EF4444", bgColor: "#FEE2E2", description: "DNC, litigator, or invalid", step: 0 },
  sent: { label: "Sent", color: "#F59E0B", bgColor: "#FEF3C7", description: "Already in campaign", step: 5 },
};

/**
 * Quality Flags - What do we know about this lead?
 * These are boolean indicators with color badges
 */
export interface QualityFlags {
  hasPhone: boolean;
  hasMobile: boolean;
  hasEmail: boolean;
  hasAddress: boolean;
  isDecisionMaker: boolean;
  phoneValidated: boolean;
  emailValidated: boolean;
  skipTraced: boolean;
  isDNC: boolean;
  isLitigator: boolean;
}

export const QUALITY_FLAG_CONFIG: Record<keyof QualityFlags, { label: string; trueColor: string; falseColor: string; icon: string }> = {
  hasPhone: { label: "Phone", trueColor: "#10B981", falseColor: "#D1D5DB", icon: "📞" },
  hasMobile: { label: "Mobile", trueColor: "#10B981", falseColor: "#D1D5DB", icon: "📱" },
  hasEmail: { label: "Email", trueColor: "#3B82F6", falseColor: "#D1D5DB", icon: "✉️" },
  hasAddress: { label: "Address", trueColor: "#6366F1", falseColor: "#D1D5DB", icon: "🏠" },
  isDecisionMaker: { label: "DM", trueColor: "#F59E0B", falseColor: "#D1D5DB", icon: "👔" },
  phoneValidated: { label: "Ph Valid", trueColor: "#10B981", falseColor: "#D1D5DB", icon: "✓" },
  emailValidated: { label: "Em Valid", trueColor: "#3B82F6", falseColor: "#D1D5DB", icon: "✓" },
  skipTraced: { label: "Traced", trueColor: "#8B5CF6", falseColor: "#D1D5DB", icon: "🔍" },
  isDNC: { label: "DNC", trueColor: "#EF4444", falseColor: "#D1D5DB", icon: "🚫" },
  isLitigator: { label: "Litigator", trueColor: "#EF4444", falseColor: "#D1D5DB", icon: "⚠️" },
};

/**
 * Source Tags - Where did this data come from?
 */
export const SOURCE_TAG_CONFIG: Record<BucketSource, { label: string; color: string; bgColor: string }> = {
  "real-estate": { label: "Real Estate", color: "#059669", bgColor: "#D1FAE5" },
  apollo: { label: "Apollo", color: "#7C3AED", bgColor: "#EDE9FE" },
  mixed: { label: "Mixed", color: "#6B7280", bgColor: "#F3F4F6" },
  usbizdata: { label: "USBizData", color: "#2563EB", bgColor: "#DBEAFE" },
  zoho: { label: "Zoho", color: "#DC2626", bgColor: "#FEE2E2" },
  propwire: { label: "PropWire", color: "#059669", bgColor: "#D1FAE5" },
  tracerfy: { label: "Tracerfy", color: "#7C3AED", bgColor: "#EDE9FE" },
};

/**
 * SIC Code Categories - Industry groupings
 */
export const SIC_CATEGORIES: Record<string, { label: string; color: string; codes: string[] }> = {
  consultants: { label: "Consultants", color: "#3B82F6", codes: ["8742", "8748"] },
  realtors: { label: "Realtors", color: "#10B981", codes: ["6531"] },
  plumbing: { label: "Plumbing", color: "#F59E0B", codes: ["1711"] },
  legal: { label: "Legal", color: "#6366F1", codes: ["8111"] },
  healthcare: { label: "Healthcare", color: "#EF4444", codes: ["8011", "8021", "8031"] },
  construction: { label: "Construction", color: "#F97316", codes: ["1521", "1531", "1541"] },
  finance: { label: "Finance", color: "#14B8A6", codes: ["6021", "6022", "6211"] },
};

/**
 * Get SIC category from code
 */
export function getSICCategory(sicCode: string): { label: string; color: string } | null {
  for (const [, config] of Object.entries(SIC_CATEGORIES)) {
    if (config.codes.includes(sicCode)) {
      return { label: config.label, color: config.color };
    }
  }
  return null;
}

export type EnrichmentStatus =
  | "pending"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "partial";

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "nurturing"
  | "closed"
  | "lost";

// Auto-tagging rules
export interface AutoTagRule {
  id: string;
  condition: {
    field: string;
    operator: "gte" | "lte" | "eq" | "contains" | "exists";
    value: string | number | boolean;
  };
  tag: string;
  description: string;
}

export const AUTO_TAG_RULES: AutoTagRule[] = [
  {
    id: "exit-ready",
    condition: { field: "apolloData.revenue", operator: "gte", value: 5000000 },
    tag: "exit-ready",
    description: "Revenue ≥ $5M indicates exit-ready",
  },
  {
    id: "growth-signal",
    condition: {
      field: "apolloData.signals",
      operator: "contains",
      value: "hiring",
    },
    tag: "growth-signal",
    description: "Hiring activity indicates growth",
  },
  {
    id: "sfr",
    condition: {
      field: "propertyData.propertyType",
      operator: "eq",
      value: "SFR",
    },
    tag: "SFR",
    description: "Single Family Residence",
  },
  {
    id: "high-equity",
    condition: {
      field: "propertyData.equityPercent",
      operator: "gte",
      value: 50,
    },
    tag: "high-equity",
    description: "50%+ equity in property",
  },
  {
    id: "absentee-owner",
    condition: {
      field: "propertyData.absenteeOwner",
      operator: "eq",
      value: true,
    },
    tag: "absentee-owner",
    description: "Owner doesn't live at property",
  },
];

// Bucket definition
export interface Bucket {
  id: string;
  name: string;
  description?: string;
  source: BucketSource;
  filters: BucketFilters;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  // Counts
  totalLeads: number;
  enrichedLeads: number;
  queuedLeads: number;
  contactedLeads: number;
  // Enrichment metadata
  enrichmentStatus: EnrichmentStatus;
  enrichmentProgress?: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
  };
  queuedAt?: string;
  lastEnrichedAt?: string;
  // Campaign link
  campaignId?: string;
  campaignName?: string;
}

export interface BucketFilters {
  // Real Estate filters
  state?: string;
  city?: string;
  zipCode?: string;
  propertyType?: string;
  minEquity?: number;
  maxEquity?: number;
  minValue?: number;
  maxValue?: number;
  ownerOccupied?: boolean;
  absenteeOwner?: boolean;
  // Apollo filters
  industry?: string;
  minRevenue?: number;
  maxRevenue?: number;
  minEmployees?: number;
  maxEmployees?: number;
  titles?: string[];
  seniorities?: string[];
  // Date filters
  lastSaleBefore?: string;
  lastSaleAfter?: string;
}

// Lead definition (merged Real Estate + Apollo)
export interface Lead {
  id: string;
  bucketId: string;
  source: BucketSource;
  status: LeadStatus;
  // Pipeline tracking - where is this lead in the workflow?
  pipelineStatus?: PipelineStatus;
  // Quality flags for color-coded badges
  qualityFlags?: QualityFlags;
  // Contactability score from Trestle (0-100)
  contactabilityScore?: number;
  // SIC code for industry grouping
  sicCode?: string;
  tags: string[];
  autoTags: string[]; // System-generated tags
  createdAt: string;
  updatedAt: string;
  // Contact info
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  // Real Estate property data
  propertyData?: {
    propertyId: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    propertyType: string;
    bedrooms?: number;
    bathrooms?: number;
    sqft?: number;
    lotSize?: number;
    yearBuilt?: number;
    estimatedValue?: number;
    estimatedEquity?: number;
    equityPercent?: number;
    lastSaleDate?: string;
    lastSaleAmount?: number;
    ownerOccupied?: boolean;
    absenteeOwner?: boolean;
    mailingAddress?: string;
  };
  // Apollo contact/company data
  apolloData?: {
    personId?: string;
    organizationId?: string;
    title?: string;
    company?: string;
    companyDomain?: string;
    industry?: string;
    revenue?: number;
    revenueRange?: string;
    employeeCount?: number;
    employeeRange?: string;
    linkedinUrl?: string;
    // Intent signals
    intentScore?: number;
    signals: string[];
    // Firmographics
    foundedYear?: number;
    technologies?: string[];
    keywords?: string[];
  };
  // Enrichment metadata
  enrichmentStatus: EnrichmentStatus;
  enrichedAt?: string;
  enrichmentError?: string;
  // Activity tracking
  lastActivityAt?: string;
  lastActivityType?: "email" | "call" | "sms" | "meeting";
  activityCount: number;
  notes?: string;
}

// API Request/Response types
export interface CreateBucketRequest {
  name: string;
  description?: string;
  source: BucketSource;
  filters: BucketFilters;
  tags?: string[];
  leadIds?: string[]; // Optional: pre-populate with lead IDs
}

export interface UpdateBucketRequest {
  name?: string;
  description?: string;
  tags?: string[];
  filters?: BucketFilters;
}

export interface BucketListResponse {
  buckets: Bucket[];
  total: number;
  page: number;
  perPage: number;
}

export interface BucketLeadsResponse {
  leads: Lead[];
  total: number;
  page: number;
  perPage: number;
  enrichmentStatus: EnrichmentStatus;
}

export interface EnrichBucketRequest {
  priority?: "low" | "normal" | "high";
  maxLeads?: number; // Limit how many to enrich
}

export interface QueueBucketRequest {
  campaignId?: string;
  sequenceId?: string;
  scheduledAt?: string;
}

export interface TagLeadRequest {
  tags: string[];
  action: "add" | "remove" | "replace";
}

// Helper to apply auto-tags to a lead
export function applyAutoTags(lead: Lead): string[] {
  const autoTags: string[] = [];

  for (const rule of AUTO_TAG_RULES) {
    const { field, operator, value } = rule.condition;
    const fieldValue = getNestedValue(lead, field);

    if (fieldValue === undefined) continue;

    let matches = false;
    switch (operator) {
      case "gte":
        matches =
          typeof fieldValue === "number" && fieldValue >= (value as number);
        break;
      case "lte":
        matches =
          typeof fieldValue === "number" && fieldValue <= (value as number);
        break;
      case "eq":
        matches = fieldValue === value;
        break;
      case "contains":
        matches = Array.isArray(fieldValue)
          ? fieldValue.some((v) =>
              String(v).toLowerCase().includes(String(value).toLowerCase()),
            )
          : String(fieldValue)
              .toLowerCase()
              .includes(String(value).toLowerCase());
        break;
      case "exists":
        matches = fieldValue !== null && fieldValue !== undefined;
        break;
    }

    if (matches) {
      autoTags.push(rule.tag);
    }
  }

  return autoTags;
}

// Helper to get nested object value by dot notation
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((current: unknown, key) => {
    if (current && typeof current === "object" && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}
