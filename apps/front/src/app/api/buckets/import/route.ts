import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { parse } from "csv-parse/sync";
import { randomUUID } from "crypto";
import { apiAuth } from "@/lib/api-auth";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BUCKET IMPORT ENDPOINT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Canonical endpoint for importing CSV data into analyzed buckets.
 * Replaces /api/buckets/upload-csv (which is now deprecated but still works).
 *
 * Supports two input modes:
 * 1. Direct CSV upload (multipart/form-data with file)
 * 2. storagePath reference (JSON with path to file in DO Spaces)
 *
 * Flow: CSV → Normalize → Analyze → Store as bucket JSON
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// DO Spaces configuration
const SPACES_ENDPOINT = "https://nyc3.digitaloceanspaces.com";
const SPACES_BUCKET = process.env.SPACES_BUCKET || process.env.DO_SPACES_BUCKET || "nextier";
const SPACES_KEY = process.env.SPACES_KEY || process.env.DO_SPACES_KEY || "";
const SPACES_SECRET = process.env.SPACES_SECRET || process.env.DO_SPACES_SECRET || "";

function getS3Client(): S3Client | null {
  if (!SPACES_KEY || !SPACES_SECRET) return null;
  return new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: "nyc3",
    credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
  });
}

// Standard field mappings
const FIELD_MAPPINGS: Record<string, string[]> = {
  companyName: ["Company", "Company Name", "company", "company_name", "Business Name", "COMPANY NAME"],
  contactName: ["Contact", "Contact Name", "contact", "contact_name", "Owner Name", "Full Name", "CONTACT NAME"],
  firstName: ["First Name", "first_name", "FirstName", "FIRST NAME"],
  lastName: ["Last Name", "last_name", "LastName", "LAST NAME"],
  email: ["Email", "email", "Email Address", "email_address", "EMAIL"],
  phone: ["Phone", "phone", "Phone Number", "phone_number", "PHONE", "Telephone"],
  cellPhone: ["Cell Phone", "cell_phone", "Cell", "Mobile", "mobile", "CELL PHONE"],
  address: ["Street Address", "street_address", "Address", "address", "ADDRESS"],
  city: ["City", "city", "CITY"],
  state: ["State", "state", "STATE", "ST"],
  zip: ["Zip", "zip", "Zip Code", "zip_code", "ZIP"],
  sicCode: ["SIC Code", "sic_code", "SIC"],
  sicDescription: ["SIC Description", "sic_description"],
  employees: ["Employees", "employees", "Number of Employees"],
  revenue: ["Revenue", "revenue", "Annual Revenue", "Sales", "annual_revenue"],
  title: ["Title", "title", "Job Title"],
  county: ["County", "county"],
};

function findColumn(headers: string[], fieldName: string): string | null {
  const variations = FIELD_MAPPINGS[fieldName] || [];
  for (const v of variations) {
    const found = headers.find((h) => h.toLowerCase().trim() === v.toLowerCase().trim());
    if (found) return found;
  }
  return null;
}

function normalizeRow(row: Record<string, string>, headers: string[]): Record<string, string | null> {
  const normalized: Record<string, string | null> = {};
  for (const [field] of Object.entries(FIELD_MAPPINGS)) {
    const col = findColumn(headers, field);
    normalized[field] = col ? row[col]?.trim() || null : null;
  }
  // Combine first + last if no contact name
  if (!normalized.contactName && (normalized.firstName || normalized.lastName)) {
    normalized.contactName = [normalized.firstName, normalized.lastName].filter(Boolean).join(" ");
  }
  return normalized;
}

/**
 * POST /api/buckets/import
 * Import CSV to analyzed bucket
 *
 * Accepts either:
 * - multipart/form-data with file field
 * - JSON with storagePath field (path to file in DO Spaces)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, teamId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = getS3Client();
    if (!client) {
      return NextResponse.json(
        { error: "DO Spaces not configured", required: ["DO_SPACES_KEY", "DO_SPACES_SECRET"] },
        { status: 503 }
      );
    }

    let csvContent: string;
    let bucketId: string;
    let filename: string;

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // Direct file upload
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      bucketId = (formData.get("bucketId") as string) || `bucket-${Date.now()}`;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      csvContent = await file.text();
      filename = file.name;
    } else {
      // JSON with storagePath
      const body = await request.json();
      const { storagePath, bucketId: id } = body;

      if (!storagePath) {
        return NextResponse.json(
          {
            error: "storagePath required when using JSON body",
            usage: "POST with { storagePath: 'buckets/raw/file.csv', bucketId: 'my-bucket' }",
          },
          { status: 400 }
        );
      }

      bucketId = id || `bucket-${Date.now()}`;
      filename = storagePath.split("/").pop() || "import.csv";

      // Fetch file from Spaces
      try {
        const response = await client.send(
          new GetObjectCommand({
            Bucket: SPACES_BUCKET,
            Key: storagePath,
          })
        );
        csvContent = (await response.Body?.transformToString()) || "";
      } catch {
        return NextResponse.json(
          { error: `File not found: ${storagePath}` },
          { status: 404 }
        );
      }
    }

    // Parse CSV
    let records: Record<string, string>[];
    try {
      records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });
    } catch (e) {
      return NextResponse.json(
        { error: "Failed to parse CSV", details: String(e) },
        { status: 400 }
      );
    }

    if (records.length === 0) {
      return NextResponse.json({ error: "CSV is empty" }, { status: 400 });
    }

    const headers = Object.keys(records[0]);
    const now = new Date().toISOString();

    // Process and normalize records
    const processedRecords = records.map((row, index) => {
      const normalized = normalizeRow(row, headers);
      return {
        id: randomUUID(),
        bucketId,
        rowIndex: index,
        ...normalized,
        _original: row,
        createdAt: now,
        enrichment: {
          status: "pending",
          skipTraced: false,
          scored: false,
        },
      };
    });

    // Build indexes
    const indexes = {
      byState: {} as Record<string, number>,
      byCity: {} as Record<string, number>,
      bySicCode: {} as Record<string, number>,
    };

    for (const r of processedRecords) {
      const state = (r.state as string | null)?.toUpperCase();
      if (state) indexes.byState[state] = (indexes.byState[state] || 0) + 1;

      const city = (r.city as string | null)?.toLowerCase();
      if (city && state) {
        const key = `${city}-${state}`;
        indexes.byCity[key] = (indexes.byCity[key] || 0) + 1;
      }

      const sic = r.sicCode as string | null;
      if (sic) indexes.bySicCode[sic] = (indexes.bySicCode[sic] || 0) + 1;
    }

    // Stats
    const stats = {
      total: processedRecords.length,
      withPhone: processedRecords.filter((r) => r.phone || r.cellPhone).length,
      withEmail: processedRecords.filter((r) => r.email).length,
      withAddress: processedRecords.filter((r) => r.address && r.city && r.state).length,
    };

    // Create bucket data
    const bucketData = {
      bucketId,
      filename,
      uploadedBy: userId,
      teamId,
      uploadedAt: now,
      stats,
      records: processedRecords,
      indexes,
    };

    // Save to Spaces
    const storagePath = `buckets/${bucketId}.json`;
    await client.send(
      new PutObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: storagePath,
        Body: JSON.stringify(bucketData, null, 2),
        ContentType: "application/json",
      })
    );

    console.log(`[Buckets Import] Created ${bucketId} with ${stats.total} records`);

    return NextResponse.json({
      success: true,
      bucketId,
      storagePath,
      stats,
      indexes: {
        statesFound: Object.keys(indexes.byState).length,
        citiesFound: Object.keys(indexes.byCity).length,
        sicCodesFound: Object.keys(indexes.bySicCode).length,
        topStates: Object.entries(indexes.byState)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([state, count]) => ({ state, count })),
      },
      nextSteps: [
        `POST /api/luci/import with bucketId=${bucketId} to enrich`,
        `GET /api/buckets/${bucketId} to retrieve data`,
      ],
    });
  } catch (error) {
    console.error("[Buckets Import] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/buckets/import - Documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/buckets/import",
    description: "Import CSV data into analyzed buckets",
    deprecates: "/api/buckets/upload-csv",
    inputModes: {
      "multipart/form-data": {
        description: "Direct file upload",
        fields: {
          file: "CSV file (required)",
          bucketId: "Custom bucket ID (optional)",
        },
      },
      "application/json": {
        description: "Reference to file already in DO Spaces",
        fields: {
          storagePath: "Path to CSV in Spaces (required)",
          bucketId: "Custom bucket ID (optional)",
        },
      },
    },
    flow: [
      "1. Upload file: POST /api/storage/upload → get storagePath",
      "2. Import bucket: POST /api/buckets/import with storagePath",
      "3. Enrich: POST /api/luci/import with bucketId",
    ],
  });
}
