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
    | "other";
  tags: string[];
  // Local storage path when uploaded
  localPath?: string;
  uploadedAt?: string;
  recordsLoaded?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// REGISTERED DATABASES - From usbizdata.com
// ═══════════════════════════════════════════════════════════════════════════

export const USBIZDATA_REGISTRY: USBizDataDatabase[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // BLUE COLLAR - Primary Target for ECBB/Nextier
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "usbiz-plumber",
    name: "US Plumbing, Heating & Air Conditioning Contractor Database",
    slug: "plumber",
    sicCode: "1711",
    sicDescription: "Plumbing, Heating, Air-Conditioning",
    totalRecords: 338605,
    lastUpdate: "Q4 2025",
    price: 27.0,
    category: "blue_collar",
    tags: ["plumber", "hvac", "contractor", "blue_collar", "trades"],
  },
  {
    id: "usbiz-electrician",
    name: "US Electrician Database",
    slug: "electrician",
    sicCode: "1731",
    sicDescription: "Electrical Work",
    totalRecords: 245000, // Estimated
    lastUpdate: "Q4 2025",
    price: 27.0,
    category: "blue_collar",
    tags: ["electrician", "contractor", "blue_collar", "trades"],
  },
  {
    id: "usbiz-roofing",
    name: "US Roofing, Siding, Sheet Metal Contractor Database",
    slug: "roofing",
    sicCode: "1761",
    sicDescription: "Roofing, Siding, Sheet Metal Work",
    totalRecords: 180000, // Estimated
    lastUpdate: "Q4 2025",
    price: 27.0,
    category: "blue_collar",
    tags: ["roofing", "siding", "contractor", "blue_collar", "trades"],
  },
  {
    id: "usbiz-trucking",
    name: "US Trucking Companies Database",
    slug: "trucking",
    sicCode: "4213",
    sicDescription: "Trucking, Except Local",
    totalRecords: 420000, // Estimated
    lastUpdate: "Q4 2025",
    price: 27.0,
    category: "blue_collar",
    tags: ["trucking", "logistics", "transportation", "blue_collar"],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // REAL ESTATE
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "usbiz-realtor",
    name: "US Realtor Database",
    slug: "realtor",
    sicCode: "6531",
    sicDescription: "Real Estate Agents and Managers",
    totalRecords: 2184726,
    lastUpdate: "Q4 2025",
    price: 27.0,
    category: "real_estate",
    tags: ["realtor", "real_estate", "agent", "broker"],
  },
  {
    id: "usbiz-property-management",
    name: "US Property Management Database",
    slug: "property-management",
    sicCode: "6531",
    sicDescription: "Real Estate Agents and Managers",
    totalRecords: 450000, // Estimated subset
    lastUpdate: "Q4 2025",
    price: 27.0,
    category: "real_estate",
    tags: ["property_management", "real_estate", "landlord"],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // HEALTHCARE
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "usbiz-medical-dental-equipment",
    name: "US Medical-Dental Equipment Supplier Database",
    slug: "medical-dental-equipment",
    sicCode: "5047",
    sicDescription: "Medical, Dental, Hospital Equipment",
    totalRecords: 179953,
    lastUpdate: "Q4 2025",
    price: 27.0,
    category: "healthcare",
    tags: ["medical", "dental", "healthcare", "equipment", "supplier"],
  },
  {
    id: "usbiz-dentist",
    name: "US Dentist Database",
    slug: "dentist",
    sicCode: "8021",
    sicDescription: "Offices and Clinics of Dentists",
    totalRecords: 320000, // Estimated
    lastUpdate: "Q4 2025",
    price: 27.0,
    category: "healthcare",
    tags: ["dentist", "dental", "healthcare", "clinic"],
  },
  {
    id: "usbiz-physician",
    name: "US Physician Database",
    slug: "physician",
    sicCode: "8011",
    sicDescription: "Offices and Clinics of Doctors",
    totalRecords: 890000, // Estimated
    lastUpdate: "Q4 2025",
    price: 27.0,
    category: "healthcare",
    tags: ["physician", "doctor", "healthcare", "clinic"],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PROFESSIONAL SERVICES
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "usbiz-accountant",
    name: "US Accountant Database",
    slug: "accountant",
    sicCode: "8721",
    sicDescription: "Accounting, Auditing, Bookkeeping",
    totalRecords: 280000, // Estimated
    lastUpdate: "Q4 2025",
    price: 27.0,
    category: "professional",
    tags: ["accountant", "cpa", "bookkeeper", "financial"],
  },
  {
    id: "usbiz-attorney",
    name: "US Attorney Database",
    slug: "attorney",
    sicCode: "8111",
    sicDescription: "Legal Services",
    totalRecords: 450000, // Estimated
    lastUpdate: "Q4 2025",
    price: 27.0,
    category: "professional",
    tags: ["attorney", "lawyer", "legal", "law_firm"],
  },
  {
    id: "usbiz-insurance",
    name: "US Insurance Agency Database",
    slug: "insurance",
    sicCode: "6411",
    sicDescription: "Insurance Agents, Brokers, Service",
    totalRecords: 520000, // Estimated
    lastUpdate: "Q4 2025",
    price: 27.0,
    category: "financial",
    tags: ["insurance", "agent", "broker", "financial"],
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
// LUCI COPILOT QUERY INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

export interface LuciQuery {
  persona?: string; // "plumber", "dentist", etc.
  sicCodes?: string[];
  states?: string[];
  minRevenue?: number;
  maxRevenue?: number;
  minEmployees?: number;
  maxEmployees?: number;
  limit?: number;
}

export interface LuciQueryResult {
  query: LuciQuery;
  matchingDatabases: USBizDataDatabase[];
  estimatedRecords: number;
  recommendation: string;
}

export function luciQuery(query: LuciQuery): LuciQueryResult {
  let matches = [...USBIZDATA_REGISTRY];

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
    matches = matches.filter((db) => query.sicCodes!.includes(db.sicCode));
  }

  // Calculate estimated records
  const estimatedRecords = matches.reduce(
    (sum, db) => sum + db.totalRecords,
    0,
  );

  // Generate recommendation
  let recommendation = "";
  if (matches.length === 0) {
    recommendation =
      "No matching databases found. Try broadening your search or uploading a custom CSV.";
  } else if (matches.length === 1) {
    recommendation = `Found ${matches[0].name} with ${matches[0].totalRecords.toLocaleString()} records. Ready to import and enrich.`;
  } else {
    recommendation = `Found ${matches.length} databases with ${estimatedRecords.toLocaleString()} total records. Select one to begin import.`;
  }

  return {
    query,
    matchingDatabases: matches,
    estimatedRecords,
    recommendation,
  };
}

console.log(
  "[USBizData Registry] Loaded",
  USBIZDATA_REGISTRY.length,
  "databases with",
  getTotalRecordsAvailable().toLocaleString(),
  "total records",
);
