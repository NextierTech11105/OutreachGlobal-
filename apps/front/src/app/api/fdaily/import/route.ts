import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

/**
 * FDAILY (ForeclosuresDaily.com) Lis Pendens Import API
 *
 * Handles CSV import from FDAILY subscription data for:
 * - Homeowner Advisor: Residential pre-foreclosure leads
 * - Nextier: Property data enrichment pipeline
 *
 * CSV Columns from FDAILY:
 * - Property: Address, City, State, Folio
 * - Case Info: Case Number, Filed Date
 * - Parties: Plaintiff/Trustee, Defendant, Attorney
 * - Loan Details: Balance, Origination Date
 * - Property Details: Value, Beds, Baths, SqFt, Year Built
 * - Mailing Address: Owner mailing info
 */

const SPACES_ENDPOINT = "https://nyc3.digitaloceanspaces.com";
const SPACES_BUCKET = "nextier";
const SPACES_KEY = process.env.DO_SPACES_KEY || "";
const SPACES_SECRET = process.env.DO_SPACES_SECRET || "";

// RealEstateAPI for enrichment
const REALESTATE_API_KEY =
  process.env.REAL_ESTATE_API_KEY || process.env.REALESTATE_API_KEY || "";
const REALESTATE_API_URL = "https://api.realestateapi.com/v2";

interface FDAILYRecord {
  // Property
  property_address?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  folio?: string;
  parcel_id?: string;

  // Case Info
  case_number?: string;
  case_id?: string;
  filed_date?: string;
  filing_date?: string;
  case_type?: string;

  // Parties
  plaintiff?: string;
  trustee?: string;
  defendant?: string;
  owner_name?: string;
  attorney?: string;
  attorney_firm?: string;

  // Loan Details
  loan_balance?: string | number;
  original_loan_amount?: string | number;
  loan_date?: string;
  origination_date?: string;
  lender?: string;

  // Property Details
  property_value?: string | number;
  estimated_value?: string | number;
  bedrooms?: string | number;
  bathrooms?: string | number;
  sqft?: string | number;
  square_feet?: string | number;
  year_built?: string | number;
  property_type?: string;

  // Mailing Address
  mailing_address?: string;
  mailing_city?: string;
  mailing_state?: string;
  mailing_zip?: string;
}

interface ProcessedLead {
  id: string;
  source: "fdaily";
  sourceId: string;
  importedAt: string;

  // Property
  propertyAddress: string;
  city: string;
  state: string;
  zip: string;
  folio: string;

  // Case
  caseNumber: string;
  filedDate: string;
  caseType: string;

  // Parties
  plaintiff: string;
  defendant: string;
  attorney: string;

  // Financials
  loanBalance: number | null;
  estimatedValue: number | null;

  // Property Details
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  yearBuilt: number | null;
  propertyType: string;

  // Owner/Mailing
  ownerName: string;
  mailingAddress: string;

  // Enrichment status
  enriched: boolean;
  enrichedAt: string | null;
  realEstateApiId: string | null;

  // Campaign status
  status:
    | "new"
    | "enriched"
    | "skip_traced"
    | "contacted"
    | "responded"
    | "converted";
  priority: "hot" | "warm" | "cold";
  tags: string[];
}

function getS3Client(): S3Client | null {
  if (!SPACES_KEY || !SPACES_SECRET) {
    console.warn("[FDAILY Import] DO Spaces not configured");
    return null;
  }
  return new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: "nyc3",
    credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
  });
}

function parseNumber(value: string | number | undefined): number | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return value;
  // Remove currency symbols, commas
  const cleaned = value.toString().replace(/[$,]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function normalizeRecord(raw: FDAILYRecord, index: number): ProcessedLead {
  const now = new Date().toISOString();

  // Build full address
  const address = raw.property_address || raw.address || "";
  const city = raw.city || "";
  const state = raw.state || "FL"; // Default to FL for FDAILY
  const zip = raw.zip || "";

  const fullAddress = [address, city, state, zip].filter(Boolean).join(", ");

  // Extract owner name from defendant or explicit field
  const ownerName = raw.owner_name || raw.defendant || "";

  // Build mailing address
  const mailingParts = [
    raw.mailing_address,
    raw.mailing_city,
    raw.mailing_state,
    raw.mailing_zip,
  ].filter(Boolean);
  const mailingAddress =
    mailingParts.length > 0 ? mailingParts.join(", ") : fullAddress;

  // Determine priority based on property value and recency
  const value = parseNumber(raw.property_value || raw.estimated_value);
  const filedDate = raw.filed_date || raw.filing_date || "";
  const daysSinceFiled = filedDate
    ? Math.floor(
        (Date.now() - new Date(filedDate).getTime()) / (1000 * 60 * 60 * 24),
      )
    : 999;

  let priority: "hot" | "warm" | "cold" = "warm";
  if (daysSinceFiled <= 7) priority = "hot";
  else if (daysSinceFiled > 30) priority = "cold";

  // Auto-tags based on data
  const tags: string[] = ["lis_pendens", "fdaily"];
  if (value && value > 500000) tags.push("high_value");
  if (daysSinceFiled <= 7) tags.push("fresh_filing");
  if (raw.case_type?.toLowerCase().includes("foreclosure"))
    tags.push("foreclosure");

  return {
    id: `fdaily-${raw.case_number || raw.case_id || index}-${Date.now()}`,
    source: "fdaily",
    sourceId: raw.case_number || raw.case_id || `row-${index}`,
    importedAt: now,

    propertyAddress: fullAddress,
    city,
    state,
    zip,
    folio: raw.folio || raw.parcel_id || "",

    caseNumber: raw.case_number || raw.case_id || "",
    filedDate: filedDate,
    caseType: raw.case_type || "Lis Pendens",

    plaintiff: raw.plaintiff || raw.trustee || "",
    defendant: raw.defendant || "",
    attorney: raw.attorney || raw.attorney_firm || "",

    loanBalance: parseNumber(raw.loan_balance || raw.original_loan_amount),
    estimatedValue: value,

    bedrooms: parseNumber(raw.bedrooms),
    bathrooms: parseNumber(raw.bathrooms),
    sqft: parseNumber(raw.sqft || raw.square_feet),
    yearBuilt: parseNumber(raw.year_built),
    propertyType: raw.property_type || "Residential",

    ownerName,
    mailingAddress,

    enriched: false,
    enrichedAt: null,
    realEstateApiId: null,

    status: "new",
    priority,
    tags,
  };
}

async function enrichWithRealEstateAPI(
  lead: ProcessedLead,
): Promise<ProcessedLead> {
  if (!REALESTATE_API_KEY || !lead.propertyAddress) {
    return lead;
  }

  try {
    const response = await fetch(`${REALESTATE_API_URL}/PropertyDetail`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify({ address: lead.propertyAddress }),
    });

    if (response.ok) {
      const data = await response.json();
      const property = data.data || data;

      if (property && property.id) {
        return {
          ...lead,
          realEstateApiId: property.id,
          enriched: true,
          enrichedAt: new Date().toISOString(),
          estimatedValue: property.estimatedValue || lead.estimatedValue,
          bedrooms: property.bedrooms || lead.bedrooms,
          bathrooms: property.bathrooms || lead.bathrooms,
          sqft: property.squareFeet || lead.sqft,
          yearBuilt: property.yearBuilt || lead.yearBuilt,
          propertyType: property.propertyType || lead.propertyType,
          // Add enrichment tags
          tags: [
            ...lead.tags,
            "enriched",
            property.preForeclosure ? "pre_foreclosure_confirmed" : null,
            property.highEquity ? "high_equity" : null,
            property.absenteeOwner ? "absentee_owner" : null,
            property.vacant ? "vacant" : null,
          ].filter(Boolean) as string[],
        };
      }
    }
  } catch (error) {
    console.error(
      `[FDAILY] Enrichment failed for ${lead.propertyAddress}:`,
      error,
    );
  }

  return lead;
}

// POST /api/fdaily/import - Import FDAILY CSV data
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let records: FDAILYRecord[] = [];
    let batchName = `fdaily-import-${new Date().toISOString().split("T")[0]}`;
    let enrichAfterImport = false;

    if (contentType.includes("multipart/form-data")) {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get("file") as File;
      batchName = (formData.get("batchName") as string) || batchName;
      enrichAfterImport = formData.get("enrich") === "true";

      if (!file) {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 },
        );
      }

      const text = await file.text();
      records = parseCSV(text);
    } else {
      // Handle JSON body
      const body = await request.json();
      records = body.records || [];
      batchName = body.batchName || batchName;
      enrichAfterImport = body.enrich || false;
    }

    if (!records.length) {
      return NextResponse.json(
        { error: "No records to import" },
        { status: 400 },
      );
    }

    console.log(`[FDAILY Import] Processing ${records.length} records...`);

    // Normalize records
    let processedLeads = records.map((r, i) => normalizeRecord(r, i));

    // Optional: Enrich with RealEstateAPI
    if (enrichAfterImport && REALESTATE_API_KEY) {
      console.log(
        `[FDAILY Import] Enriching ${processedLeads.length} leads...`,
      );
      const enrichedLeads: ProcessedLead[] = [];

      // Process in batches of 10 to avoid rate limits
      for (let i = 0; i < processedLeads.length; i += 10) {
        const batch = processedLeads.slice(i, i + 10);
        const enrichedBatch = await Promise.all(
          batch.map(enrichWithRealEstateAPI),
        );
        enrichedLeads.push(...enrichedBatch);

        // Brief pause between batches
        if (i + 10 < processedLeads.length) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      processedLeads = enrichedLeads;
    }

    // Save to DO Spaces
    const client = getS3Client();
    let savedTo = null;

    if (client) {
      const key = `fdaily/${batchName}.json`;
      const importRecord = {
        batchName,
        importedAt: new Date().toISOString(),
        source: "fdaily",
        totalRecords: processedLeads.length,
        enriched: enrichAfterImport,
        leads: processedLeads,
      };

      await client.send(
        new PutObjectCommand({
          Bucket: SPACES_BUCKET,
          Key: key,
          Body: JSON.stringify(importRecord, null, 2),
          ContentType: "application/json",
        }),
      );

      savedTo = key;
      console.log(`[FDAILY Import] Saved to DO Spaces: ${key}`);
    }

    // Summary stats
    const stats = {
      total: processedLeads.length,
      hot: processedLeads.filter((l) => l.priority === "hot").length,
      warm: processedLeads.filter((l) => l.priority === "warm").length,
      cold: processedLeads.filter((l) => l.priority === "cold").length,
      enriched: processedLeads.filter((l) => l.enriched).length,
      highValue: processedLeads.filter((l) => (l.estimatedValue || 0) > 500000)
        .length,
    };

    return NextResponse.json({
      success: true,
      batchName,
      stats,
      savedTo,
      message: `Imported ${stats.total} FDAILY leads (${stats.hot} hot, ${stats.warm} warm, ${stats.cold} cold)`,
      // Return first 5 leads as preview
      preview: processedLeads.slice(0, 5),
    });
  } catch (error: any) {
    console.error("[FDAILY Import] Error:", error);
    return NextResponse.json(
      { error: error.message || "Import failed" },
      { status: 500 },
    );
  }
}

// GET /api/fdaily/import - List imported batches
export async function GET(request: NextRequest) {
  try {
    const client = getS3Client();
    if (!client) {
      return NextResponse.json(
        { error: "Storage not configured" },
        { status: 500 },
      );
    }

    const { searchParams } = new URL(request.url);
    const batchName = searchParams.get("batch");

    if (batchName) {
      // Get specific batch
      const response = await client.send(
        new GetObjectCommand({
          Bucket: SPACES_BUCKET,
          Key: `fdaily/${batchName}.json`,
        }),
      );

      const content = await response.Body?.transformToString();
      if (!content) {
        return NextResponse.json({ error: "Batch not found" }, { status: 404 });
      }

      return NextResponse.json(JSON.parse(content));
    }

    // List all batches (would need ListObjects for full implementation)
    return NextResponse.json({
      message: "Use ?batch=<name> to retrieve a specific import batch",
      endpoint: "/api/fdaily/import?batch=fdaily-import-2024-12-11",
    });
  } catch (error: any) {
    console.error("[FDAILY Import] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve data" },
      { status: 500 },
    );
  }
}

// Simple CSV parser
function parseCSV(text: string): FDAILYRecord[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  // Parse header - normalize column names
  const headers = lines[0].split(",").map((h) =>
    h
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, ""),
  );

  const records: FDAILYRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) continue;

    const record: any = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx]?.trim() || "";
    });

    records.push(record as FDAILYRecord);
  }

  return records;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}
