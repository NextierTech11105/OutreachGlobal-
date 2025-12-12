/**
 * PROPERTY DATA BUCKET MODULE
 *
 * Centralized storage and management for property data objects.
 * Each property record goes through a pipeline:
 * 1. Property Search → Basic property data
 * 2. Property Detail → Full property payload (beds, baths, sqft, mortgage, tax, etc.)
 * 3. Skip Trace → Owner contact info (phones, emails)
 * 4. Valuation → AVM, comps, market analysis
 *
 * This module handles the data bucket where all property objects are stored.
 */

// ============ PROPERTY OBJECT SCHEMA ============

// Basic property from search
export interface PropertySearchResult {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  propertyType?: string;
  estimatedValue?: number;
  equity?: number;
  equityPercent?: number;
  ownerName?: string;
  leadTypes?: string[];
  beds?: number;
  baths?: number;
  sqft?: number;
  yearBuilt?: number;
}

// Address object
export interface PropertyAddress {
  label?: string;
  address?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
  latitude?: number;
  longitude?: number;
}

// Owner info from property detail
export interface PropertyOwner {
  owner1FirstName?: string;
  owner1LastName?: string;
  owner1FullName?: string;
  owner2FirstName?: string;
  owner2LastName?: string;
  owner2FullName?: string;
  ownerOccupied?: boolean;
  ownerType?: "individual" | "corporate" | "trust" | "government";
  corporateName?: string;
  mailingAddress?: PropertyAddress;
}

// Mortgage info
export interface PropertyMortgage {
  lender?: string;
  loanAmount?: number;
  loanType?: string;
  interestRate?: number;
  loanDate?: string;
  maturityDate?: string;
  originalLoanAmount?: number;
  estimatedBalance?: number;
}

// Tax info
export interface PropertyTax {
  taxYear?: number;
  taxAmount?: number;
  taxAssessedValue?: number;
  taxMarketValue?: number;
  taxDelinquent?: boolean;
  taxLienAmount?: number;
}

// Foreclosure info
export interface PropertyForeclosure {
  status?: "pre_foreclosure" | "foreclosure" | "auction" | "reo";
  filingDate?: string;
  defaultAmount?: number;
  auctionDate?: string;
  auctionLocation?: string;
  trustee?: string;
}

// Skip trace result - OWNER contact info
export interface SkipTraceContact {
  ownerName: string;
  phones: Array<{
    number: string;
    type?: "mobile" | "landline" | "voip" | "unknown";
    score?: number;
    carrier?: string;
    verified?: boolean;
  }>;
  emails: Array<{
    email: string;
    type?: "personal" | "work" | "unknown";
    verified?: boolean;
  }>;
  addresses?: PropertyAddress[];
  relatives?: string[];
  associates?: string[];
  skipTracedAt?: string;
  source?: "realestate_api" | "apollo" | "manual" | "import";
}

// Valuation data
export interface PropertyValuation {
  estimatedValue?: number;
  valueRangeLow?: number;
  valueRangeHigh?: number;
  confidence?: number;
  avmSource?: string;
  lastSalePrice?: number;
  lastSaleDate?: string;
  assessedValue?: number;
  equity?: number;
  equityPercent?: number;
  comps?: Array<{
    address: string;
    salePrice: number;
    saleDate: string;
    beds: number;
    baths: number;
    sqft: number;
    distance: number;
  }>;
  valuationDate?: string;
}

// ============ FULL PROPERTY OBJECT ============

export interface PropertyBucketObject {
  // Core identifiers
  id: string;
  externalId?: string;
  apn?: string;

  // Property address
  address: PropertyAddress;

  // Property characteristics
  propertyInfo: {
    propertyType?: string;
    bedrooms?: number;
    bathrooms?: number;
    squareFeet?: number;
    lotSize?: number;
    yearBuilt?: number;
    stories?: number;
    pool?: boolean;
    garage?: number;
    zoning?: string;
    subdivision?: string;
  };

  // Owner info
  owner: PropertyOwner;

  // Financial
  mortgage?: PropertyMortgage;
  tax?: PropertyTax;
  valuation: PropertyValuation;

  // Distress signals
  foreclosure?: PropertyForeclosure;
  leadTypes: string[];

  // Skip trace contact info (owner's contact)
  skipTrace?: SkipTraceContact;

  // Status flags
  status: {
    hasDetail: boolean;
    hasSkipTrace: boolean;
    hasValuation: boolean;
    isLeadReady: boolean; // Has at least 1 phone or email
  };

  // Timestamps
  createdAt: string;
  updatedAt: string;
  detailFetchedAt?: string;
  skipTracedAt?: string;
  valuationFetchedAt?: string;
}

// ============ PROPERTY BUCKET STORAGE ============

const BUCKET_KEY = "nextier_property_bucket";
const BUCKET_INDEX_KEY = "nextier_property_index";

interface PropertyBucket {
  properties: Map<string, PropertyBucketObject>;
  lastUpdated: string;
}

// In-memory cache
let bucketCache: PropertyBucket | null = null;

// Load bucket from localStorage
export function loadBucket(): PropertyBucket {
  if (bucketCache) return bucketCache;

  try {
    const stored = localStorage.getItem(BUCKET_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      bucketCache = {
        properties: new Map(Object.entries(parsed.properties)),
        lastUpdated: parsed.lastUpdated,
      };
      return bucketCache;
    }
  } catch (e) {
    console.error("[PropertyBucket] Failed to load:", e);
  }

  bucketCache = {
    properties: new Map(),
    lastUpdated: new Date().toISOString(),
  };
  return bucketCache;
}

// Save bucket to localStorage
function saveBucket(bucket: PropertyBucket): void {
  try {
    const toStore = {
      properties: Object.fromEntries(bucket.properties),
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(BUCKET_KEY, JSON.stringify(toStore));
    bucketCache = bucket;
  } catch (e) {
    console.error("[PropertyBucket] Failed to save:", e);
  }
}

// ============ BUCKET OPERATIONS ============

// Get property by ID
export function getProperty(id: string): PropertyBucketObject | undefined {
  const bucket = loadBucket();
  return bucket.properties.get(id);
}

// Add or update property from search result
export function addFromSearch(
  result: PropertySearchResult,
): PropertyBucketObject {
  const bucket = loadBucket();

  const existing = bucket.properties.get(result.id);

  const property: PropertyBucketObject = {
    id: result.id,
    address: {
      address: result.address,
      city: result.city,
      state: result.state,
      zip: result.zip,
    },
    propertyInfo: {
      propertyType: result.propertyType,
      bedrooms: result.beds,
      bathrooms: result.baths,
      squareFeet: result.sqft,
      yearBuilt: result.yearBuilt,
    },
    owner: {
      owner1FullName: result.ownerName,
    },
    valuation: {
      estimatedValue: result.estimatedValue,
      equity: result.equity,
      equityPercent: result.equityPercent,
    },
    leadTypes: result.leadTypes || [],
    status: {
      hasDetail: existing?.status.hasDetail || false,
      hasSkipTrace: existing?.status.hasSkipTrace || false,
      hasValuation: existing?.status.hasValuation || false,
      isLeadReady: existing?.status.isLeadReady || false,
    },
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // Preserve existing data
    ...(existing && {
      skipTrace: existing.skipTrace,
      mortgage: existing.mortgage,
      tax: existing.tax,
      foreclosure: existing.foreclosure,
      detailFetchedAt: existing.detailFetchedAt,
      skipTracedAt: existing.skipTracedAt,
      valuationFetchedAt: existing.valuationFetchedAt,
    }),
  };

  bucket.properties.set(result.id, property);
  saveBucket(bucket);

  return property;
}

// Update property with full detail payload
export function updateWithDetail(
  id: string,
  detail: Record<string, unknown>,
): PropertyBucketObject | undefined {
  const bucket = loadBucket();
  const existing = bucket.properties.get(id);

  if (!existing) {
    console.warn(`[PropertyBucket] Property ${id} not found`);
    return undefined;
  }

  const propInfo = (detail.propertyInfo || detail) as Record<string, unknown>;
  const ownerInfo = (detail.ownerInfo || detail) as Record<string, unknown>;
  const mortgageInfo = detail.mortgageInfo as
    | Record<string, unknown>
    | undefined;
  const taxInfo = detail.taxInfo as Record<string, unknown> | undefined;
  const foreclosureInfo = detail.foreclosureInfo as
    | Record<string, unknown>
    | undefined;

  const updated: PropertyBucketObject = {
    ...existing,
    propertyInfo: {
      ...existing.propertyInfo,
      propertyType:
        (propInfo.propertyType as string) || existing.propertyInfo.propertyType,
      bedrooms: (propInfo.bedrooms as number) || existing.propertyInfo.bedrooms,
      bathrooms:
        (propInfo.bathrooms as number) || existing.propertyInfo.bathrooms,
      squareFeet:
        (propInfo.squareFeet as number) || existing.propertyInfo.squareFeet,
      lotSize: (propInfo.lotSize as number) || existing.propertyInfo.lotSize,
      yearBuilt:
        (propInfo.yearBuilt as number) || existing.propertyInfo.yearBuilt,
      stories: (propInfo.stories as number) || existing.propertyInfo.stories,
      pool: (propInfo.pool as boolean) || existing.propertyInfo.pool,
      garage: (propInfo.garage as number) || existing.propertyInfo.garage,
      zoning: (propInfo.zoning as string) || existing.propertyInfo.zoning,
      subdivision:
        (propInfo.subdivision as string) || existing.propertyInfo.subdivision,
    },
    owner: {
      ...existing.owner,
      owner1FirstName:
        (ownerInfo.owner1FirstName as string) || existing.owner.owner1FirstName,
      owner1LastName:
        (ownerInfo.owner1LastName as string) || existing.owner.owner1LastName,
      owner1FullName:
        (ownerInfo.owner1FullName as string) || existing.owner.owner1FullName,
      owner2FirstName:
        (ownerInfo.owner2FirstName as string) || existing.owner.owner2FirstName,
      owner2LastName:
        (ownerInfo.owner2LastName as string) || existing.owner.owner2LastName,
      ownerOccupied:
        (ownerInfo.ownerOccupied as boolean) ?? existing.owner.ownerOccupied,
      ownerType:
        (ownerInfo.ownerType as PropertyOwner["ownerType"]) ||
        existing.owner.ownerType,
      corporateName:
        (ownerInfo.corporateName as string) || existing.owner.corporateName,
    },
    mortgage: mortgageInfo
      ? {
          lender: mortgageInfo.lender as string,
          loanAmount: mortgageInfo.loanAmount as number,
          loanType: mortgageInfo.loanType as string,
          interestRate: mortgageInfo.interestRate as number,
          loanDate: mortgageInfo.loanDate as string,
          maturityDate: mortgageInfo.maturityDate as string,
        }
      : existing.mortgage,
    tax: taxInfo
      ? {
          taxYear: taxInfo.taxYear as number,
          taxAmount: taxInfo.taxAmount as number,
          taxAssessedValue: taxInfo.taxAssessedValue as number,
          taxMarketValue: taxInfo.taxMarketValue as number,
          taxDelinquent: taxInfo.taxDelinquent as boolean,
          taxLienAmount: taxInfo.taxLienAmount as number,
        }
      : existing.tax,
    foreclosure: foreclosureInfo
      ? {
          status:
            foreclosureInfo.foreclosureStatus as PropertyForeclosure["status"],
          filingDate: foreclosureInfo.foreclosureDate as string,
          defaultAmount: foreclosureInfo.defaultAmount as number,
          auctionDate: foreclosureInfo.auctionDate as string,
        }
      : existing.foreclosure,
    valuation: {
      ...existing.valuation,
      estimatedValue:
        (detail.estimatedValue as number) || existing.valuation.estimatedValue,
      lastSalePrice:
        (detail.lastSalePrice as number) || existing.valuation.lastSalePrice,
      lastSaleDate:
        (detail.lastSaleDate as string) || existing.valuation.lastSaleDate,
      equity: (detail.equity as number) || existing.valuation.equity,
      equityPercent:
        (detail.equityPercent as number) || existing.valuation.equityPercent,
    },
    status: {
      ...existing.status,
      hasDetail: true,
    },
    updatedAt: new Date().toISOString(),
    detailFetchedAt: new Date().toISOString(),
  };

  bucket.properties.set(id, updated);
  saveBucket(bucket);

  return updated;
}

// Update property with skip trace results
export function updateWithSkipTrace(
  id: string,
  skipTraceResult: SkipTraceContact,
): PropertyBucketObject | undefined {
  const bucket = loadBucket();
  const existing = bucket.properties.get(id);

  if (!existing) {
    console.warn(`[PropertyBucket] Property ${id} not found`);
    return undefined;
  }

  const hasContact =
    skipTraceResult.phones.length > 0 || skipTraceResult.emails.length > 0;

  const updated: PropertyBucketObject = {
    ...existing,
    skipTrace: {
      ...skipTraceResult,
      skipTracedAt: new Date().toISOString(),
    },
    owner: {
      ...existing.owner,
      owner1FullName:
        skipTraceResult.ownerName || existing.owner.owner1FullName,
    },
    status: {
      ...existing.status,
      hasSkipTrace: true,
      isLeadReady: hasContact,
    },
    updatedAt: new Date().toISOString(),
    skipTracedAt: new Date().toISOString(),
  };

  bucket.properties.set(id, updated);
  saveBucket(bucket);

  return updated;
}

// Get all properties that are lead ready (have contact info)
export function getLeadReadyProperties(): PropertyBucketObject[] {
  const bucket = loadBucket();
  return Array.from(bucket.properties.values()).filter(
    (p) => p.status.isLeadReady,
  );
}

// Get all properties with phones (for SMS campaigns)
export function getPropertiesWithPhones(): PropertyBucketObject[] {
  const bucket = loadBucket();
  return Array.from(bucket.properties.values()).filter(
    (p) => p.skipTrace?.phones && p.skipTrace.phones.length > 0,
  );
}

// Get all properties with emails (for email campaigns)
export function getPropertiesWithEmails(): PropertyBucketObject[] {
  const bucket = loadBucket();
  return Array.from(bucket.properties.values()).filter(
    (p) => p.skipTrace?.emails && p.skipTrace.emails.length > 0,
  );
}

// Clear bucket
export function clearBucket(): void {
  bucketCache = null;
  localStorage.removeItem(BUCKET_KEY);
}

// Export bucket as JSON
export function exportBucket(): string {
  const bucket = loadBucket();
  return JSON.stringify(
    {
      properties: Array.from(bucket.properties.values()),
      exportedAt: new Date().toISOString(),
      count: bucket.properties.size,
    },
    null,
    2,
  );
}

// Get bucket stats
export function getBucketStats(): {
  total: number;
  withDetail: number;
  withSkipTrace: number;
  leadReady: number;
  withPhones: number;
  withEmails: number;
} {
  const bucket = loadBucket();
  const properties = Array.from(bucket.properties.values());

  return {
    total: properties.length,
    withDetail: properties.filter((p) => p.status.hasDetail).length,
    withSkipTrace: properties.filter((p) => p.status.hasSkipTrace).length,
    leadReady: properties.filter((p) => p.status.isLeadReady).length,
    withPhones: properties.filter(
      (p) => p.skipTrace?.phones && p.skipTrace.phones.length > 0,
    ).length,
    withEmails: properties.filter(
      (p) => p.skipTrace?.emails && p.skipTrace.emails.length > 0,
    ).length,
  };
}
