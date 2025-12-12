// DigitalOcean Spaces Configuration
// S3-compatible object storage for CSV exports, file uploads, etc.

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const SPACES_ENDPOINT = "https://nyc3.digitaloceanspaces.com";
const SPACES_BUCKET = "nextier";
const SPACES_CDN_URL = "https://nextier.nyc3.cdn.digitaloceanspaces.com";

// Keys from environment (set these in DO App Platform)
const SPACES_KEY =
  process.env.DO_SPACES_KEY || process.env.SPACES_ACCESS_KEY_ID || "";
const SPACES_SECRET =
  process.env.DO_SPACES_SECRET || process.env.SPACES_SECRET_ACCESS_KEY || "";

let _s3Client: S3Client | null = null;

function getS3Client(): S3Client | null {
  if (_s3Client) return _s3Client;

  if (!SPACES_KEY || !SPACES_SECRET) {
    console.warn(
      "[Spaces] Not configured. Set DO_SPACES_KEY and DO_SPACES_SECRET",
    );
    return null;
  }

  _s3Client = new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: "nyc3",
    credentials: {
      accessKeyId: SPACES_KEY,
      secretAccessKey: SPACES_SECRET,
    },
  });

  return _s3Client;
}

export function isSpacesAvailable(): boolean {
  return !!getS3Client();
}

// Upload a file to Spaces
export async function uploadFile(
  key: string,
  body: Buffer | string,
  contentType: string = "application/octet-stream",
  isPublic: boolean = false,
): Promise<{ url: string; cdnUrl: string } | null> {
  const client = getS3Client();
  if (!client) return null;

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        ACL: isPublic ? "public-read" : "private",
      }),
    );

    return {
      url: `${SPACES_ENDPOINT}/${SPACES_BUCKET}/${key}`,
      cdnUrl: `${SPACES_CDN_URL}/${key}`,
    };
  } catch (error) {
    console.error("[Spaces] Upload error:", error);
    return null;
  }
}

// Upload CSV export
export async function uploadCSV(
  filename: string,
  csvContent: string,
  folder: string = "exports",
): Promise<{ url: string; cdnUrl: string } | null> {
  const key = `${folder}/${Date.now()}-${filename}`;
  return uploadFile(key, csvContent, "text/csv", true);
}

// Get a signed URL for private files
export async function getSignedDownloadUrl(
  key: string,
  expiresIn: number = 3600,
): Promise<string | null> {
  const client = getS3Client();
  if (!client) return null;

  try {
    const command = new GetObjectCommand({
      Bucket: SPACES_BUCKET,
      Key: key,
    });

    return await getSignedUrl(client, command, { expiresIn });
  } catch (error) {
    console.error("[Spaces] Signed URL error:", error);
    return null;
  }
}

// Delete a file
export async function deleteFile(key: string): Promise<boolean> {
  const client = getS3Client();
  if (!client) return false;

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: key,
      }),
    );
    return true;
  } catch (error) {
    console.error("[Spaces] Delete error:", error);
    return false;
  }
}

// Generate a presigned upload URL (for client-side uploads)
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600,
): Promise<string | null> {
  const client = getS3Client();
  if (!client) return null;

  try {
    const command = new PutObjectCommand({
      Bucket: SPACES_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    return await getSignedUrl(client, command, { expiresIn });
  } catch (error) {
    console.error("[Spaces] Presigned URL error:", error);
    return null;
  }
}

// Export types
export interface SpacesConfig {
  endpoint: string;
  bucket: string;
  cdnUrl: string;
  region: string;
}

export function getSpacesConfig(): SpacesConfig {
  return {
    endpoint: SPACES_ENDPOINT,
    bucket: SPACES_BUCKET,
    cdnUrl: SPACES_CDN_URL,
    region: "nyc3",
  };
}
