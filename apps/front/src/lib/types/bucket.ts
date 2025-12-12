// Bucket & Lead Types for Real Estate + Apollo data

export type BucketSource = "real-estate" | "apollo" | "mixed";

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
