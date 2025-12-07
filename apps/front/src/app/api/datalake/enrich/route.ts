/**
 * Datalake Enrichment API
 * Cross-reference RealEstateAPI property data with USBizData datalakes
 *
 * Flow:
 * 1. Take property addresses/owner names from RealEstateAPI searches
 * 2. Match against USBizData datalakes (residential, phones, emails, business)
 * 3. Return enriched leads with contact info
 */

import { NextRequest, NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { DATA_LAKE_SCHEMAS } from "../schemas/route";

// DO Spaces configuration
const SPACES_ENDPOINT = process.env.SPACES_ENDPOINT || "https://nyc3.digitaloceanspaces.com";
const SPACES_REGION = process.env.SPACES_REGION || "nyc3";
const SPACES_KEY = process.env.SPACES_KEY || process.env.DO_SPACES_KEY || "";
const SPACES_SECRET = process.env.SPACES_SECRET || process.env.DO_SPACES_SECRET || "";
const SPACES_BUCKET = process.env.SPACES_BUCKET || process.env.DO_SPACES_BUCKET || "nextier";

const s3Client = new S3Client({
  endpoint: SPACES_ENDPOINT,
  region: SPACES_REGION,
  credentials: {
    accessKeyId: SPACES_KEY,
    secretAccessKey: SPACES_SECRET,
  },
  forcePathStyle: false,
});

// Storage paths for each USBizData schema
const DATALAKE_PATHS: Record<string, string> = {
  residential: "datalake/residential/ny/",
  phones: "datalake/phones/ny/",
  emails: "datalake/emails/ny/",
  business: "datalake/business/ny/",
};

interface PropertyRecord {
  id?: string;
  address?: string | { address?: string; street?: string; city?: string; state?: string; zip?: string };
  city?: string;
  state?: string;
  zip?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  owner1FirstName?: string;
  owner1LastName?: string;
  [key: string]: unknown;
}

interface EnrichmentResult {
  original: PropertyRecord;
  matches: {
    residential?: Record<string, unknown>;
    phone?: Record<string, unknown>;
    email?: Record<string, unknown>;
  };
  enrichedData: {
    phone?: string;
    cellPhone?: string;
    email?: string;
    estimatedIncome?: number;
    estimatedWealth?: number;
    age?: number;
    lengthOfResidence?: number;
  };
  matchScore: number;
  matchedOn: string[];
}

// POST - Enrich properties from RealEstateAPI with USBizData
export async function POST(request: NextRequest) {
  try {
    if (!SPACES_KEY || !SPACES_SECRET) {
      return NextResponse.json({
        error: "DigitalOcean Spaces credentials not configured",
      }, { status: 503 });
    }

    const body = await request.json();
    const {
      properties, // Array of property records from RealEstateAPI
      enrichFrom = ["residential", "phones", "emails"], // Which datalakes to check
      matchBy = ["address", "name"], // Match by address and/or owner name
      limit = 100, // Max properties to enrich
    } = body;

    if (!properties || !Array.isArray(properties)) {
      return NextResponse.json({
        error: "properties array is required",
        example: {
          properties: [
            { address: "123 Main St", city: "Brooklyn", state: "NY", ownerFirstName: "John", ownerLastName: "Smith" }
          ],
          enrichFrom: ["residential", "phones", "emails"],
          matchBy: ["address", "name"],
        },
      }, { status: 400 });
    }

    // Load datalake indexes
    const datalakes: Record<string, Record<string, unknown>[]> = {};
    for (const source of enrichFrom) {
      if (DATALAKE_PATHS[source]) {
        datalakes[source] = await loadDatalakeRecords(DATALAKE_PATHS[source]);
      }
    }

    // Check if any data loaded
    const totalRecords = Object.values(datalakes).reduce((sum, arr) => sum + arr.length, 0);
    if (totalRecords === 0) {
      return NextResponse.json({
        success: false,
        message: "No datalake records found. Upload USBizData CSVs to the datalake first.",
        uploadEndpoint: "/api/datalake/upload",
        enrichFrom,
        properties: properties.slice(0, limit),
      });
    }

    // Enrich each property
    const results: EnrichmentResult[] = [];
    const propertiesToProcess = properties.slice(0, limit);

    for (const prop of propertiesToProcess) {
      const result = enrichProperty(prop, datalakes, matchBy);
      results.push(result);
    }

    // Summary stats
    const enriched = results.filter(r => r.matchScore > 0);
    const withPhone = results.filter(r => r.enrichedData.phone || r.enrichedData.cellPhone);
    const withEmail = results.filter(r => r.enrichedData.email);

    return NextResponse.json({
      success: true,
      summary: {
        totalProperties: propertiesToProcess.length,
        enriched: enriched.length,
        withPhone: withPhone.length,
        withEmail: withEmail.length,
        enrichmentRate: Math.round((enriched.length / propertiesToProcess.length) * 100) + "%",
      },
      datalakesUsed: Object.entries(datalakes).map(([k, v]) => ({ source: k, records: v.length })),
      results,
    });
  } catch (error) {
    console.error("[Datalake Enrich] Error:", error);
    return NextResponse.json({
      error: "Enrichment failed",
      details: String(error),
    }, { status: 500 });
  }
}

// GET - Get enrichment options
export async function GET() {
  // Check what data is available in each datalake
  const availability: Record<string, { available: boolean; recordCount: number }> = {};

  for (const [source, path] of Object.entries(DATALAKE_PATHS)) {
    const records = await loadDatalakeRecords(path, 1); // Just check if files exist
    availability[source] = {
      available: records.length > 0,
      recordCount: records.length,
    };
  }

  return NextResponse.json({
    success: true,
    message: "Enrich RealEstateAPI properties with USBizData contact info",
    endpoint: "POST /api/datalake/enrich",
    params: {
      properties: "Array of property records with address/owner info",
      enrichFrom: "Array of datalakes to search: residential, phones, emails, business (default: all)",
      matchBy: "Array of match strategies: address, name (default: both)",
      limit: "Max properties to process (default: 100)",
    },
    datalakes: {
      residential: {
        description: "15.8M NY residents - phone, email, demographics, wealth",
        schema: DATA_LAKE_SCHEMAS.ny_residential.name,
        path: DATALAKE_PATHS.residential,
        ...availability.residential,
      },
      phones: {
        description: "5.1M NY cell phones for SMS outreach",
        schema: DATA_LAKE_SCHEMAS.ny_cell_phone.name,
        path: DATALAKE_PATHS.phones,
        ...availability.phones,
      },
      emails: {
        description: "7.3M opt-in emails for email campaigns",
        schema: DATA_LAKE_SCHEMAS.ny_optin_email.name,
        path: DATALAKE_PATHS.emails,
        ...availability.emails,
      },
      business: {
        description: "5.5M NY businesses by SIC code",
        schema: DATA_LAKE_SCHEMAS.ny_business.name,
        path: DATALAKE_PATHS.business,
        ...availability.business,
      },
    },
    workflow: [
      "1. Run property search on RealEstateAPI → save results",
      "2. POST results to /api/datalake/enrich",
      "3. Get back phone/email/demographics for each property",
      "4. Push enriched leads to SMS/Email/Call campaigns",
    ],
    configured: {
      hasCredentials: !!(SPACES_KEY && SPACES_SECRET),
      bucket: SPACES_BUCKET,
    },
  });
}

// Load records from datalake path
async function loadDatalakeRecords(basePath: string, maxFiles = 10): Promise<Record<string, unknown>[]> {
  const records: Record<string, unknown>[] = [];

  try {
    // Check processed folder first, then raw
    for (const subfolder of ["processed/", "raw/"]) {
      const path = basePath + subfolder;

      const listResponse = await s3Client.send(new ListObjectsV2Command({
        Bucket: SPACES_BUCKET,
        Prefix: path,
        MaxKeys: maxFiles,
      }));

      const csvFiles = (listResponse.Contents || []).filter(f => f.Key?.endsWith(".csv"));

      for (const file of csvFiles) {
        try {
          const getResponse = await s3Client.send(new GetObjectCommand({
            Bucket: SPACES_BUCKET,
            Key: file.Key,
          }));

          const content = await getResponse.Body?.transformToString();
          if (!content) continue;

          const parsed = parseCsv(content);
          records.push(...parsed);

          if (records.length >= 10000) break; // Limit memory usage
        } catch {
          continue;
        }
      }

      if (records.length > 0) break; // Found data in this folder
    }
  } catch (err) {
    console.warn("[Datalake Enrich] Error loading records:", err);
  }

  return records;
}

// Parse CSV content
function parseCsv(content: string): Record<string, unknown>[] {
  const lines = content.split("\n");
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const records: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCsvLine(line);
    const record: Record<string, unknown> = {};

    headers.forEach((header, idx) => {
      record[header] = values[idx] || "";
    });

    records.push(record);
  }

  return records;
}

// Parse CSV line handling quotes
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

// Enrich a single property with datalake data
function enrichProperty(
  prop: PropertyRecord,
  datalakes: Record<string, Record<string, unknown>[]>,
  matchBy: string[]
): EnrichmentResult {
  const result: EnrichmentResult = {
    original: prop,
    matches: {},
    enrichedData: {},
    matchScore: 0,
    matchedOn: [],
  };

  // Normalize property data
  const propAddress = normalizeAddress(prop);
  const propFirstName = (prop.ownerFirstName || prop.owner1FirstName || "").toLowerCase().trim();
  const propLastName = (prop.ownerLastName || prop.owner1LastName || "").toLowerCase().trim();
  const propZip = propAddress.zip;

  // Search residential datalake
  if (datalakes.residential) {
    for (const record of datalakes.residential) {
      const score = calculateMatchScore(record, propAddress, propFirstName, propLastName, matchBy);
      if (score > result.matchScore) {
        result.matches.residential = record;
        result.matchScore = score;

        // Extract enrichment data
        result.enrichedData.phone = String(record["Phone Number"] || record["phone"] || "");
        result.enrichedData.estimatedIncome = parseFloat(String(record["Estimated Income"] || "0")) || undefined;
        result.enrichedData.estimatedWealth = parseFloat(String(record["Estimated Wealth"] || "0")) || undefined;
        result.enrichedData.age = parseInt(String(record["Exact Age"] || record["Estimated Age"] || "0")) || undefined;
        result.enrichedData.lengthOfResidence = parseInt(String(record["Length of Residence"] || "0")) || undefined;

        if (score >= 80) result.matchedOn.push("residential-high");
        else if (score >= 50) result.matchedOn.push("residential-medium");
      }
    }
  }

  // Search phone datalake
  if (datalakes.phones) {
    for (const record of datalakes.phones) {
      const score = calculateMatchScore(record, propAddress, propFirstName, propLastName, matchBy);
      if (score >= 50) {
        result.matches.phone = record;
        result.enrichedData.cellPhone = String(record["Cell Number"] || record["cellPhone"] || "");
        result.matchedOn.push("phone");
        break;
      }
    }
  }

  // Search email datalake
  if (datalakes.emails) {
    for (const record of datalakes.emails) {
      const score = calculateMatchScore(record, propAddress, propFirstName, propLastName, matchBy);
      if (score >= 50) {
        result.matches.email = record;
        result.enrichedData.email = String(record["Email Address"] || record["email"] || "");
        result.matchedOn.push("email");
        break;
      }
    }
  }

  return result;
}

// Normalize address from property record
function normalizeAddress(prop: PropertyRecord): { street: string; city: string; state: string; zip: string } {
  if (typeof prop.address === "object" && prop.address) {
    return {
      street: (prop.address.address || prop.address.street || "").toLowerCase().trim(),
      city: (prop.address.city || "").toLowerCase().trim(),
      state: (prop.address.state || "").toUpperCase().trim(),
      zip: (prop.address.zip || "").trim().substring(0, 5),
    };
  }

  return {
    street: String(prop.address || "").toLowerCase().trim(),
    city: (prop.city || "").toLowerCase().trim(),
    state: (prop.state || "").toUpperCase().trim(),
    zip: (prop.zip || "").trim().substring(0, 5),
  };
}

// Calculate match score between property and datalake record
function calculateMatchScore(
  record: Record<string, unknown>,
  propAddress: { street: string; city: string; state: string; zip: string },
  propFirstName: string,
  propLastName: string,
  matchBy: string[]
): number {
  let score = 0;

  // Get record values
  const recAddress = String(record["Address"] || record["address"] || record["Street Address"] || "").toLowerCase().trim();
  const recCity = String(record["City"] || record["city"] || "").toLowerCase().trim();
  const recZip = String(record["Zip Code"] || record["zipCode"] || record["Zip"] || "").trim().substring(0, 5);
  const recFirstName = String(record["First Name"] || record["firstName"] || "").toLowerCase().trim();
  const recLastName = String(record["Last Name"] || record["lastName"] || "").toLowerCase().trim();

  // Address matching
  if (matchBy.includes("address")) {
    // ZIP match is strong signal
    if (propAddress.zip && recZip && propAddress.zip === recZip) {
      score += 30;
    }

    // City match
    if (propAddress.city && recCity && propAddress.city === recCity) {
      score += 15;
    }

    // Street address matching (partial)
    if (propAddress.street && recAddress) {
      // Extract house number
      const propHouseNum = propAddress.street.match(/^\d+/)?.[0];
      const recHouseNum = recAddress.match(/^\d+/)?.[0];

      if (propHouseNum && recHouseNum && propHouseNum === recHouseNum) {
        score += 20;

        // Street name match
        const propStreet = propAddress.street.replace(/^\d+\s*/, "").replace(/\b(st|street|ave|avenue|rd|road|dr|drive|ln|lane|blvd|boulevard|ct|court|pl|place)\b/gi, "").trim();
        const recStreet = recAddress.replace(/^\d+\s*/, "").replace(/\b(st|street|ave|avenue|rd|road|dr|drive|ln|lane|blvd|boulevard|ct|court|pl|place)\b/gi, "").trim();

        if (propStreet && recStreet && propStreet.includes(recStreet.substring(0, 5))) {
          score += 20;
        }
      }
    }
  }

  // Name matching
  if (matchBy.includes("name")) {
    if (propFirstName && recFirstName && propFirstName === recFirstName) {
      score += 15;
    }
    if (propLastName && recLastName && propLastName === recLastName) {
      score += 15;
    }
  }

  return Math.min(score, 100);
}
