/**
 * SIMPLE TEST UPLOAD - NO AUTH, NO COMPLEXITY
 * Just uploads a CSV to DO Spaces and shows you it worked.
 */

import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

// DO Spaces configuration
const SPACES_ENDPOINT = "https://nyc3.digitaloceanspaces.com";
const SPACES_BUCKET = process.env.SPACES_BUCKET || process.env.DO_SPACES_BUCKET || "nextier";
const SPACES_KEY = process.env.SPACES_KEY || process.env.DO_SPACES_KEY || "";
const SPACES_SECRET = process.env.SPACES_SECRET || process.env.DO_SPACES_SECRET || "";

function getClient(): S3Client | null {
  if (!SPACES_KEY || !SPACES_SECRET) return null;
  return new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: "nyc3",
    credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
    forcePathStyle: true,
  });
}

// GET - Show status and list uploaded files
export async function GET() {
  const client = getClient();

  if (!client) {
    return NextResponse.json({
      error: "DO Spaces NOT configured",
      missing: {
        SPACES_KEY: !SPACES_KEY,
        SPACES_SECRET: !SPACES_SECRET,
      },
      help: "Set SPACES_KEY and SPACES_SECRET environment variables",
    }, { status: 503 });
  }

  // List all uploaded test files
  try {
    const response = await client.send(new ListObjectsV2Command({
      Bucket: SPACES_BUCKET,
      Prefix: "test-uploads/",
      MaxKeys: 100,
    }));

    const files = (response.Contents || []).map(obj => ({
      key: obj.Key,
      size: obj.Size,
      uploaded: obj.LastModified,
      url: `https://${SPACES_BUCKET}.nyc3.cdn.digitaloceanspaces.com/${obj.Key}`,
    }));

    return NextResponse.json({
      success: true,
      message: "DO Spaces is WORKING. Upload a CSV below.",
      configured: {
        bucket: SPACES_BUCKET,
        endpoint: SPACES_ENDPOINT,
        hasKey: !!SPACES_KEY,
        hasSecret: !!SPACES_SECRET,
      },
      uploadedFiles: files,
      uploadInstructions: {
        endpoint: "POST /api/test-upload",
        contentType: "multipart/form-data",
        field: "file",
        example: "curl -X POST -F 'file=@your-data.csv' https://your-domain/api/test-upload",
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: "Failed to list files",
      details: String(error),
    }, { status: 500 });
  }
}

// POST - Upload a file directly to DO Spaces
export async function POST(request: NextRequest) {
  const client = getClient();

  if (!client) {
    return NextResponse.json({
      error: "DO Spaces NOT configured",
      fix: "Set SPACES_KEY and SPACES_SECRET environment variables",
    }, { status: 503 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({
        error: "No file provided",
        usage: "Send file as multipart/form-data with field name 'file'",
      }, { status: 400 });
    }

    // Read file
    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `test-uploads/${timestamp}_${safeName}`;

    // Upload to DO Spaces
    await client.send(new PutObjectCommand({
      Bucket: SPACES_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type || "text/csv",
      ACL: "public-read", // Make it publicly accessible
    }));

    const publicUrl = `https://${SPACES_BUCKET}.nyc3.cdn.digitaloceanspaces.com/${key}`;

    return NextResponse.json({
      success: true,
      message: "FILE UPLOADED SUCCESSFULLY!",
      file: {
        originalName: file.name,
        size: buffer.length,
        sizeFormatted: formatBytes(buffer.length),
        savedAs: key,
        publicUrl: publicUrl,
      },
      nextSteps: [
        "Your file is now in DO Spaces",
        `View it at: ${publicUrl}`,
        "Now try the full import at /api/datalake/import",
      ],
    });
  } catch (error) {
    console.error("[Test Upload] Error:", error);
    return NextResponse.json({
      error: "Upload FAILED",
      details: String(error),
    }, { status: 500 });
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
