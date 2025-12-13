/**
 * Datalake Query API
 * Query USBizData records from DigitalOcean Spaces datalake
 * Supports address matching, phone lookup, and demographic filters
 */

import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { DATA_LAKE_SCHEMAS, SCHEMA_PATHS } from "@/lib/datalake/schemas";

// DO Spaces configuration
const SPACES_ENDPOINT =
  process.env.SPACES_ENDPOINT || "https://nyc3.digitaloceanspaces.com";
const SPACES_REGION = process.env.SPACES_REGION || "nyc3";
const SPACES_KEY = process.env.SPACES_KEY || process.env.DO_SPACES_KEY || "";
const SPACES_SECRET =
  process.env.SPACES_SECRET || process.env.DO_SPACES_SECRET || "";
const SPACES_BUCKET =
  process.env.SPACES_BUCKET || process.env.DO_SPACES_BUCKET || "nextier";

const s3Client = new S3Client({
  endpoint: SPACES_ENDPOINT,
  region: SPACES_REGION,
  credentials: {
    accessKeyId: SPACES_KEY,
    secretAccessKey: SPACES_SECRET,
  },
  forcePathStyle: false,
});

interface QueryParams {
  schemaId?: string;
  // Address matching
  address?: string;
  city?: string;
  zipCode?: string;
  county?: string;
  // Person matching
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  // Business matching
  companyName?: string;
  sicCode?: string;
  // Filters
  minIncome?: number;
  maxIncome?: number;
  minWealth?: number;
  ageMin?: number;
  ageMax?: number;
  ownerOccupied?: boolean;
  // Pagination
  limit?: number;
  offset?: number;
}

// POST - Query datalake
export async function POST(request: NextRequest) {
  try {
    if (!SPACES_KEY || !SPACES_SECRET) {
      return NextResponse.json(
        {
          error: "DigitalOcean Spaces credentials not configured",
        },
        { status: 503 },
      );
    }

    const params: QueryParams = await request.json();
    const { schemaId, limit = 100, offset = 0 } = params;

    if (!schemaId) {
      return NextResponse.json(
        {
          error: "schemaId is required",
          availableSchemas: Object.keys(DATA_LAKE_SCHEMAS),
        },
        { status: 400 },
      );
    }

    const schema =
      DATA_LAKE_SCHEMAS[schemaId as keyof typeof DATA_LAKE_SCHEMAS];
    if (!schema) {
      return NextResponse.json(
        {
          error: `Invalid schemaId: ${schemaId}`,
          availableSchemas: Object.keys(DATA_LAKE_SCHEMAS),
        },
        { status: 400 },
      );
    }

    const basePath = SCHEMA_PATHS[schemaId];
    if (!basePath) {
      return NextResponse.json(
        {
          error: `No storage path for schema: ${schemaId}`,
        },
        { status: 400 },
      );
    }

    // List files in the processed folder first, fall back to raw
    const processedPath = `${basePath}processed/`;
    const rawPath = `${basePath}raw/`;

    let files = await listCsvFiles(processedPath);
    if (files.length === 0) {
      files = await listCsvFiles(rawPath);
    }

    if (files.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No data files found in datalake. Upload CSV files first.",
        schemaId,
        storagePath: basePath,
        results: [],
        total: 0,
      });
    }

    // Build SQL-like filter for S3 Select (if supported by Spaces)
    // For now, we'll do in-memory filtering
    const results: Record<string, unknown>[] = [];
    let totalScanned = 0;

    for (const file of files) {
      if (results.length >= limit) break;

      try {
        const data = await fetchAndParseCsv(
          file.Key!,
          params,
          limit - results.length,
        );
        results.push(...data.records);
        totalScanned += data.scanned;
      } catch (err) {
        console.warn(`[Datalake Query] Error reading ${file.Key}:`, err);
        continue;
      }
    }

    return NextResponse.json({
      success: true,
      schemaId,
      schemaName: schema.name,
      query: params,
      results,
      count: results.length,
      totalScanned,
      filesSearched: files.length,
      message:
        results.length === 0
          ? "No matching records found"
          : `Found ${results.length} matching records`,
    });
  } catch (error) {
    console.error("[Datalake Query] Error:", error);
    return NextResponse.json(
      {
        error: "Query failed",
        details: String(error),
      },
      { status: 500 },
    );
  }
}

// GET - Query by folder prefix (simple mode) or get query options
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const prefix = searchParams.get("prefix");
  const limit = parseInt(searchParams.get("limit") || "100");

  // If prefix is provided, fetch records from that folder
  if (prefix) {
    if (!SPACES_KEY || !SPACES_SECRET) {
      return NextResponse.json(
        { error: "DigitalOcean Spaces credentials not configured", success: false },
        { status: 503 },
      );
    }

    try {
      // List CSV files in the folder
      const files = await listCsvFiles(prefix);

      if (files.length === 0) {
        return NextResponse.json({
          success: true,
          records: [],
          message: "No CSV files found in this folder",
          prefix,
        });
      }

      // Fetch and parse records from all CSV files
      const allRecords: Record<string, unknown>[] = [];

      for (const file of files) {
        if (allRecords.length >= limit) break;

        try {
          const data = await fetchAndParseCsv(
            file.Key!,
            {}, // No filters for simple mode
            limit - allRecords.length,
          );
          allRecords.push(...data.records);
        } catch (err) {
          console.warn(`[Datalake Query] Error reading ${file.Key}:`, err);
        }
      }

      return NextResponse.json({
        success: true,
        records: allRecords,
        count: allRecords.length,
        filesSearched: files.length,
        prefix,
      });
    } catch (error) {
      console.error("[Datalake Query] GET error:", error);
      return NextResponse.json(
        { error: "Failed to fetch records", success: false },
        { status: 500 },
      );
    }
  }

  // No prefix - return schema documentation
  const schemas = Object.entries(DATA_LAKE_SCHEMAS).map(([id, schema]) => ({
    id,
    name: schema.name,
    fields: schema.fields.map((f) => ({
      name: f.name,
      normalized: f.normalized,
      type: f.type,
      indexed: f.indexed || false,
    })),
    useCases: schema.useCases,
  }));

  return NextResponse.json({
    success: true,
    message: "Query datalake records",
    endpoint: "POST /api/datalake/query",
    simpleMode: "GET /api/datalake/query?prefix=datalake/folder/",
    queryParams: {
      required: {
        schemaId: "One of: " + Object.keys(DATA_LAKE_SCHEMAS).join(", "),
      },
      filters: {
        address: "Partial address match",
        city: "City name",
        zipCode: "ZIP code (5 digit)",
        county: "County name",
        firstName: "First name",
        lastName: "Last name",
        phone: "Phone number",
        email: "Email address",
        companyName: "Company name (business schema)",
        sicCode: "SIC code (business schema)",
        minIncome: "Minimum estimated income",
        maxIncome: "Maximum estimated income",
        minWealth: "Minimum estimated wealth",
        ageMin: "Minimum age",
        ageMax: "Maximum age",
      },
      pagination: {
        limit: "Max results (default: 100)",
        offset: "Skip N results (default: 0)",
      },
    },
    schemas,
    configured: {
      hasCredentials: !!(SPACES_KEY && SPACES_SECRET),
      bucket: SPACES_BUCKET,
    },
  });
}

// Helper: List CSV files in a path
async function listCsvFiles(prefix: string) {
  try {
    const response = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: SPACES_BUCKET,
        Prefix: prefix,
      }),
    );

    return (response.Contents || []).filter(
      (obj) => obj.Key?.endsWith(".csv") && !obj.Key?.endsWith(".meta.json"),
    );
  } catch {
    return [];
  }
}

// Helper: Fetch and parse CSV with filtering
async function fetchAndParseCsv(
  key: string,
  params: QueryParams,
  maxResults: number,
): Promise<{ records: Record<string, unknown>[]; scanned: number }> {
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: SPACES_BUCKET,
      Key: key,
    }),
  );

  const content = await response.Body?.transformToString();
  if (!content) return { records: [], scanned: 0 };

  const lines = content.split("\n");
  if (lines.length < 2) return { records: [], scanned: 0 };

  // Parse header
  const headers = parseCsvLine(lines[0]);
  const records: Record<string, unknown>[] = [];
  let scanned = 0;

  // Parse and filter rows
  for (let i = 1; i < lines.length && records.length < maxResults; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCsvLine(line);
    const record: Record<string, unknown> = {};

    headers.forEach((header, idx) => {
      record[header] = values[idx] || "";
    });

    scanned++;

    // Apply filters
    if (matchesFilters(record, params)) {
      records.push(record);
    }
  }

  return { records, scanned };
}

// Helper: Parse CSV line handling quotes
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

// Helper: Check if record matches query filters
function matchesFilters(
  record: Record<string, unknown>,
  params: QueryParams,
): boolean {
  // Address matching
  if (params.address) {
    const addr = String(
      record["Address"] || record["address"] || record["Street Address"] || "",
    ).toLowerCase();
    if (!addr.includes(params.address.toLowerCase())) return false;
  }

  if (params.city) {
    const city = String(record["City"] || record["city"] || "").toLowerCase();
    if (!city.includes(params.city.toLowerCase())) return false;
  }

  if (params.zipCode) {
    const zip = String(
      record["Zip Code"] || record["zipCode"] || record["Zip"] || "",
    );
    if (!zip.startsWith(params.zipCode)) return false;
  }

  if (params.county) {
    const county = String(
      record["County Name"] || record["county"] || record["County"] || "",
    ).toLowerCase();
    if (!county.includes(params.county.toLowerCase())) return false;
  }

  // Person matching
  if (params.firstName) {
    const fname = String(
      record["First Name"] || record["firstName"] || "",
    ).toLowerCase();
    if (!fname.includes(params.firstName.toLowerCase())) return false;
  }

  if (params.lastName) {
    const lname = String(
      record["Last Name"] || record["lastName"] || "",
    ).toLowerCase();
    if (!lname.includes(params.lastName.toLowerCase())) return false;
  }

  if (params.phone) {
    const phone = String(
      record["Phone Number"] || record["phone"] || record["Cell Number"] || "",
    ).replace(/\D/g, "");
    const searchPhone = params.phone.replace(/\D/g, "");
    if (!phone.includes(searchPhone)) return false;
  }

  if (params.email) {
    const email = String(
      record["Email Address"] || record["email"] || "",
    ).toLowerCase();
    if (!email.includes(params.email.toLowerCase())) return false;
  }

  // Business matching
  if (params.companyName) {
    const company = String(
      record["Company Name"] || record["companyName"] || "",
    ).toLowerCase();
    if (!company.includes(params.companyName.toLowerCase())) return false;
  }

  if (params.sicCode) {
    const sic = String(record["SIC Code"] || record["sicCode"] || "");
    if (!sic.startsWith(params.sicCode)) return false;
  }

  // Numeric filters
  if (params.minIncome) {
    const income = parseFloat(
      String(record["Estimated Income"] || record["estimatedIncome"] || "0"),
    );
    if (income < params.minIncome) return false;
  }

  if (params.maxIncome) {
    const income = parseFloat(
      String(
        record["Estimated Income"] || record["estimatedIncome"] || "999999999",
      ),
    );
    if (income > params.maxIncome) return false;
  }

  if (params.minWealth) {
    const wealth = parseFloat(
      String(record["Estimated Wealth"] || record["estimatedWealth"] || "0"),
    );
    if (wealth < params.minWealth) return false;
  }

  if (params.ageMin) {
    const age = parseInt(
      String(
        record["Exact Age"] || record["age"] || record["Estimated Age"] || "0",
      ),
    );
    if (age < params.ageMin) return false;
  }

  if (params.ageMax) {
    const age = parseInt(
      String(
        record["Exact Age"] ||
          record["age"] ||
          record["Estimated Age"] ||
          "999",
      ),
    );
    if (age > params.ageMax) return false;
  }

  return true;
}
