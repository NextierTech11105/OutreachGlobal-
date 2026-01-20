/**
 * ⚠️ DEPRECATED: Use /api/storage/upload instead
 *
 * This endpoint is maintained for backwards compatibility.
 * New integrations should use POST /api/storage/upload which provides
 * a unified file landing endpoint with consistent conventions.
 *
 * Migration: Replace POST /api/datalake/upload → POST /api/storage/upload
 * Use folder: "datalake/{schema}/raw" to maintain same storage structure
 */
import { sf, sfd } from "@/lib/utils/safe-format";
/**
 * Datalake Upload API
 * Upload USBizData CSV files directly to DigitalOcean Spaces datalake storage
 */

import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { DATA_LAKE_SCHEMAS } from "@/lib/datalake/schemas";

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
  forcePathStyle: true,
});

// Schema ID to storage path mapping
const SCHEMA_PATHS: Record<string, string> = {
  ny_residential: "datalake/residential/ny/raw/",
  ny_cell_phone: "datalake/phones/ny/raw/",
  ny_optin_email: "datalake/emails/ny/raw/",
  ny_business: "datalake/business/ny/raw/",
};

interface UploadMetadata {
  schemaId: string;
  originalFilename: string;
  uploadedAt: string;
  fileSize: number;
  recordCount?: number;
  uploadedBy?: string;
  notes?: string;
}

// POST - Upload CSV to datalake
export async function POST(request: NextRequest) {
  try {
    if (!SPACES_KEY || !SPACES_SECRET) {
      return NextResponse.json(
        {
          error: "DigitalOcean Spaces credentials not configured",
          required: [
            "SPACES_KEY/DO_SPACES_KEY",
            "SPACES_SECRET/DO_SPACES_SECRET",
          ],
        },
        { status: 503 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const schemaId = formData.get("schemaId") as string | null;
    const notes = formData.get("notes") as string | null;
    const recordCount = formData.get("recordCount") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!schemaId) {
      return NextResponse.json(
        {
          error: "schemaId is required",
          availableSchemas: Object.keys(DATA_LAKE_SCHEMAS),
        },
        { status: 400 },
      );
    }

    // Validate schema
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

    const storagePath = SCHEMA_PATHS[schemaId];
    if (!storagePath) {
      return NextResponse.json(
        {
          error: `No storage path configured for schema: ${schemaId}`,
        },
        { status: 400 },
      );
    }

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `${storagePath}${timestamp}_${sanitizedName}`;

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Spaces
    await s3Client.send(
      new PutObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: "text/csv",
        Metadata: {
          "x-amz-meta-schema": schemaId,
          "x-amz-meta-original-filename": file.name,
          "x-amz-meta-uploaded-at": new Date().toISOString(),
        },
      }),
    );

    // Save metadata file
    const metadata: UploadMetadata = {
      schemaId,
      originalFilename: file.name,
      uploadedAt: new Date().toISOString(),
      fileSize: buffer.length,
      recordCount: recordCount ? parseInt(recordCount) : undefined,
      notes: notes || undefined,
    };

    await s3Client.send(
      new PutObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: `${key}.meta.json`,
        Body: JSON.stringify(metadata, null, 2),
        ContentType: "application/json",
      }),
    );

    return NextResponse.json({
      success: true,
      message: `Uploaded ${file.name} to ${schema.name} datalake`,
      details: {
        key,
        bucket: SPACES_BUCKET,
        schema: schema.name,
        totalRecordsInSchema: schema.totalRecords?.toLocaleString() || "0",
        fileSize: buffer.length,
        fileSizeFormatted: formatBytes(buffer.length),
      },
    });
  } catch (error) {
    console.error("[Datalake Upload] Error:", error);
    return NextResponse.json(
      {
        error: "Upload failed",
        details: String(error),
      },
      { status: 500 },
    );
  }
}

// GET - Get upload status and available schemas
export async function GET() {
  const schemas = Object.entries(DATA_LAKE_SCHEMAS).map(([id, schema]) => ({
    id,
    name: schema.name,
    storagePath: SCHEMA_PATHS[id] || schema.storagePath,
    totalRecords: schema.totalRecords?.toLocaleString() || "0",
    fields: schema.fields.length,
    useCases: schema.useCases,
  }));

  return NextResponse.json({
    success: true,
    message: "Upload CSV files to datalake storage",
    endpoint: "POST /api/datalake/upload",
    requiredFields: {
      file: "CSV file (multipart/form-data)",
      schemaId: "One of: " + Object.keys(DATA_LAKE_SCHEMAS).join(", "),
    },
    optionalFields: {
      notes: "Description of this upload",
      recordCount: "Number of records in file",
    },
    availableSchemas: schemas,
    configured: {
      hasCredentials: !!(SPACES_KEY && SPACES_SECRET),
      bucket: SPACES_BUCKET,
      endpoint: SPACES_ENDPOINT,
    },
  });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
