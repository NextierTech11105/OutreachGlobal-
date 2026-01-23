import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { apiAuth } from "@/lib/api-auth";

/**
 * PRE-SIGNED URL ENDPOINT - For Large File Uploads
 *
 * Browser uploads directly to DO Spaces, bypassing API timeout limits.
 * Use this for files >10MB.
 */

const SPACES_ENDPOINT = "https://nyc3.digitaloceanspaces.com";
const SPACES_BUCKET = process.env.SPACES_BUCKET || process.env.DO_SPACES_BUCKET || "nextier";
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

/**
 * POST /api/storage/presign
 * Get a pre-signed URL for direct upload to DO Spaces
 *
 * Body: { filename, folder, contentType, size }
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
        { error: "DO Spaces not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { filename, folder, contentType, size } = body;

    if (!filename || !folder) {
      return NextResponse.json(
        { error: "filename and folder required" },
        { status: 400 }
      );
    }

    // Build storage path
    const timestamp = Date.now();
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${folder.replace(/\/$/, "")}/${timestamp}_${safeName}`;

    // Create pre-signed PUT URL (valid for 30 minutes)
    const command = new PutObjectCommand({
      Bucket: SPACES_BUCKET,
      Key: storagePath,
      ContentType: contentType || "text/csv",
      Metadata: {
        "original-filename": filename,
        "uploaded-by": userId,
        "team-id": teamId || "",
      },
    });

    const presignedUrl = await getSignedUrl(client, command, {
      expiresIn: 1800, // 30 minutes
    });

    console.log(`[Storage Presign] Generated URL for ${storagePath} (${size} bytes)`);

    return NextResponse.json({
      success: true,
      presignedUrl,
      storagePath,
      bucket: SPACES_BUCKET,
      expiresIn: 1800,
      instructions: {
        method: "PUT",
        headers: {
          "Content-Type": contentType || "text/csv",
        },
        body: "Raw file content",
      },
      afterUpload: {
        endpoint: "POST /api/buckets/import",
        body: { storagePath },
      },
    });
  } catch (error) {
    console.error("[Storage Presign] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Presign failed" },
      { status: 500 }
    );
  }
}
