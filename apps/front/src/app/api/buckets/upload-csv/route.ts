import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
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
type DataLakeType =
  | "business"
  | "residential"
  | "cell_phone"
  | "opt_in_email"
  | "property"
  | "unknown";

function detectSourceType(headers: string[]): DataLakeType {
  const headerSet = new Set(headers.map((h) => h.toLowerCase().trim()));

  // Business DB: has Company Name, SIC Code, Revenue, or Sales
  if (
    headerSet.has("company name") ||
    headerSet.has("company") ||
    headerSet.has("sic code") ||
    headerSet.has("annual revenue") ||
    headerSet.has("sales")
  ) {
    return "business";
  }
  // Cell Phone DB: has Cell Phone but no Company
  if (
    (headerSet.has("cell phone") ||
      headerSet.has("cell") ||
      headerSet.has("mobile")) &&
    !headerSet.has("company name") &&
    !headerSet.has("company")
  ) {
    return "cell_phone";
  }
  // Opt-in Email DB: has Opt-in Date or IP Address
  if (
    headerSet.has("opt-in date") ||
    headerSet.has("opt_in_date") ||
    headerSet.has("ip address")
  ) {
    return "opt_in_email";
  }
  // Residential DB: has Home Value, Income, Age
  if (
    headerSet.has("home value") ||
    headerSet.has("income") ||
    headerSet.has("age") ||
    headerSet.has("home owner") ||
    headerSet.has("length of residence")
  ) {
    return "residential";
  }
  // Property DB: has APN, property type
  if (
    headerSet.has("apn") ||
    headerSet.has("property type") ||
    headerSet.has("parcel")
  ) {
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
  companyName: [
    "Company",
    "Company Name",
    "company",
    "company_name",
    "Business Name",
    "business_name",
    "COMPANY NAME",
    "COMPANY",
  ],
  contactName: [
    "Contact",
    "Contact Name",
    "contact",
    "contact_name",
    "Owner Name",
    "owner_name",
    "Full Name",
    "CONTACT NAME",
    "CONTACT",
  ],
  firstName: [
    "First Name",
    "first_name",
    "FirstName",
    "FIRST NAME",
    "First",
    "Contact First",
    "contact_first",
  ],
  lastName: [
    "Last Name",
    "last_name",
    "LastName",
    "LAST NAME",
    "Last",
    "Contact Last",
    "contact_last",
  ],
  email: [
    "Email",
    "email",
    "Email Address",
    "email_address",
    "EMAIL",
    "E-mail",
    "E-Mail",
  ],
  phone: [
    "Phone",
    "phone",
    "Phone Number",
    "phone_number",
    "PHONE",
    "Telephone",
    "Tel",
  ],
  directPhone: ["Direct Phone", "direct_phone", "Direct", "DIRECT PHONE"],
  cellPhone: [
    "Cell Phone",
    "cell_phone",
    "Cell",
    "cell",
    "Mobile",
    "mobile",
    "Mobile Phone",
    "CELL PHONE",
  ],
  address: [
    "Street Address",
    "street_address",
    "Address",
    "address",
    "ADDRESS",
    "Street",
  ],
  city: ["City", "city", "CITY"],
  state: ["State", "state", "STATE", "ST"],
  zip: ["Zip", "zip", "Zip Code", "zip_code", "ZIP", "Postal Code", "zipcode"],
  website: ["Website", "website", "Website URL", "website_url", "URL", "Web"],
  industry: ["Industry", "industry", "INDUSTRY", "Business Type"],
  sicCode: ["SIC Code", "sic_code", "SIC", "SIC_CODE"],
  sicDescription: [
    "SIC Description",
    "sic_description",
    "SIC_DESCRIPTION",
    "SIC Desc",
  ],
  naicsCode: ["NAICS Code", "naics_code", "NAICS", "NAICS_CODE"],
  naicsDescription: [
    "NAICS Description",
    "naics_description",
    "NAICS_DESCRIPTION",
    "NAICS Desc",
  ],
  street2: [
    "Street 2",
    "street_2",
    "Street2",
    "STREET 2",
    "Address 2",
    "address_2",
    "Suite",
    "Unit",
    "Apt",
  ],
  employees: [
    "Employees",
    "employees",
    "Number of Employees",
    "num_employees",
    "EMPLOYEES",
    "Employee Range",
    "employee_range",
  ],
  revenue: [
    "Revenue",
    "revenue",
    "Annual Revenue",
    "annual_revenue",
    "REVENUE",
    "Sales",
    "sales",
    "SALES",
    "Annual Sales",
    "annual_sales",
  ],
  title: ["Title", "title", "Job Title", "job_title", "TITLE", "Position"],
  county: ["County", "county", "COUNTY"],
  areaCode: ["Area Code", "area_code", "AREA CODE"],
  // Residential-specific
  homeValue: [
    "Home Value",
    "home_value",
    "Property Value",
    "property_value",
    "HOME VALUE",
  ],
  income: ["Income", "income", "Estimated Income", "INCOME"],
  age: ["Age", "age", "AGE"],
  homeOwner: [
    "Home Owner",
    "home_owner",
    "Homeowner",
    "homeowner",
    "Owner",
    "HOME OWNER",
  ],
  lengthOfResidence: [
    "Length of Residence",
    "length_of_residence",
    "Years at Address",
    "years_owned",
  ],
  // Opt-in specific
  optInDate: [
    "Opt-in Date",
    "opt_in_date",
    "Optin Date",
    "signup_date",
    "OPT-IN DATE",
  ],
  optInSource: ["Opt-in Source", "opt_in_source", "Source", "signup_source"],
  ipAddress: ["IP Address", "ip_address", "IP", "ip"],
};

// Find the actual column name from possible variations
function findColumn(headers: string[], fieldName: string): string | null {
  const variations = FIELD_MAPPINGS[fieldName] || [];
  for (const variation of variations) {
    const found = headers.find(
      (h) => h.toLowerCase().trim() === variation.toLowerCase().trim(),
    );
    if (found) return found;
  }
  return null;
}

// Simple hash function for change detection
function hashFields(
  record: Record<string, string | null>,
  fields: string[],
): string {
  const values = fields.map((f) => record[f] || "").join("|");
  // Simple hash using sum of char codes (for quick comparison)
  let hash = 0;
  for (let i = 0; i < values.length; i++) {
    const char = values.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// === SENIORITY DETECTION ===
// Target decision-makers: Owner, CEO, Partner, VP, Sales Manager
const SENIORITY_PATTERNS: {
  level: string;
  patterns: string[];
  weight: number;
}[] = [
  {
    level: "owner",
    patterns: ["owner", "co-owner", "co owner", "principal", "proprietor"],
    weight: 100,
  },
  {
    level: "founder",
    patterns: ["founder", "co-founder", "cofounder"],
    weight: 95,
  },
  {
    level: "c_suite",
    patterns: [
      "ceo",
      "chief executive",
      "cfo",
      "chief financial",
      "coo",
      "chief operating",
      "cto",
      "chief technology",
      "cmo",
      "chief marketing",
    ],
    weight: 90,
  },
  {
    level: "president",
    patterns: ["president", "managing director", "general manager", "gm"],
    weight: 85,
  },
  {
    level: "partner",
    patterns: [
      "partner",
      "managing partner",
      "senior partner",
      "equity partner",
    ],
    weight: 80,
  },
  {
    level: "vp",
    patterns: ["vp", "vice president", "vice-president", "evp", "svp", "avp"],
    weight: 75,
  },
  {
    level: "director",
    patterns: ["director", "executive director", "managing director"],
    weight: 70,
  },
  {
    level: "sales_manager",
    patterns: [
      "sales manager",
      "sales director",
      "regional sales",
      "national sales",
      "sales lead",
      "head of sales",
    ],
    weight: 65,
  },
  {
    level: "manager",
    patterns: [
      "manager",
      "office manager",
      "operations manager",
      "branch manager",
    ],
    weight: 50,
  },
];

// Detect seniority level from title
function detectSeniority(title: string | null): {
  level: string;
  weight: number;
  isDecisionMaker: boolean;
} {
  if (!title) return { level: "unknown", weight: 0, isDecisionMaker: false };

  const titleLower = title.toLowerCase();

  for (const { level, patterns, weight } of SENIORITY_PATTERNS) {
    for (const pattern of patterns) {
      if (titleLower.includes(pattern)) {
        // Decision makers: Owner, CEO/C-Suite, President, Partner, VP, Sales Manager
        const isDecisionMaker = [
          "owner",
          "founder",
          "c_suite",
          "president",
          "partner",
          "vp",
          "sales_manager",
        ].includes(level);
        return { level, weight, isDecisionMaker };
      }
    }
  }

  return { level: "other", weight: 0, isDecisionMaker: false };
}

// Industries where businesses commonly OWN their operating property
const OWNER_OCCUPIED_SIC_CODES: Record<string, number> = {
  // Manufacturing - typically own their facilities (SIC 20-39)
  "20": 30,
  "21": 30,
  "22": 30,
  "23": 30,
  "24": 30,
  "25": 30,
  "26": 30,
  "27": 30,
  "28": 30,
  "29": 30,
  "30": 30,
  "31": 30,
  "32": 30,
  "33": 30,
  "34": 30,
  "35": 30,
  "36": 30,
  "37": 30,
  "38": 30,
  "39": 30,
  // Construction (SIC 15-17) - own equipment yards, offices
  "15": 25,
  "16": 25,
  "17": 25,
  // Trucking/Transportation (SIC 41-47)
  "41": 25,
  "42": 30,
  "421": 35,
  "422": 35, // Trucking terminals, warehousing
  "44": 25,
  "45": 20,
  "47": 20,
  // Auto repair/service (SIC 75)
  "75": 25,
  "753": 30,
  "754": 30,
  // Car washes (SIC 7542)
  "7542": 40,
  // Laundromats/cleaning (SIC 721)
  "721": 35,
  "7215": 40, // Coin-op laundries
  // Restaurants/bars - often own the building
  "58": 25,
  "581": 30,
  // Hotels/Motels/Lodging (SIC 70)
  "70": 35,
  "701": 40,
  "7011": 45, // Hotels/motels
  // Camping/RV parks (SIC 7033)
  "7032": 45,
  "7033": 45,
  // Healthcare/medical offices
  "80": 20,
  "801": 25,
  "802": 25,
  "803": 25,
  // Retail (smaller = more likely owner)
  "52": 20,
  "53": 20,
  "54": 22,
  "55": 20,
  "56": 20,
  "57": 20,
  "59": 20,
  // Real estate (definitely owns)
  "65": 45,
  "651": 50,
  "653": 50,
  // Mini storage/self storage (SIC 4225)
  "4225": 45,
  // Funeral services
  "726": 35,
  // Gas stations/convenience
  "554": 30,
  // Bowling/amusement (SIC 79)
  "793": 30,
  "7933": 35,
  // Nurseries/garden centers
  "526": 30,
  "078": 30,
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
  const empLower = employees.toLowerCase();
  if (
    empLower.includes("less than 25") ||
    empLower.includes("1 to 4") ||
    empLower.includes("5 to 9") ||
    empLower.includes("10 to 19") ||
    empLower.includes("1-4") ||
    empLower.includes("5-9") ||
    empLower.includes("10-19")
  ) {
    score += 15;
    signals.push("size:micro");
  } else if (
    empLower.includes("20 to") ||
    empLower.includes("25 to") ||
    empLower.includes("50 to") ||
    empLower.includes("100 to") ||
    empLower.includes("20-") ||
    empLower.includes("50-")
  ) {
    score += 10;
    signals.push("size:small");
  }

  // 3. Higher revenue = more likely bought property
  const revLower = revenue.toLowerCase();
  if (
    revLower.includes("million") ||
    revLower.includes("$10 mil") ||
    revLower.includes("$25 mil") ||
    revLower.includes("$50 mil") ||
    revLower.includes("$100 mil") ||
    revLower.includes("$5 to") ||
    revLower.includes("$10 to") ||
    revLower.includes("$25 to")
  ) {
    score += 15;
    signals.push("revenue:established");
  }

  // 4. LLC/Inc - established business more likely owns
  if (
    companyName.includes(" llc") ||
    companyName.includes(" inc") ||
    companyName.includes(" corp") ||
    companyName.includes(" co.")
  ) {
    score += 10;
    signals.push("entity:registered");
  }

  // 5. Industry keywords suggesting fixed location operations (likely owns property)
  const fixedLocationKeywords = [
    // Auto
    "auto",
    "repair",
    "garage",
    "body shop",
    "tire",
    "car wash",
    "carwash",
    // Manufacturing/Industrial
    "manufacturing",
    "factory",
    "plant",
    "machine",
    "fabricat",
    // Transportation/Trucking
    "trucking",
    "freight",
    "logistics",
    "terminal",
    "dispatch",
    // Warehouse/Storage
    "warehouse",
    "storage",
    "distribution",
    "self storage",
    "mini storage",
    // Food/Hospitality
    "restaurant",
    "diner",
    "cafe",
    "bar",
    "grill",
    "pizza",
    "deli",
    "hotel",
    "motel",
    "inn",
    "lodge",
    "camping",
    "campground",
    "rv park",
    // Services
    "laundromat",
    "laundry",
    "cleaners",
    "dry clean",
    "funeral",
    "mortuary",
    "cemetery",
    "clinic",
    "dental",
    "medical",
    "veterinary",
    "vet",
    // Construction
    "construction",
    "contractor",
    "builder",
    "excavat",
    "paving",
    "concrete",
    // Retail
    "shop",
    "mart",
    "store",
    "nursery",
    "garden center",
    "lumber",
  ];
  for (const keyword of fixedLocationKeywords) {
    if (companyName.includes(keyword) || industry.includes(keyword)) {
      score += 8;
      signals.push(`fixed:${keyword}`);
      break; // Only count once
    }
  }

  // 6. Family/personal name in business (family-owned = more likely owns property)
  if (
    companyName.includes("& son") ||
    companyName.includes("& sons") ||
    companyName.includes("brothers") ||
    companyName.includes("family")
  ) {
    score += 10;
    signals.push("family:owned");
  }

  // Determine likelihood category
  const likelihood = score >= 50 ? "high" : score >= 25 ? "medium" : "low";

  return {
    score: Math.min(score, 100),
    signals,
    ownerOccupiedLikelihood: likelihood,
  };
}

// Normalize a row to standard format
function normalizeRow(
  row: Record<string, string>,
  headers: string[],
): Record<string, string | null> {
  const normalized: Record<string, string | null> = {};

  for (const [standardField, _] of Object.entries(FIELD_MAPPINGS)) {
    const columnName = findColumn(headers, standardField);
    normalized[standardField] = columnName
      ? row[columnName]?.trim() || null
      : null;
  }

  // Combine first + last name if no contact name
  if (
    !normalized.contactName &&
    (normalized.firstName || normalized.lastName)
  ) {
    normalized.contactName = [normalized.firstName, normalized.lastName]
      .filter(Boolean)
      .join(" ");
  }

  return normalized;
}

// Helper to update the bucket index
async function updateBucketIndex(client: S3Client, newBucket: any) {
  try {
    // 1. Get existing index
    let buckets: any[] = [];
    try {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: SPACES_BUCKET,
          Key: "buckets/_index.json",
        }),
      );
      const content = await response.Body?.transformToString();
      if (content) {
        const index = JSON.parse(content);
        buckets = index.buckets || [];
      }
    } catch (e) {
      // Index doesn't exist yet, start empty
    }

    // 2. Add new bucket to top
    // Create a minimal bucket object for the index
    const indexEntry = {
      id: newBucket.id,
      name: newBucket.name,
      description: newBucket.metadata.description,
      source: "csv", // Default for CSV uploads
      tags: newBucket.metadata.tags,
      createdAt: newBucket.metadata.createdAt,
      updatedAt: newBucket.metadata.createdAt,
      totalLeads: newBucket.metadata.stats.total,
      enrichedLeads: 0,
      enrichmentStatus: "pending",
    };

    buckets.unshift(indexEntry);

    // 3. Save updated index
    await client.send(
      new PutObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: "buckets/_index.json",
        Body: JSON.stringify(
          {
            buckets,
            updatedAt: new Date().toISOString(),
            count: buckets.length,
          },
          null,
          2,
        ),
        ContentType: "application/json",
      }),
    );
    console.log(`[CSV Upload] Updated index with bucket ${newBucket.id}`);
  } catch (error) {
    console.error("[CSV Upload] Failed to update index:", error);
  }
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
      return NextResponse.json(
        {
          error: "Failed to parse CSV. Make sure it's a valid CSV file.",
          details:
            parseError instanceof Error ? parseError.message : "Unknown error",
        },
        { status: 400 },
      );
    }

    if (records.length === 0) {
      return NextResponse.json({ error: "CSV file is empty" }, { status: 400 });
    }

    // Get headers from first record
    const headers = Object.keys(records[0]);

    // Auto-detect USBizData source type
    const sourceType = detectSourceType(headers);
    const sourceLabel = SOURCE_TYPE_LABELS[sourceType];
    console.log(
      `[CSV Upload] Detected source type: ${sourceType} (${sourceLabel})`,
    );

    // Normalize all records
    const normalizedRecords = records.map((row) => normalizeRow(row, headers));

    // Count records with key fields
    const withPhone = normalizedRecords.filter((r) => r.phone).length;
    const withEmail = normalizedRecords.filter((r) => r.email).length;
    const withAddress = normalizedRecords.filter(
      (r) => r.address && r.city && r.state,
    ).length;

    // Create bucket metadata
    const bucketId = `csv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    // Count cell phones specifically
    const withCellPhone = normalizedRecords.filter((r) => r.cellPhone).length;

    // Calculate property ownership stats for auto-tagging
    const propertyScores = normalizedRecords.map((r) =>
      calculatePropertyLinkageScore(r),
    );
    const highLikelihood = propertyScores.filter(
      (s) => s.ownerOccupiedLikelihood === "high",
    ).length;
    const mediumLikelihood = propertyScores.filter(
      (s) => s.ownerOccupiedLikelihood === "medium",
    ).length;
    const lowLikelihood = propertyScores.filter(
      (s) => s.ownerOccupiedLikelihood === "low",
    ).length;
    const campaignEligible = propertyScores.filter((s) => s.score >= 30).length;
    const likelyOwners = propertyScores.filter((s) => s.score >= 50).length;

    // Calculate seniority/decision-maker stats
    const seniorityStats = normalizedRecords.map((r) =>
      detectSeniority(r.title),
    );
    const decisionMakerCount = seniorityStats.filter(
      (s) => s.isDecisionMaker,
    ).length;
    const seniorityBreakdown: Record<string, number> = {};
    seniorityStats.forEach((s) => {
      seniorityBreakdown[s.level] = (seniorityBreakdown[s.level] || 0) + 1;
    });

    // Collect all signals from property scoring for auto-tagging
    const allSignals = propertyScores.flatMap((s) => s.signals);
    const signalCounts: Record<string, number> = {};
    allSignals.forEach((sig) => {
      signalCounts[sig] = (signalCounts[sig] || 0) + 1;
    });

    // Auto-generate tags based on data analysis
    const autoTags: string[] = [];

    // Property ownership tags
    if (likelyOwners > 0) autoTags.push("property-owners");
    if (highLikelihood > records.length * 0.1)
      autoTags.push("high-owner-likelihood");
    if (campaignEligible > records.length * 0.3)
      autoTags.push("campaign-ready");

    // Decision-maker tags (Owner, CEO, Partner, VP, Sales Manager)
    if (decisionMakerCount > 0) autoTags.push("has-decision-makers");
    if (decisionMakerCount > records.length * 0.2)
      autoTags.push("decision-maker-rich");
    if ((seniorityBreakdown["owner"] || 0) > minForTag) autoTags.push("owners");
    if ((seniorityBreakdown["c_suite"] || 0) > minForTag)
      autoTags.push("c-suite");
    if ((seniorityBreakdown["president"] || 0) > minForTag)
      autoTags.push("presidents");
    if ((seniorityBreakdown["partner"] || 0) > minForTag)
      autoTags.push("partners");
    if ((seniorityBreakdown["vp"] || 0) > minForTag) autoTags.push("vps");
    if ((seniorityBreakdown["sales_manager"] || 0) > minForTag)
      autoTags.push("sales-managers");

    // Source type tags
    if (sourceType === "business") autoTags.push("b2b");
    if (sourceType === "residential") autoTags.push("b2c");

    // Contact readiness tags
    if (withCellPhone > records.length * 0.5) autoTags.push("mobile-ready");
    if (withEmail > records.length * 0.5) autoTags.push("email-ready");
    if (withPhone > records.length * 0.8) autoTags.push("phone-rich");

    // Industry tags based on signals (if >5% of records have this signal)
    const minForTag = Math.max(5, records.length * 0.05);

    // Fixed location / owner-occupied industries
    if (
      (signalCounts["fixed:trucking"] || 0) +
        (signalCounts["fixed:freight"] || 0) +
        (signalCounts["fixed:logistics"] || 0) >=
      minForTag
    ) {
      autoTags.push("trucking");
    }
    if (
      (signalCounts["fixed:warehouse"] || 0) +
        (signalCounts["fixed:storage"] || 0) +
        (signalCounts["fixed:distribution"] || 0) >=
      minForTag
    ) {
      autoTags.push("warehouse-storage");
    }
    if (
      (signalCounts["fixed:manufacturing"] || 0) +
        (signalCounts["fixed:factory"] || 0) +
        (signalCounts["fixed:plant"] || 0) >=
      minForTag
    ) {
      autoTags.push("manufacturing");
    }
    if (
      (signalCounts["fixed:auto"] || 0) +
        (signalCounts["fixed:repair"] || 0) +
        (signalCounts["fixed:garage"] || 0) >=
      minForTag
    ) {
      autoTags.push("auto-services");
    }
    if (
      (signalCounts["fixed:car wash"] || 0) +
        (signalCounts["fixed:carwash"] || 0) >=
      minForTag
    ) {
      autoTags.push("car-wash");
    }
    if (
      (signalCounts["fixed:laundromat"] || 0) +
        (signalCounts["fixed:laundry"] || 0) +
        (signalCounts["fixed:cleaners"] || 0) >=
      minForTag
    ) {
      autoTags.push("laundromat");
    }
    if (
      (signalCounts["fixed:restaurant"] || 0) +
        (signalCounts["fixed:diner"] || 0) +
        (signalCounts["fixed:cafe"] || 0) +
        (signalCounts["fixed:bar"] || 0) >=
      minForTag
    ) {
      autoTags.push("food-service");
    }
    if (
      (signalCounts["fixed:hotel"] || 0) +
        (signalCounts["fixed:motel"] || 0) +
        (signalCounts["fixed:inn"] || 0) +
        (signalCounts["fixed:lodge"] || 0) >=
      minForTag
    ) {
      autoTags.push("hospitality");
    }
    if (
      (signalCounts["fixed:camping"] || 0) +
        (signalCounts["fixed:campground"] || 0) +
        (signalCounts["fixed:rv park"] || 0) >=
      minForTag
    ) {
      autoTags.push("camping-rv");
    }
    if (
      (signalCounts["fixed:construction"] || 0) +
        (signalCounts["fixed:contractor"] || 0) +
        (signalCounts["fixed:builder"] || 0) >=
      minForTag
    ) {
      autoTags.push("construction");
    }
    if (
      (signalCounts["fixed:clinic"] || 0) +
        (signalCounts["fixed:dental"] || 0) +
        (signalCounts["fixed:medical"] || 0) +
        (signalCounts["fixed:veterinary"] || 0) >=
      minForTag
    ) {
      autoTags.push("healthcare");
    }
    if (
      (signalCounts["fixed:funeral"] || 0) +
        (signalCounts["fixed:mortuary"] || 0) >=
      minForTag
    ) {
      autoTags.push("funeral-services");
    }

    // Business structure tags
    if ((signalCounts["entity:registered"] || 0) >= records.length * 0.3) {
      autoTags.push("established-entities");
    }
    if ((signalCounts["family:owned"] || 0) >= minForTag) {
      autoTags.push("family-businesses");
    }

    // Size tags
    if ((signalCounts["size:micro"] || 0) >= records.length * 0.5) {
      autoTags.push("micro-businesses");
    }
    if ((signalCounts["size:small"] || 0) >= records.length * 0.3) {
      autoTags.push("small-businesses");
    }
    if ((signalCounts["revenue:established"] || 0) >= records.length * 0.2) {
      autoTags.push("revenue-established");
    }

    // Merge user tags with auto tags
    const userTags = tags ? tags.split(",").map((t) => t.trim()) : [];
    const allTags = [...new Set([...userTags, ...autoTags])];

    const bucket = {
      id: bucketId,
      name: name,
      description: description || `Uploaded CSV: ${file.name}`,
      source: sourceLabel, // Auto-detected: "USBizData Business", "USBizData Residential", etc.
      sourceType: sourceType, // "business", "residential", "cell_phone", "opt_in_email"
      filters: {
        originalFileName: file.name,
        uploadedAt: now,
        columnMappings: headers.reduce(
          (acc, h) => {
            for (const [field, variations] of Object.entries(FIELD_MAPPINGS)) {
              if (variations.some((v) => v.toLowerCase() === h.toLowerCase())) {
                acc[h] = field;
                break;
              }
            }
            return acc;
          },
          {} as Record<string, string>,
        ),
      },
      tags: allTags,
      autoTags: autoTags, // Tags generated by analysis
      createdAt: now,
      updatedAt: now,
      totalLeads: records.length,
      enrichedLeads: 0,
      queuedLeads: 0,
      contactedLeads: 0,
      enrichmentStatus: "pending",
      // MINIMAL STORAGE: IDs + matching keys only (enrich on-demand to control costs)
      // Full data lives in _original, only matching keys stored for cross-referencing
      records: normalizedRecords.map((record, index) => {
        const linkage = calculatePropertyLinkageScore(record);
        const recordId = randomUUID();

        // Determine absentee status (business address != mailing address pattern)
        const isAbsentee = !!(
          record.companyName &&
          record.address &&
          (record.state?.toLowerCase() !== "ny" || // Out of state = absentee
            linkage.signals.some(
              (s) => s.includes("fixed:") || s.includes("sic:owner-occupied"),
            ))
        );

        // Detect seniority from title
        const seniority = detectSeniority(record.title);

        // Record-level tags
        const recordTags: string[] = [];
        if (linkage.score >= 50) recordTags.push("likely-property-owner");
        if (linkage.score >= 30) recordTags.push("campaign-ready");
        if (isAbsentee) recordTags.push("absentee");
        if (linkage.signals.some((s) => s.includes("family")))
          recordTags.push("family-business");
        if (linkage.signals.some((s) => s.includes("entity:registered")))
          recordTags.push("established");

        // Add seniority tags
        if (seniority.isDecisionMaker) recordTags.push("decision-maker");
        if (seniority.level !== "unknown" && seniority.level !== "other") {
          recordTags.push(`seniority:${seniority.level}`);
        }

        // Add industry tags from signals
        linkage.signals.forEach((sig) => {
          if (sig.startsWith("fixed:"))
            recordTags.push(sig.replace("fixed:", ""));
          if (sig.startsWith("sic:")) recordTags.push("sic-matched");
        });

        return {
          // === CORE ID ===
          id: recordId,
          bucketId: bucketId,
          rowIndex: index,

          // === MATCHING KEYS (for cross-referencing) ===
          matchingKeys: {
            companyName: record.companyName || null,
            contactName: record.contactName || null,
            firstName: record.firstName || null,
            lastName: record.lastName || null,
            title: record.title || null,
            address: record.address || null,
            street2: record.street2 || null,
            city: record.city || null,
            state: record.state || null,
            zip: record.zip || null,
            county: record.county || null,
            sicCode: record.sicCode || null,
            sicDescription: record.sicDescription || null,
            naicsCode: record.naicsCode || null,
            naicsDescription: record.naicsDescription || null,
          },

          // === SENIORITY (for decision-maker targeting) ===
          seniority: {
            level: seniority.level,
            weight: seniority.weight,
            isDecisionMaker: seniority.isDecisionMaker,
            title: record.title || null,
          },

          // === PRE-COMPUTED SCORES (no enrichment needed) ===
          propertyScore: linkage.score,
          propertyLikelihood: linkage.ownerOccupiedLikelihood,
          signals: linkage.signals,

          // === FLAGS ===
          flags: {
            likelyPropertyOwner: linkage.score >= 50,
            campaignEligible: linkage.score >= 30,
            absentee: isAbsentee,
            isDecisionMaker: seniority.isDecisionMaker, // Owner, CEO, Partner, VP, Sales Manager
            hasPhone: !!record.phone,
            hasEmail: !!record.email,
            hasCellPhone: !!record.cellPhone,
            hasAddress: !!(record.address && record.city && record.state),
          },

          // === TAGS (filterable) ===
          tags: recordTags,

          // === ENRICHMENT STATUS ===
          enrichment: {
            status: "pending", // pending | in_progress | enriched | failed
            skipTraced: false,
            apolloEnriched: false,
            propertyMatched: false,
            lastEnrichedAt: null,
            enrichedData: null, // Populated on-demand
          },

          // === CHANGE TRACKING ===
          changeTracking: {
            createdAt: now,
            updatedAt: now,
            version: 1,
            fieldHash: hashFields(record, [
              "phone",
              "email",
              "address",
              "contactName",
            ]),
            changedFields: [], // Populated when data changes
          },

          // === ORIGINAL DATA (for enrichment input) ===
          _original: records[index],
        };
      }),
      // Indexes for faster lookups
      indexes: {
        // Index by SIC code for industry grouping
        bySicCode: normalizedRecords.reduce(
          (acc, record, index) => {
            const sic = record.sicCode as string;
            if (sic) {
              if (!acc[sic]) acc[sic] = [];
              acc[sic].push(index);
            }
            return acc;
          },
          {} as Record<string, number[]>,
        ),
        // Index by state for geographic grouping
        byState: normalizedRecords.reduce(
          (acc, record, index) => {
            const state = record.state as string;
            if (state) {
              const key = state.toUpperCase();
              if (!acc[key]) acc[key] = [];
              acc[key].push(index);
            }
            return acc;
          },
          {} as Record<string, number[]>,
        ),
        // Index by city for local grouping
        byCity: normalizedRecords.reduce(
          (acc, record, index) => {
            const city = record.city as string;
            const state = record.state as string;
            if (city && state) {
              const key = `${city.toLowerCase()}-${state.toUpperCase()}`;
              if (!acc[key]) acc[key] = [];
              acc[key].push(index);
            }
            return acc;
          },
          {} as Record<string, number[]>,
        ),
        // Index by county for geographic sectors (USBizData NY)
        byCounty: normalizedRecords.reduce(
          (acc, record, index) => {
            const county = record.county as string;
            if (county) {
              // Normalize county name - remove " County" suffix if present
              const normalizedCounty = county.replace(/ County$/i, "").trim();
              if (!acc[normalizedCounty]) acc[normalizedCounty] = [];
              acc[normalizedCounty].push(index);
            }
            return acc;
          },
          {} as Record<string, number[]>,
        ),
        // Index of likely property owners (score >= 50)
        likelyPropertyOwners: normalizedRecords.reduce((acc, record, index) => {
          const linkage = calculatePropertyLinkageScore(record);
          if (linkage.score >= 50) {
            acc.push(index);
          }
          return acc;
        }, [] as number[]),

        // === BLUE COLLAR INDEX ===
        // Main Street blue collar businesses: trucking, construction, auto, manufacturing, etc.
        blueCollar: normalizedRecords.reduce((acc, record, index) => {
          const companyLower = (record.companyName || "").toLowerCase();
          const sicCode = record.sicCode || "";
          const industry = (record.industry || "").toLowerCase();

          // Blue collar SIC code prefixes
          const blueCollarSics = [
            "15",
            "16",
            "17", // Construction
            "20",
            "21",
            "22",
            "23",
            "24",
            "25",
            "26",
            "27",
            "28",
            "29", // Manufacturing 20-29
            "30",
            "31",
            "32",
            "33",
            "34",
            "35",
            "36",
            "37",
            "38",
            "39", // Manufacturing 30-39
            "42",
            "421",
            "422", // Trucking/Warehousing
            "75",
            "753",
            "754",
            "7542", // Auto services, car wash
            "721",
            "7215", // Laundromats
          ];

          // Blue collar keywords
          const blueCollarKeywords = [
            "trucking",
            "freight",
            "logistics",
            "hauling",
            "transport",
            "construction",
            "contractor",
            "builder",
            "excavat",
            "paving",
            "concrete",
            "roofing",
            "plumbing",
            "electric",
            "hvac",
            "manufacturing",
            "fabricat",
            "machine",
            "welding",
            "metal",
            "auto",
            "repair",
            "garage",
            "body shop",
            "tire",
            "mechanic",
            "car wash",
            "carwash",
            "laundromat",
            "laundry",
            "cleaners",
            "warehouse",
            "storage",
            "distribution",
            "landscap",
            "lawn",
            "tree service",
            "septic",
            "waste",
          ];

          const isBlueCollar =
            blueCollarSics.some((sic) => sicCode.startsWith(sic)) ||
            blueCollarKeywords.some(
              (kw) => companyLower.includes(kw) || industry.includes(kw),
            );

          if (isBlueCollar) {
            acc.push(index);
          }
          return acc;
        }, [] as number[]),

        // === MAIN STREET INDEX ($500K - $10M Revenue) ===
        // Target: established local businesses with real revenue
        mainStreet: normalizedRecords.reduce((acc, record, index) => {
          const revLower = (record.revenue || "").toLowerCase();

          // Parse revenue indicators for $500K-$10M range
          const isMainStreet =
            revLower.includes("$500") ||
            revLower.includes("500k") ||
            revLower.includes("$1 mil") ||
            revLower.includes("$1mil") ||
            revLower.includes("1 million") ||
            revLower.includes("$2.5 mil") ||
            revLower.includes("$5 mil") ||
            revLower.includes("$10 mil") ||
            revLower.includes("$1 to") ||
            revLower.includes("$2.5 to") ||
            revLower.includes("$5 to") ||
            revLower.includes("500,000") ||
            revLower.includes("1,000,000") ||
            revLower.includes("5,000,000") ||
            (revLower.includes("million") &&
              !revLower.includes("$50") &&
              !revLower.includes("$100"));

          if (isMainStreet) {
            acc.push(index);
          }
          return acc;
        }, [] as number[]),

        // === REVENUE TIERS ===
        byRevenueTier: normalizedRecords.reduce(
          (acc, record, index) => {
            const revLower = (record.revenue || "").toLowerCase();

            let tier = "unknown";
            if (
              revLower.includes("less than") ||
              revLower.includes("under $500") ||
              revLower.includes("$0")
            ) {
              tier = "startup"; // < $500K
            } else if (
              revLower.includes("$500") ||
              revLower.includes("500k") ||
              revLower.includes("$1 mil") ||
              revLower.includes("1 million")
            ) {
              tier = "main-street"; // $500K - $2.5M
            } else if (
              revLower.includes("$2.5") ||
              revLower.includes("$5 mil") ||
              revLower.includes("5 million")
            ) {
              tier = "growth"; // $2.5M - $10M
            } else if (
              revLower.includes("$10 mil") ||
              revLower.includes("$25 mil") ||
              revLower.includes("$50 mil")
            ) {
              tier = "established"; // $10M - $50M
            } else if (
              revLower.includes("$100 mil") ||
              revLower.includes("$500 mil") ||
              revLower.includes("billion")
            ) {
              tier = "enterprise"; // $100M+
            }

            if (!acc[tier]) acc[tier] = [];
            acc[tier].push(index);
            return acc;
          },
          {} as Record<string, number[]>,
        ),

        // === ABSENTEE OWNERS INDEX ===
        absenteeOwners: normalizedRecords.reduce((acc, record, index) => {
          const linkage = calculatePropertyLinkageScore(record);
          // Likely absentee if has fixed-location signals (they own property somewhere)
          const isAbsentee = linkage.signals.some(
            (s) => s.includes("fixed:") || s.includes("sic:owner-occupied"),
          );
          if (isAbsentee) {
            acc.push(index);
          }
          return acc;
        }, [] as number[]),

        // === DECISION MAKERS INDEX ===
        // Target: Owner, CEO, Partner, VP, Sales Manager (high-value contacts)
        decisionMakers: normalizedRecords.reduce((acc, record, index) => {
          const seniority = detectSeniority(record.title);
          if (seniority.isDecisionMaker) {
            acc.push(index);
          }
          return acc;
        }, [] as number[]),

        // === SENIORITY BREAKDOWN ===
        bySeniority: normalizedRecords.reduce(
          (acc, record, index) => {
            const seniority = detectSeniority(record.title);
            const level = seniority.level;
            if (!acc[level]) acc[level] = [];
            acc[level].push(index);
            return acc;
          },
          {} as Record<string, number[]>,
        ),
      },
      metadata: {
        id: bucketId,
        name: name,
        description: description,
        savedCount: records.length,
        searchParams: {},
        tags: tags ? tags.split(",").map((t) => t.trim()) : [],
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
        // Property ownership likelihood breakdown
        propertyOwnership: {
          highLikelihood,
          mediumLikelihood,
          lowLikelihood,
          likelyOwners, // Score >= 50
          campaignEligible, // Score >= 30
          percentage: Math.round((likelyOwners / records.length) * 100),
        },
        // Signal distribution (what triggered the scores)
        signalBreakdown: signalCounts,
        // Blue Collar stats
        blueCollar: {
          count: 0, // Will be calculated from index
          percentage: 0,
          industries: [
            "construction",
            "trucking",
            "manufacturing",
            "auto-services",
            "landscaping",
          ],
        },
        // Main Street stats ($500K-$10M revenue)
        mainStreet: {
          count: 0, // Will be calculated from index
          percentage: 0,
          revenueTier: "$500K-$10M",
        },
        // Decision-maker stats (Owner, CEO, Partner, VP, Sales Manager)
        decisionMakers: {
          total: decisionMakerCount,
          percentage: Math.round((decisionMakerCount / records.length) * 100),
          breakdown: seniorityBreakdown,
          targets: [
            "owner",
            "founder",
            "c_suite",
            "president",
            "partner",
            "vp",
            "sales_manager",
          ],
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
        }),
      );

      // Update the index so it appears in the UI immediately
      await updateBucketIndex(client, bucket);
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
      { status: 500 },
    );
  }
}
