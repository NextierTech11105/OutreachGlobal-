import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { parse } from "csv-parse/sync";
import { randomUUID } from "crypto";
import {
  BUCKET_BY_ID,
  getBucketForSIC,
  type SectorBucket,
} from "@/lib/datalake/sector-buckets";
import { apiAuth } from "@/lib/api-auth";

// DO Spaces configuration
const SPACES_ENDPOINT = "https://nyc3.digitaloceanspaces.com";
const SPACES_BUCKET =
  process.env.SPACES_BUCKET || process.env.DO_SPACES_BUCKET || "nextier";
const SPACES_KEY = process.env.DO_SPACES_KEY || "";
const SPACES_SECRET = process.env.DO_SPACES_SECRET || "";

function getS3Client(): S3Client | null {
  if (!SPACES_KEY || !SPACES_SECRET) return null;
  return new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: "nyc3",
    credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
  });
}

// Standard field mappings for USBizData CSV format
const FIELD_MAPPINGS: Record<string, string[]> = {
  companyName: ["Company Name", "Company", "COMPANY NAME", "company_name"],
  contactName: ["Contact Name", "Contact", "CONTACT NAME", "contact_name"],
  firstName: ["First Name", "FirstName", "FIRST NAME", "first_name"],
  lastName: ["Last Name", "LastName", "LAST NAME", "last_name"],
  email: ["Email Address", "Email", "EMAIL", "email", "E-mail"],
  phone: ["Phone Number", "Phone", "PHONE", "phone", "Telephone"],
  address: ["Street Address", "Address", "ADDRESS", "address", "Street"],
  city: ["City", "CITY", "city"],
  state: ["State", "STATE", "state", "ST"],
  zip: ["Zip Code", "ZIP", "Zip", "zip", "zipcode", "Postal Code"],
  county: ["County", "COUNTY", "county"],
  areaCode: ["Area Code", "AREA CODE", "area_code"],
  website: ["Website URL", "Website", "URL", "website"],
  employees: ["Number of Employees", "Employees", "employees", "EMPLOYEES"],
  revenue: ["Annual Revenue", "Revenue", "revenue", "REVENUE", "Sales"],
  sicCode: ["SIC Code", "SIC", "sic_code", "SIC CODE"],
  sicDescription: ["SIC Description", "SIC Desc", "sic_description"],
};

function findColumn(headers: string[], fieldName: string): string | null {
  const variations = FIELD_MAPPINGS[fieldName] || [];
  for (const v of variations) {
    const found = headers.find(
      (h) => h.toLowerCase().trim() === v.toLowerCase().trim()
    );
    if (found) return found;
  }
  return null;
}

function normalizeRow(
  row: Record<string, string>,
  headers: string[]
): Record<string, string | null> {
  const normalized: Record<string, string | null> = {};
  for (const [standardField] of Object.entries(FIELD_MAPPINGS)) {
    const col = findColumn(headers, standardField);
    normalized[standardField] = col ? row[col]?.trim() || null : null;
  }
  // Combine first + last if no contact name
  if (!normalized.contactName && (normalized.firstName || normalized.lastName)) {
    normalized.contactName = [normalized.firstName, normalized.lastName]
      .filter(Boolean)
      .join(" ");
  }
  return normalized;
}

// POST - Upload CSV to a specific sector bucket
export async function POST(request: NextRequest) {
  try {
    const { userId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = getS3Client();
    if (!client) {
      return NextResponse.json(
        { error: "DO Spaces not configured" },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const bucketId = formData.get("bucketId") as string;
    const sicCode = formData.get("sicCode") as string;
    const description = formData.get("description") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Get bucket by ID or SIC code
    let bucket: SectorBucket | null | undefined = null;
    if (bucketId) {
      bucket = BUCKET_BY_ID[bucketId];
      if (!bucket) {
        return NextResponse.json(
          {
            error: `Bucket ${bucketId} not found`,
            availableBuckets: Object.keys(BUCKET_BY_ID).slice(0, 20),
          },
          { status: 404 }
        );
      }
    } else if (sicCode) {
      bucket = getBucketForSIC(sicCode);
      if (!bucket) {
        return NextResponse.json(
          { error: `No bucket for SIC ${sicCode}` },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        {
          error: "bucketId or sicCode required",
          example: "POST with FormData: file, bucketId=ny-construction-plumbers",
        },
        { status: 400 }
      );
    }

    // Parse CSV
    const content = await file.text();
    let records: Record<string, string>[];
    try {
      records = parse(content, {
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
    const normalizedRecords = records.map((row) => normalizeRow(row, headers));

    // Stats
    const withPhone = normalizedRecords.filter((r) => r.phone).length;
    const withEmail = normalizedRecords.filter((r) => r.email).length;
    const withAddress = normalizedRecords.filter(
      (r) => r.address && r.city && r.state
    ).length;

    const now = new Date().toISOString();
    const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create processed records with IDs
    const processedRecords = normalizedRecords.map((record, index) => ({
      id: randomUUID(),
      uploadId,
      bucketId: bucket!.id,
      rowIndex: index,
      ...record,
      _original: records[index],
      createdAt: now,
      enrichment: {
        status: "pending",
        skipTraced: false,
        propertyMatched: false,
      },
    }));

    // Create indexes
    const indexes = {
      byState: processedRecords.reduce((acc, r, i) => {
        const state = r.state?.toUpperCase();
        if (state) {
          if (!acc[state]) acc[state] = [];
          acc[state].push(i);
        }
        return acc;
      }, {} as Record<string, number[]>),
      byCounty: processedRecords.reduce((acc, r, i) => {
        const county = r.county?.replace(/ County$/i, "").trim();
        if (county) {
          if (!acc[county]) acc[county] = [];
          acc[county].push(i);
        }
        return acc;
      }, {} as Record<string, number[]>),
      byCity: processedRecords.reduce((acc, r, i) => {
        const city = r.city?.toLowerCase();
        const state = r.state?.toUpperCase();
        if (city && state) {
          const key = `${city}-${state}`;
          if (!acc[key]) acc[key] = [];
          acc[key].push(i);
        }
        return acc;
      }, {} as Record<string, number[]>),
      bySicCode: processedRecords.reduce((acc, r, i) => {
        const sic = r.sicCode;
        if (sic) {
          if (!acc[sic]) acc[sic] = [];
          acc[sic].push(i);
        }
        return acc;
      }, {} as Record<string, number[]>),
    };

    // Save raw CSV
    await client.send(
      new PutObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: `${bucket.storagePath}raw/${uploadId}.csv`,
        Body: content,
        ContentType: "text/csv",
      })
    );

    // Save processed data
    const uploadData = {
      uploadId,
      bucketId: bucket.id,
      fileName: file.name,
      description: description || `Upload to ${bucket.name}`,
      uploadedAt: now,
      uploadedBy: userId,
      stats: {
        total: records.length,
        withPhone,
        withEmail,
        withAddress,
        needsSkipTrace: withAddress - withPhone,
      },
      records: processedRecords,
      indexes,
    };

    await client.send(
      new PutObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: `${bucket.storagePath}processed/${uploadId}.json`,
        Body: JSON.stringify(uploadData, null, 2),
        ContentType: "application/json",
      })
    );

    // Update bucket index
    let bucketIndex: any = {
      bucketId: bucket.id,
      name: bucket.name,
      sector: bucket.sector,
      subsector: bucket.subsector,
      sicCodes: bucket.sicCodes,
      state: bucket.state,
      description: bucket.description,
      storagePath: bucket.storagePath,
      createdAt: now,
      updatedAt: now,
      totalRecords: 0,
      enrichedRecords: 0,
      skipTracedRecords: 0,
      files: [],
      indexes: { byState: {}, byCounty: {}, byCity: {} },
    };

    // Try to get existing index
    try {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: SPACES_BUCKET,
          Key: `${bucket.storagePath}index.json`,
        })
      );
      const existingContent = await response.Body?.transformToString();
      if (existingContent) {
        bucketIndex = JSON.parse(existingContent);
      }
    } catch {
      // No existing index, use default
    }

    // Update index with new upload
    bucketIndex.updatedAt = now;
    bucketIndex.totalRecords += records.length;
    bucketIndex.files = bucketIndex.files || [];
    bucketIndex.files.push({
      uploadId,
      fileName: file.name,
      uploadedAt: now,
      recordCount: records.length,
      stats: uploadData.stats,
    });

    // Merge indexes
    Object.entries(indexes.byState).forEach(([state, indices]) => {
      if (!bucketIndex.indexes.byState[state]) {
        bucketIndex.indexes.byState[state] = 0;
      }
      bucketIndex.indexes.byState[state] += indices.length;
    });
    Object.entries(indexes.byCounty).forEach(([county, indices]) => {
      if (!bucketIndex.indexes.byCounty[county]) {
        bucketIndex.indexes.byCounty[county] = 0;
      }
      bucketIndex.indexes.byCounty[county] += indices.length;
    });

    await client.send(
      new PutObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: `${bucket.storagePath}index.json`,
        Body: JSON.stringify(bucketIndex, null, 2),
        ContentType: "application/json",
      })
    );

    return NextResponse.json({
      success: true,
      uploadId,
      bucket: {
        id: bucket.id,
        name: bucket.name,
        sector: bucket.sector,
        storagePath: bucket.storagePath,
      },
      stats: uploadData.stats,
      indexes: {
        statesFound: Object.keys(indexes.byState).length,
        countiesFound: Object.keys(indexes.byCounty).length,
        citiesFound: Object.keys(indexes.byCity).length,
      },
      message: `Uploaded ${records.length} records to ${bucket.name}. Ready for skip tracing.`,
      nextSteps: [
        `POST /api/enrichment/skip-trace with bucketId=${bucket.id} to enrich`,
        `GET /api/buckets/sectors?id=${bucket.id} to check status`,
      ],
    });
  } catch (error) {
    console.error("[Sector Upload] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}

// GET - Get upload status for a bucket
export async function GET(request: NextRequest) {
  try {
    const { userId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bucketId = searchParams.get("bucketId");

    if (!bucketId) {
      return NextResponse.json(
        {
          error: "bucketId required",
          usage: "GET ?bucketId=ny-construction-plumbers",
        },
        { status: 400 }
      );
    }

    const bucket = BUCKET_BY_ID[bucketId];
    if (!bucket) {
      return NextResponse.json(
        { error: `Bucket ${bucketId} not found` },
        { status: 404 }
      );
    }

    const client = getS3Client();
    if (!client) {
      return NextResponse.json(
        { error: "DO Spaces not configured" },
        { status: 503 }
      );
    }

    // Get bucket index
    try {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: SPACES_BUCKET,
          Key: `${bucket.storagePath}index.json`,
        })
      );
      const content = await response.Body?.transformToString();
      if (content) {
        const index = JSON.parse(content);
        return NextResponse.json({
          success: true,
          bucket: {
            id: bucket.id,
            name: bucket.name,
            sector: bucket.sector,
            sicCodes: bucket.sicCodes,
          },
          status: {
            totalRecords: index.totalRecords || 0,
            enrichedRecords: index.enrichedRecords || 0,
            skipTracedRecords: index.skipTracedRecords || 0,
            uploads: index.files?.length || 0,
          },
          indexes: index.indexes,
          files: index.files || [],
        });
      }
    } catch {
      return NextResponse.json({
        success: true,
        bucket: {
          id: bucket.id,
          name: bucket.name,
          sector: bucket.sector,
          sicCodes: bucket.sicCodes,
        },
        status: {
          totalRecords: 0,
          enrichedRecords: 0,
          skipTracedRecords: 0,
          uploads: 0,
        },
        message: "Bucket exists but no data uploaded yet",
      });
    }

    return NextResponse.json({
      success: true,
      bucket,
      message: "No data found",
    });
  } catch (error) {
    console.error("[Sector Upload Status] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get status" },
      { status: 500 }
    );
  }
}
