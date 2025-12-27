/**
 * USBizData Registry
 *
 * Foundational B2B database registry with pre-registered counts
 * Universal CSV format from usbizdata.com
 *
 * STANDARD COLUMNS:
 * - Company Name, Contact Name, Email Address
 * - Street Address, City, State, Zip Code, County
 * - Area Code, Phone Number, Website URL
 * - Number of Employees, Annual Revenue
 * - SIC Code, SIC Description
 */

export interface USBizDataDatabase {
  id: string;
  name: string;
  slug: string;
  sicCode: string;
  sicDescription: string;
  totalRecords: number;
  verified: boolean; // true = verified from usbizdata.com, false = estimated
  lastUpdate: string; // Q4 2025 format
  price: number; // USD
  category:
    | "blue_collar"
    | "professional"
    | "healthcare"
    | "real_estate"
    | "retail"
    | "technology"
    | "financial"
    | "hospitality"
    | "food_service"
    | "education"
    | "other";
  tags: string[];
  businessLine?: "nextier" | "outreach_global" | "ecbb" | "all"; // Which business line uses this
  // Local storage path when uploaded
  localPath?: string;
  uploadedAt?: string;
  recordsLoaded?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// REGISTERED DATABASES - From usbizdata.com
// ═══════════════════════════════════════════════════════════════════════════

export const USBIZDATA_REGISTRY: USBizDataDatabase[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // BLUE COLLAR - Primary Target for ECBB/Nextier (Acquisition Targets)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "usbiz-plumber",
    name: "US Plumbing, Heating & Air Conditioning Contractor Database",
    slug: "plumber",
    sicCode: "1711",
    sicDescription: "Plumbing, Heating, Air-Conditioning",
    totalRecords: 338605,
    verified: true, // Q4 2025 usbizdata.com
    lastUpdate: "Q4 2025",
    price: 27.0,
    category: "blue_collar",
    tags: ["plumber", "hvac", "contractor", "blue_collar", "trades"],
    businessLine: "ecbb",
  },
  {
    id: "usbiz-electrician",
    name: "US Electrician Database",
    slug: "electrician",
    sicCode: "1731",
    sicDescription: "Electrical Work",
    totalRecords: 245000,
    verified: false, // Estimated - needs verification
    lastUpdate: "Q4 2025",
    price: 27.0,
    category: "blue_collar",
    tags: ["electrician", "contractor", "blue_collar", "trades"],
    businessLine: "ecbb",
  },
  {
    id: "usbiz-roofing",
    name: "US Roofing, Siding, Sheet Metal Contractor Database",
    slug: "roofing",
    sicCode: "1761",
    sicDescription: "Roofing, Siding, Sheet Metal Work",
    totalRecords: 180000,
    verified: false, // Estimated - needs verification
    lastUpdate: "Q4 2025",
    price: 27.0,
    category: "blue_collar",
    tags: ["roofing", "siding", "contractor", "blue_collar", "trades"],
    businessLine: "ecbb",
  },
  {
    id: "usbiz-trucking",
    name: "US Trucking-Freight Company Database",
    slug: "trucking",
    sicCode: "4212,4213,4214",
    sicDescription: "Trucking & Freight (Local/Except Local/With Storage)",
    totalRecords: 306647,
    verified: true, // Q4 2025 usbizdata.com
    lastUpdate: "Q4 2025",
    price: 27.0,
    category: "blue_collar",
    tags: ["trucking", "freight", "logistics", "transportation", "blue_collar"],
    businessLine: "ecbb",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // REAL ESTATE - Nextier (Datalake Clients) → OutreachGlobal (White-Label)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "usbiz-realtor",
    name: "US Realtor Database",
    slug: "realtor",
    sicCode: "6531",
    sicDescription: "Real Estate Agents and Managers",
    totalRecords: 2184726,
    verified: true, // Q4 2025 usbizdata.com
    lastUpdate: "Q4 2025",
    price: 27.0,
    category: "real_estate",
    tags: ["realtor", "real_estate", "agent", "broker"],
    businessLine: "nextier", // Nextier first, then OutreachGlobal white-label
  },
  {
    id: "usbiz-property-management",
    name: "US Property Management Database",
    slug: "property-management",
    sicCode: "6531",
    sicDescription: "Real Estate Agents and Managers",
    totalRecords: 450000,
    verified: false, // Estimated subset
    lastUpdate: "Q4 2025",
    price: 27.0,
    category: "real_estate",
    tags: ["property_management", "real_estate", "landlord"],
    businessLine: "nextier",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTHCARE - Acquisition Targets + B2B
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "usbiz-medical-dental-equipment",
    name: "US Medical-Dental Equipment Supplier Database",
    slug: "medical-dental-equipment",
    sicCode: "5047",
    sicDescription: "Medical, Dental, Hospital Equipment",
    totalRecords: 179953,
    verified: true, // Q4 2025 usbizdata.com
    lastUpdate: "Q4 2025",
    price: 27.0,
    category: "healthcare",
    tags: ["medical", "dental", "healthcare", "equipment", "supplier"],
    businessLine: "all",
  },
  {
    id: "usbiz-dentist",
    name: "US Dentist Database",
    slug: "dentist",
    sicCode: "8021",
    sicDescription: "Offices and Clinics of Dentists",
    totalRecords: 320000,
    verified: false, // Estimated - needs verification
    lastUpdate: "Q4 2025",
    price: 27.0,
    category: "healthcare",
    tags: ["dentist", "dental", "healthcare", "clinic"],
    businessLine: "all",
  },
  {
    id: "usbiz-physician",
    name: "US Physician Database",
    slug: "physician",
    sicCode: "8011",
    sicDescription: "Offices and Clinics of Doctors",
    totalRecords: 890000,
    verified: false, // Estimated - needs verification
    lastUpdate: "Q4 2025",
    price: 27.0,
    category: "healthcare",
    tags: ["physician", "doctor", "healthcare", "clinic"],
    businessLine: "all",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HOSPITALITY - Hotels, Motels, Campgrounds
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "usbiz-hotels-motels",
    name: "US Hotels & Motels Database",
    slug: "hotels-motels",
    sicCode: "7011,7021",
    sicDescription: "Hotels and Motels",
    totalRecords: 85000,
    verified: false, // Estimated - needs verification
    lastUpdate: "Q4 2025",
    price: 27.0,
    category: "hospitality",
    tags: ["hotel", "motel", "hospitality", "lodging"],
    businessLine: "ecbb",
  },
  {
    id: "usbiz-campgrounds-rv",
    name: "US Campgrounds & RV Parks Database",
    slug: "campgrounds-rv",
    sicCode: "7032,7033",
    sicDescription: "Sporting/Recreational Camps, RV Parks",
    totalRecords: 25000,
    verified: false, // Estimated - needs verification
    lastUpdate: "Q4 2025",
    price: 27.0,
    category: "hospitality",
    tags: ["campground", "rv_park", "recreation", "hospitality"],
    businessLine: "ecbb",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FOOD SERVICE - Restaurants, Bakeries, Caterers
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "usbiz-restaurants",
    name: "US Restaurants Database",
    slug: "restaurants",
    sicCode: "5812,5813,5814",
    sicDescription: "Eating Places, Drinking Places, Caterers",
    totalRecords: 750000,
    verified: false, // Estimated - needs verification
    lastUpdate: "Q4 2025",
    price: 27.0,
    category: "food_service",
    tags: ["restaurant", "food_service", "dining", "hospitality"],
    businessLine: "ecbb",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EDUCATION - Schools, Training Centers
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "usbiz-schools",
    name: "US Schools Database",
    slug: "schools",
    sicCode: "8211",
    sicDescription: "Elementary and Secondary Schools",
    totalRecords: 130000,
    verified: false, // Estimated - needs verification
    lastUpdate: "Q4 2025",
    price: 27.0,
    category: "education",
    tags: ["school", "education", "k12", "b2g"],
    businessLine: "all",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROFESSIONAL SERVICES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "usbiz-accountant",
    name: "US Accountant Database",
    slug: "accountant",
    sicCode: "8721",
    sicDescription: "Accounting, Auditing, Bookkeeping",
    totalRecords: 280000,
    verified: false, // Estimated - needs verification
    lastUpdate: "Q4 2025",
    price: 27.0,
    category: "professional",
    tags: ["accountant", "cpa", "bookkeeper", "financial"],
    businessLine: "outreach_global",
  },
  {
    id: "usbiz-attorney",
    name: "US Attorney Database",
    slug: "attorney",
    sicCode: "8111",
    sicDescription: "Legal Services",
    totalRecords: 450000,
    verified: false, // Estimated - needs verification
    lastUpdate: "Q4 2025",
    price: 27.0,
    category: "professional",
    tags: ["attorney", "lawyer", "legal", "law_firm"],
    businessLine: "outreach_global",
  },
  {
    id: "usbiz-insurance",
    name: "US Insurance Agency Database",
    slug: "insurance",
    sicCode: "6411",
    sicDescription: "Insurance Agents, Brokers, Service",
    totalRecords: 520000,
    verified: false, // Estimated - needs verification
    lastUpdate: "Q4 2025",
    price: 27.0,
    category: "financial",
    tags: ["insurance", "agent", "broker", "financial"],
    businessLine: "outreach_global",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// UNIVERSAL CSV COLUMN MAPPING
// ═══════════════════════════════════════════════════════════════════════════

export const USBIZDATA_COLUMNS = {
  companyName: ["Company Name", "company_name", "CompanyName", "COMPANY NAME"],
  contactName: ["Contact Name", "contact_name", "ContactName", "CONTACT NAME"],
  email: ["Email Address", "email_address", "Email", "EMAIL", "EmailAddress"],
  address: ["Street Address", "street_address", "Address", "ADDRESS"],
  city: ["City", "city", "CITY"],
  state: ["State", "state", "STATE"],
  zip: ["Zip Code", "zip_code", "Zip", "ZIP", "ZipCode", "ZIPCODE"],
  county: ["County", "county", "COUNTY"],
  areaCode: ["Area Code", "area_code", "AreaCode", "AREA CODE"],
  phone: ["Phone Number", "phone_number", "Phone", "PHONE", "PhoneNumber"],
  website: ["Website URL", "website_url", "Website", "WEBSITE", "WebsiteURL"],
  employees: [
    "Number of Employees",
    "number_of_employees",
    "Employees",
    "EMPLOYEES",
  ],
  revenue: ["Annual Revenue", "annual_revenue", "Revenue", "REVENUE"],
  sicCode: ["SIC Code", "sic_code", "SICCode", "SIC"],
  sicDescription: [
    "SIC Description",
    "sic_description",
    "SICDescription",
    "SIC DESC",
  ],
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

export function getDatabase(idOrSlug: string): USBizDataDatabase | undefined {
  return USBIZDATA_REGISTRY.find(
    (db) =>
      db.id === idOrSlug || db.slug === idOrSlug || db.sicCode === idOrSlug,
  );
}

export function getDatabasesBySIC(sicCode: string): USBizDataDatabase[] {
  return USBIZDATA_REGISTRY.filter((db) => db.sicCode === sicCode);
}

export function getDatabasesByCategory(
  category: USBizDataDatabase["category"],
): USBizDataDatabase[] {
  return USBIZDATA_REGISTRY.filter((db) => db.category === category);
}

export function getDatabasesByTag(tag: string): USBizDataDatabase[] {
  return USBIZDATA_REGISTRY.filter((db) => db.tags.includes(tag.toLowerCase()));
}

export function searchDatabases(query: string): USBizDataDatabase[] {
  const q = query.toLowerCase();
  return USBIZDATA_REGISTRY.filter(
    (db) =>
      db.name.toLowerCase().includes(q) ||
      db.slug.includes(q) ||
      db.sicCode.includes(q) ||
      db.sicDescription.toLowerCase().includes(q) ||
      db.tags.some((tag) => tag.includes(q)),
  );
}

export function getTotalRecordsAvailable(): number {
  return USBIZDATA_REGISTRY.reduce((sum, db) => sum + db.totalRecords, 0);
}

export function getCategoryStats(): Record<
  string,
  { count: number; records: number }
> {
  const stats: Record<string, { count: number; records: number }> = {};
  for (const db of USBIZDATA_REGISTRY) {
    if (!stats[db.category]) {
      stats[db.category] = { count: 0, records: 0 };
    }
    stats[db.category].count++;
    stats[db.category].records += db.totalRecords;
  }
  return stats;
}

// ═══════════════════════════════════════════════════════════════════════════
// BUSINESS LINE HELPERS - CRITICAL FOR LUCI
// ═══════════════════════════════════════════════════════════════════════════

export function getDatabasesByBusinessLine(
  line: "nextier" | "outreach_global" | "ecbb" | "all",
): USBizDataDatabase[] {
  return USBIZDATA_REGISTRY.filter(
    (db) => db.businessLine === line || db.businessLine === "all",
  );
}

export function getVerifiedDatabases(): USBizDataDatabase[] {
  return USBIZDATA_REGISTRY.filter((db) => db.verified);
}

export function getUnverifiedDatabases(): USBizDataDatabase[] {
  return USBIZDATA_REGISTRY.filter((db) => !db.verified);
}

export function getBusinessLineStats(): Record<
  string,
  { databases: number; records: number; verified: number }
> {
  const stats: Record<
    string,
    { databases: number; records: number; verified: number }
  > = {
    nextier: { databases: 0, records: 0, verified: 0 },
    outreach_global: { databases: 0, records: 0, verified: 0 },
    ecbb: { databases: 0, records: 0, verified: 0 },
    all: { databases: 0, records: 0, verified: 0 },
  };

  for (const db of USBIZDATA_REGISTRY) {
    const line = db.businessLine || "all";
    stats[line].databases++;
    stats[line].records += db.totalRecords;
    if (db.verified) stats[line].verified++;
  }

  return stats;
}

// ═══════════════════════════════════════════════════════════════════════════
// LUCI COPILOT QUERY INTERFACE
// Uses constants from @/config/agents/luci.ts - DO NOT DUPLICATE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * LUCI CAPACITY MODEL (source: config/agents/luci.ts)
 *
 * MONTHLY ROLLING POOL:
 * - 20,000 leads hit per month (active outreach)
 * - ~5,000 net new leads added monthly
 * - Remove lost deals (keeps pool fresh)
 *
 * DAILY BATCHING:
 * - sms_blast: batchSize=250, pauseAt=2000 (one lead block)
 * - Lead block = 2,000 enriched leads with Lead IDs
 * - 8 skip trace batches (250 each) = 1 lead block
 *
 * Constants live in LUCI_AGENT.feedsStages - import from there
 */
const LUCI_BATCH_SIZE = 250; // Skip trace batch (matches LUCI_AGENT.feedsStages.sms_blast.batchSize)
const LUCI_PAUSE_AT = 2000; // Lead block size (matches LUCI_AGENT.feedsStages.sms_blast.pauseAt)
const LUCI_POOL_TARGET = 20000; // Monthly active pool size
const LUCI_NET_NEW_MONTHLY = 5000; // Approximate net new leads per month

export interface LuciQuery {
  persona?: string; // "plumber", "dentist", etc.
  sicCodes?: string[];
  states?: string[];
  businessLine?: "nextier" | "outreach_global" | "ecbb" | "all";
  minRevenue?: number;
  maxRevenue?: number;
  minEmployees?: number;
  maxEmployees?: number;
  verifiedOnly?: boolean;
  limit?: number;
}

export interface LuciQueryResult {
  query: LuciQuery;
  matchingDatabases: USBizDataDatabase[];
  estimatedRecords: number;
  recommendation: string;
  // Capacity planning
  daysToFillPool: number; // How many days to reach 20K leads from this source
  batchesNeeded: number; // How many 2K batches to exhaust source
}

export function luciQuery(query: LuciQuery): LuciQueryResult {
  let matches = [...USBIZDATA_REGISTRY];

  // Filter by business line
  if (query.businessLine) {
    matches = matches.filter(
      (db) =>
        db.businessLine === query.businessLine || db.businessLine === "all",
    );
  }

  // Filter by verified only
  if (query.verifiedOnly) {
    matches = matches.filter((db) => db.verified);
  }

  // Filter by persona/tag
  if (query.persona) {
    const personaLower = query.persona.toLowerCase();
    matches = matches.filter(
      (db) =>
        db.tags.some((tag) => tag.includes(personaLower)) ||
        db.name.toLowerCase().includes(personaLower) ||
        db.sicDescription.toLowerCase().includes(personaLower),
    );
  }

  // Filter by SIC codes
  if (query.sicCodes && query.sicCodes.length > 0) {
    matches = matches.filter((db) =>
      query.sicCodes!.some(
        (sic) => db.sicCode.includes(sic) || db.sicCode.startsWith(sic),
      ),
    );
  }

  // Calculate estimated records
  const estimatedRecords = matches.reduce(
    (sum, db) => sum + db.totalRecords,
    0,
  );

  // Calculate capacity planning (using LUCI constants)
  const batchesNeeded = Math.ceil(estimatedRecords / LUCI_PAUSE_AT);
  const daysToFillPool = Math.min(
    batchesNeeded,
    LUCI_POOL_TARGET / LUCI_PAUSE_AT,
  );

  // Generate recommendation
  let recommendation = "";
  if (matches.length === 0) {
    recommendation =
      "No matching databases found. Try broadening your search or uploading a custom CSV.";
  } else if (matches.length === 1) {
    const db = matches[0];
    const verifiedNote = db.verified ? "✓ VERIFIED" : "⚠ Estimated count";
    recommendation = `Found ${db.name} with ${db.totalRecords.toLocaleString()} records (${verifiedNote}). At 2K/day, pool fills in ${daysToFillPool} days.`;
  } else {
    const verifiedCount = matches.filter((db) => db.verified).length;
    recommendation = `Found ${matches.length} databases (${verifiedCount} verified) with ${estimatedRecords.toLocaleString()} total records. Can generate ${batchesNeeded} lead batches.`;
  }

  return {
    query,
    matchingDatabases: matches,
    estimatedRecords,
    recommendation,
    daysToFillPool,
    batchesNeeded,
  };
}

// Quick helper for LUCI to check daily capacity
export function getLuciDailyCapacity(): {
  skipTraceBatchSize: number;
  leadBlockSize: number;
  poolTarget: number;
} {
  return {
    skipTraceBatchSize: LUCI_BATCH_SIZE, // 250 records per skip trace batch
    leadBlockSize: LUCI_PAUSE_AT, // 2000 leads per block
    poolTarget: LUCI_POOL_TARGET, // 20000 leads before pause/refine
  };
}

console.log(
  "[USBizData Registry] Loaded",
  USBIZDATA_REGISTRY.length,
  "databases with",
  getTotalRecordsAvailable().toLocaleString(),
  "total records",
);
