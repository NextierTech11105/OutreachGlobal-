import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { parse } from "csv-parse/sync";
import { randomUUID } from "crypto";

// DO Spaces configuration
const SPACES_ENDPOINT = "https://nyc3.digitaloceanspaces.com";
const SPACES_BUCKET = "nextier";
const SPACES_KEY = process.env.DO_SPACES_KEY || "";
const SPACES_SECRET = process.env.DO_SPACES_SECRET || "";

function getS3Client(): S3Client | null {
  if (!SPACES_KEY || !SPACES_SECRET) {
    return null;
  }
  return new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: "nyc3",
    credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
  });
}

// USBizData source type detection based on columns
type DataLakeType = "business" | "residential" | "cell_phone" | "opt_in_email" | "property" | "unknown";

function detectSourceType(headers: string[]): DataLakeType {
  const headerSet = new Set(headers.map(h => h.toLowerCase().trim()));

  // Business DB: has Company Name, SIC Code, Revenue, or Sales
  if (headerSet.has("company name") || headerSet.has("company") || headerSet.has("sic code") ||
      headerSet.has("annual revenue") || headerSet.has("sales")) {
    return "business";
  }
  // Cell Phone DB: has Cell Phone but no Company
  if ((headerSet.has("cell phone") || headerSet.has("cell") || headerSet.has("mobile")) &&
      !headerSet.has("company name") && !headerSet.has("company")) {
    return "cell_phone";
  }
  // Opt-in Email DB: has Opt-in Date or IP Address
  if (headerSet.has("opt-in date") || headerSet.has("opt_in_date") || headerSet.has("ip address")) {
    return "opt_in_email";
  }
  // Residential DB: has Home Value, Income, Age
  if (headerSet.has("home value") || headerSet.has("income") || headerSet.has("age") ||
      headerSet.has("home owner") || headerSet.has("length of residence")) {
    return "residential";
  }
  // Property DB: has APN, property type
  if (headerSet.has("apn") || headerSet.has("property type") || headerSet.has("parcel")) {
    return "property";
  }
  return "unknown";
}

const SOURCE_TYPE_LABELS: Record<DataLakeType, string> = {
  business: "USBizData Business",
  residential: "USBizData Residential",
  cell_phone: "USBizData Cell Phone",
  opt_in_email: "USBizData Opt-in Email",
  property: "Property Records",
  unknown: "CSV Import",
};

// Standard field mappings for USBizData and similar CSV formats
const FIELD_MAPPINGS: Record<string, string[]> = {
  companyName: ["Company", "Company Name", "company", "company_name", "Business Name", "business_name", "COMPANY NAME", "COMPANY"],
  contactName: ["Contact", "Contact Name", "contact", "contact_name", "Owner Name", "owner_name", "Full Name", "CONTACT NAME", "CONTACT"],
  firstName: ["First Name", "first_name", "FirstName", "FIRST NAME", "First"],
  lastName: ["Last Name", "last_name", "LastName", "LAST NAME", "Last"],
  email: ["Email", "email", "Email Address", "email_address", "EMAIL", "E-mail", "E-Mail"],
  phone: ["Phone", "phone", "Phone Number", "phone_number", "PHONE", "Telephone", "Tel"],
  directPhone: ["Direct Phone", "direct_phone", "Direct", "DIRECT PHONE"],
  cellPhone: ["Cell Phone", "cell_phone", "Cell", "cell", "Mobile", "mobile", "Mobile Phone", "CELL PHONE"],
  address: ["Street Address", "street_address", "Address", "address", "ADDRESS", "Street"],
  city: ["City", "city", "CITY"],
  state: ["State", "state", "STATE", "ST"],
  zip: ["Zip", "zip", "Zip Code", "zip_code", "ZIP", "Postal Code", "zipcode"],
  website: ["Website", "website", "Website URL", "website_url", "URL", "Web"],
  industry: ["Industry", "industry", "INDUSTRY", "Business Type"],
  sicCode: ["SIC Code", "sic_code", "SIC", "SIC_CODE"],
  sicDescription: ["SIC Description", "sic_description", "SIC_DESCRIPTION"],
  employees: ["Employees", "employees", "Number of Employees", "num_employees", "EMPLOYEES"],
  revenue: ["Revenue", "revenue", "Annual Revenue", "annual_revenue", "REVENUE", "Sales", "sales", "SALES"],
  title: ["Title", "title", "Job Title", "job_title", "TITLE", "Position"],
  county: ["County", "county", "COUNTY"],
  areaCode: ["Area Code", "area_code", "AREA CODE"],
  // Residential-specific
  homeValue: ["Home Value", "home_value", "Property Value", "property_value", "HOME VALUE"],
  income: ["Income", "income", "Estimated Income", "INCOME"],
  age: ["Age", "age", "AGE"],
  homeOwner: ["Home Owner", "home_owner", "Homeowner", "homeowner", "Owner", "HOME OWNER"],
  lengthOfResidence: ["Length of Residence", "length_of_residence", "Years at Address", "years_owned"],
  // Opt-in specific
  optInDate: ["Opt-in Date", "opt_in_date", "Optin Date", "signup_date", "OPT-IN DATE"],
  optInSource: ["Opt-in Source", "opt_in_source", "Source", "signup_source"],
  ipAddress: ["IP Address", "ip_address", "IP", "ip"],
};

// Find the actual column name from possible variations
function findColumn(headers: string[], fieldName: string): string | null {
  const variations = FIELD_MAPPINGS[fieldName] || [];
  for (const variation of variations) {
    const found = headers.find(h => h.toLowerCase().trim() === variation.toLowerCase().trim());
    if (found) return found;
  }
  return null;
}

// Simple hash function for change detection
function hashFields(record: Record<string, string | null>, fields: string[]): string {
  const values = fields.map(f => record[f] || "").join("|");
  // Simple hash using sum of char codes (for quick comparison)
  let hash = 0;
  for (let i = 0; i < values.length; i++) {
    const char = values.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Industries where businesses commonly OWN their operating property
const OWNER_OCCUPIED_SIC_CODES: Record<string, number> = {
  // Manufacturing - typically own their facilities (SIC 20-39)
  "20": 30, "21": 30, "22": 30, "23": 30, "24": 30, "25": 30, "26": 30, "27": 30, "28": 30, "29": 30,
  "30": 30, "31": 30, "32": 30, "33": 30, "34": 30, "35": 30, "36": 30, "37": 30, "38": 30, "39": 30,
  // Construction (SIC 15-17) - own equipment yards, offices
  "15": 25, "16": 25, "17": 25,
  // Trucking/Transportation (SIC 41-47)
  "41": 25, "42": 30, "421": 35, "422": 35, // Trucking terminals, warehousing
  "44": 25, "45": 20, "47": 20,
  // Auto repair/service (SIC 75)
  "75": 25, "753": 30, "754": 30,
  // Car washes (SIC 7542)
  "7542": 40,
  // Laundromats/cleaning (SIC 721)
  "721": 35, "7215": 40, // Coin-op laundries
  // Restaurants/bars - often own the building
  "58": 25, "581": 30,
  // Hotels/Motels/Lodging (SIC 70)
  "70": 35, "701": 40, "7011": 45, // Hotels/motels
  // Camping/RV parks (SIC 7033)
  "7032": 45, "7033": 45,
  // Healthcare/medical offices
  "80": 20, "801": 25, "802": 25, "803": 25,
  // Retail (smaller = more likely owner)
  "52": 20, "53": 20, "54": 22, "55": 20, "56": 20, "57": 20, "59": 20,
  // Real estate (definitely owns)
  "65": 45, "651": 50, "653": 50,
  // Mini storage/self storage (SIC 4225)
  "4225": 45,
  // Funeral services
  "726": 35,
  // Gas stations/convenience
  "554": 30,
  // Bowling/amusement (SIC 79)
  "793": 30, "7933": 35,
  // Nurseries/garden centers
  "526": 30, "078": 30,
};

// Calculate likelihood that this business OWNS their operating property
function calculatePropertyLinkageScore(record: Record<string, string | null>): {
  score: number;
  signals: string[];
  ownerOccupiedLikelihood: "high" | "medium" | "low";
} {
  let score = 0;
  const signals: string[] = [];

  const companyName = (record.companyName || "").toLowerCase();
  const sicCode = record.sicCode || "";
  const employees = record.employees || "";
  const revenue = record.revenue || "";
  const industry = (record.industry || "").toLowerCase();

  // 1. Check SIC code for owner-occupied industries
  for (const [sicPrefix, pts] of Object.entries(OWNER_OCCUPIED_SIC_CODES)) {
    if (sicCode.startsWith(sicPrefix)) {
      score += pts;
      signals.push(`sic:owner-occupied(${sicPrefix})`);
      break;
    }
  }

  // 2. Small businesses (< 100 employees) more likely to own
  if (employees.includes("less than 25") || employees.includes("Less than 25")) {
    score += 15;
    signals.push("size:micro");
  } else if (employees.includes("25 to") || employees.includes("100 to")) {
    score += 10;
    signals.push("size:small");
  }

  // 3. Higher revenue = more likely bought property
  if (revenue.includes("$10 mil") || revenue.includes("$25 mil") ||
      revenue.includes("$50 mil") || revenue.includes("$100 mil")) {
    score += 15;
    signals.push("revenue:established");
  }

  // 4. LLC/Inc - established business more likely owns
  if (companyName.includes(" llc") || companyName.includes(" inc") ||
      companyName.includes(" corp") || companyName.includes(" co.")) {
    score += 10;
    signals.push("entity:registered");
  }

  // 5. Industry keywords suggesting fixed location operations (likely owns property)
  const fixedLocationKeywords = [
    // Auto
    "auto", "repair", "garage", "body shop", "tire", "car wash", "carwash",
    // Manufacturing/Industrial
    "manufacturing", "factory", "plant", "machine", "fabricat",
    // Transportation/Trucking
    "trucking", "freight", "logistics", "terminal", "dispatch",
    // Warehouse/Storage
    "warehouse", "storage", "distribution", "self storage", "mini storage",
    // Food/Hospitality
    "restaurant", "diner", "cafe", "bar", "grill", "pizza", "deli",
    "hotel", "motel", "inn", "lodge", "camping", "campground", "rv park",
    // Services
    "laundromat", "laundry", "cleaners", "dry clean",
    "funeral", "mortuary", "cemetery",
    "clinic", "dental", "medical", "veterinary", "vet",
    // Construction
    "construction", "contractor", "builder", "excavat", "paving", "concrete",
    // Retail
    "shop", "mart", "store", "nursery", "garden center", "lumber"
  ];
  for (const keyword of fixedLocationKeywords) {
    if (companyName.includes(keyword) || industry.includes(keyword)) {
      score += 8;
      signals.push(`fixed:${keyword}`);
      break; // Only count once
    }
  }

  // 6. Family/personal name in business (family-owned = more likely owns property)
  if (companyName.includes("& son") || companyName.includes("& sons") ||
      companyName.includes("brothers") || companyName.includes("family")) {
    score += 10;
    signals.push("family:owned");
  }

  // Determine likelihood category
  const likelihood = score >= 50 ? "high" : score >= 25 ? "medium" : "low";

  return { score: Math.min(score, 100), signals, ownerOccupiedLikelihood: likelihood };
}

// Normalize a row to standard format
function normalizeRow(row: Record<string, string>, headers: string[]): Record<string, string | null> {
  const normalized: Record<string, string | null> = {};

  for (const [standardField, _] of Object.entries(FIELD_MAPPINGS)) {
    const columnName = findColumn(headers, standardField);
    normalized[standardField] = columnName ? (row[columnName]?.trim() || null) : null;
  }

  // Combine first + last name if no contact name
  if (!normalized.contactName && (normalized.firstName || normalized.lastName)) {
    normalized.contactName = [normalized.firstName, normalized.lastName].filter(Boolean).join(" ");
  }

  return normalized;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const tags = formData.get("tags") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Read file content
    const content = await file.text();

    // Parse CSV
    let records: Record<string, string>[];
    try {
      records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });
    } catch (parseError) {
      return NextResponse.json({
        error: "Failed to parse CSV. Make sure it's a valid CSV file.",
        details: parseError instanceof Error ? parseError.message : "Unknown error"
      }, { status: 400 });
    }

    if (records.length === 0) {
      return NextResponse.json({ error: "CSV file is empty" }, { status: 400 });
    }

    // Get headers from first record
    const headers = Object.keys(records[0]);

    // Auto-detect USBizData source type
    const sourceType = detectSourceType(headers);
    const sourceLabel = SOURCE_TYPE_LABELS[sourceType];
    console.log(`[CSV Upload] Detected source type: ${sourceType} (${sourceLabel})`);

    // Normalize all records
    const normalizedRecords = records.map(row => normalizeRow(row, headers));

    // Count records with key fields
    const withPhone = normalizedRecords.filter(r => r.phone).length;
    const withEmail = normalizedRecords.filter(r => r.email).length;
    const withAddress = normalizedRecords.filter(r => r.address && r.city && r.state).length;

    // Create bucket metadata
    const bucketId = `csv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    // Count cell phones specifically
    const withCellPhone = normalizedRecords.filter(r => r.cellPhone).length;

    const bucket = {
      id: bucketId,
      name: name,
      description: description || `Uploaded CSV: ${file.name}`,
      source: sourceLabel, // Auto-detected: "USBizData Business", "USBizData Residential", etc.
      sourceType: sourceType, // "business", "residential", "cell_phone", "opt_in_email"
      filters: {
        originalFileName: file.name,
        uploadedAt: now,
        columnMappings: headers.reduce((acc, h) => {
          for (const [field, variations] of Object.entries(FIELD_MAPPINGS)) {
            if (variations.some(v => v.toLowerCase() === h.toLowerCase())) {
              acc[h] = field;
              break;
            }
          }
          return acc;
        }, {} as Record<string, string>),
      },
      tags: tags ? tags.split(",").map(t => t.trim()) : [],
      createdAt: now,
      updatedAt: now,
      totalLeads: records.length,
      enrichedLeads: 0,
      queuedLeads: 0,
      contactedLeads: 0,
      enrichmentStatus: "pending",
      // Store the actual data with UUIDs and analytics
      properties: normalizedRecords.map((record, index) => {
        const linkage = calculatePropertyLinkageScore(record);
        const recordId = randomUUID();

        return {
          id: recordId,
          bucketId: bucketId,
          rowIndex: index,
          ...record,
          // Property linkage scoring (ML-lite)
          // Identifies businesses likely to OWN their operating property
          propertyLinkage: {
            score: linkage.score,
            signals: linkage.signals,
            likelihood: linkage.ownerOccupiedLikelihood, // "high", "medium", "low"
            likelyPropertyOwner: linkage.score >= 50,
            // For campaign: "Quick question. Thought about what {business} and property is worth?"
            campaignEligible: linkage.score >= 30,
          },
          // Change tracking / sync metadata
          _syncMeta: {
            createdAt: now,
            updatedAt: now,
            version: 1,
            // Fields to monitor for changes (auto-sync)
            monitoredFields: ["phone", "email", "address", "contactName"],
            // Hash of monitored fields for quick change detection
            fieldHash: hashFields(record, ["phone", "email", "address", "contactName"]),
            // Sync status
            syncStatus: "new",
            lastSyncAt: null,
            syncSource: sourceLabel,
          },
          // Keep original row data too
          _original: records[index],
        };
      }),
      // Indexes for faster lookups
      indexes: {
        // Index by SIC code for industry grouping
        bySicCode: normalizedRecords.reduce((acc, record, index) => {
          const sic = record.sicCode as string;
          if (sic) {
            if (!acc[sic]) acc[sic] = [];
            acc[sic].push(index);
          }
          return acc;
        }, {} as Record<string, number[]>),
        // Index by state for geographic grouping
        byState: normalizedRecords.reduce((acc, record, index) => {
          const state = record.state as string;
          if (state) {
            const key = state.toUpperCase();
            if (!acc[key]) acc[key] = [];
            acc[key].push(index);
          }
          return acc;
        }, {} as Record<string, number[]>),
        // Index by city for local grouping
        byCity: normalizedRecords.reduce((acc, record, index) => {
          const city = record.city as string;
          const state = record.state as string;
          if (city && state) {
            const key = `${city.toLowerCase()}-${state.toUpperCase()}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(index);
          }
          return acc;
        }, {} as Record<string, number[]>),
        // Index of likely property owners (score >= 50)
        likelyPropertyOwners: normalizedRecords.reduce((acc, record, index) => {
          const linkage = calculatePropertyLinkageScore(record);
          if (linkage.score >= 50) {
            acc.push(index);
          }
          return acc;
        }, [] as number[]),
      },
      metadata: {
        id: bucketId,
        name: name,
        description: description,
        savedCount: records.length,
        searchParams: {},
        tags: tags ? tags.split(",").map(t => t.trim()) : [],
        createdAt: now,
        stats: {
          total: records.length,
          withPhone,
          withCellPhone,
          withEmail,
          withAddress,
          enrichable: withAddress, // Records that can be skip-traced
          needsSkipTrace: withAddress - withCellPhone, // Have address but no cell
        },
      },
    };

    // Save to DO Spaces
    const client = getS3Client();
    if (client) {
      await client.send(
        new PutObjectCommand({
          Bucket: SPACES_BUCKET,
          Key: `buckets/${bucketId}.json`,
          Body: JSON.stringify(bucket, null, 2),
          ContentType: "application/json",
        })
      );
    } else {
      console.warn("[CSV Upload] DO Spaces not configured, data not persisted");
    }

    return NextResponse.json({
      success: true,
      bucket: {
        id: bucket.id,
        name: bucket.name,
        totalLeads: bucket.totalLeads,
        stats: bucket.metadata.stats,
      },
      message: `Uploaded ${records.length} records. ${withPhone} with phones, ${withEmail} with emails, ${withAddress} enrichable addresses.`,
    });
  } catch (error) {
    console.error("[CSV Upload] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
