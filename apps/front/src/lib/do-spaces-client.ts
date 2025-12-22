/**
 * DigitalOcean Spaces S3 Client - Centralized Configuration
 *
 * This module provides a properly configured S3 client for DO Spaces.
 * All S3 operations should use this client to ensure consistent configuration.
 *
 * Key settings:
 * - forcePathStyle: true (REQUIRED for DO Spaces compatibility)
 * - region: nyc3
 * - Signature V4 (default in AWS SDK v3)
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  CopyObjectCommand,
  type PutObjectCommandInput,
  type GetObjectCommandInput,
  type DeleteObjectCommandInput,
  type ListObjectsV2CommandInput,
  type HeadObjectCommandInput,
  type CopyObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ============================================================================
// CONFIGURATION
// ============================================================================

const SPACES_REGION =
  process.env.DO_SPACES_REGION || process.env.SPACES_REGION || "nyc3";
const SPACES_ENDPOINT =
  process.env.DO_SPACES_ENDPOINT ||
  process.env.SPACES_ENDPOINT ||
  `https://${SPACES_REGION}.digitaloceanspaces.com`;
const SPACES_BUCKET =
  process.env.DO_SPACES_BUCKET || process.env.SPACES_BUCKET || "nextier";
const SPACES_CDN_URL = `https://${SPACES_BUCKET}.${SPACES_REGION}.cdn.digitaloceanspaces.com`;

// Credentials - check multiple env var names for compatibility
const SPACES_KEY =
  process.env.DO_SPACES_KEY ||
  process.env.SPACES_KEY ||
  process.env.SPACES_ACCESS_KEY_ID ||
  "";
const SPACES_SECRET =
  process.env.DO_SPACES_SECRET ||
  process.env.SPACES_SECRET ||
  process.env.SPACES_SECRET_ACCESS_KEY ||
  "";

// ============================================================================
// SINGLETON CLIENT
// ============================================================================

let _s3Client: S3Client | null = null;

/**
 * Get the configured S3 client for DO Spaces
 * Returns null if credentials are not configured
 */
export function getSpacesClient(): S3Client | null {
  if (_s3Client) return _s3Client;

  if (!SPACES_KEY || !SPACES_SECRET) {
    console.warn(
      "[DO Spaces] Not configured. Set DO_SPACES_KEY and DO_SPACES_SECRET environment variables.",
    );
    return null;
  }

  _s3Client = new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: SPACES_REGION,
    credentials: {
      accessKeyId: SPACES_KEY,
      secretAccessKey: SPACES_SECRET,
    },
    // CRITICAL: forcePathStyle must be true for DO Spaces
    forcePathStyle: true,
  });

  console.log(
    `[DO Spaces] Client initialized for ${SPACES_ENDPOINT}, bucket: ${SPACES_BUCKET}`,
  );
  return _s3Client;
}

/**
 * Check if Spaces is available and configured
 */
export function isSpacesConfigured(): boolean {
  return !!(SPACES_KEY && SPACES_SECRET);
}

/**
 * Get the bucket name
 */
export function getBucketName(): string {
  return SPACES_BUCKET;
}

/**
 * Get the CDN URL for a key
 */
export function getCdnUrl(key: string): string {
  return `${SPACES_CDN_URL}/${key}`;
}

/**
 * Get the direct Spaces URL for a key
 */
export function getSpacesUrl(key: string): string {
  return `${SPACES_ENDPOINT}/${SPACES_BUCKET}/${key}`;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Upload a file to Spaces
 */
export async function uploadToSpaces(
  key: string,
  body: Buffer | string | Uint8Array,
  contentType: string = "application/octet-stream",
  options?: { isPublic?: boolean; metadata?: Record<string, string> },
): Promise<{ url: string; cdnUrl: string } | null> {
  const client = getSpacesClient();
  if (!client) return null;

  try {
    const input: PutObjectCommandInput = {
      Bucket: SPACES_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      ACL: options?.isPublic ? "public-read" : "private",
      Metadata: options?.metadata,
    };

    await client.send(new PutObjectCommand(input));

    return {
      url: getSpacesUrl(key),
      cdnUrl: getCdnUrl(key),
    };
  } catch (error) {
    console.error("[DO Spaces] Upload error:", error);
    return null;
  }
}

/**
 * Download a file from Spaces
 */
export async function downloadFromSpaces(key: string): Promise<string | null> {
  const client = getSpacesClient();
  if (!client) return null;

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: key,
      }),
    );

    return (await response.Body?.transformToString()) || null;
  } catch (error: unknown) {
    const err = error as { name?: string };
    if (err.name === "NoSuchKey") return null;
    console.error("[DO Spaces] Download error:", error);
    return null;
  }
}

/**
 * Delete a file from Spaces
 */
export async function deleteFromSpaces(key: string): Promise<boolean> {
  const client = getSpacesClient();
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
    console.error("[DO Spaces] Delete error:", error);
    return false;
  }
}

/**
 * List objects in Spaces with optional prefix
 */
export async function listSpacesObjects(
  prefix?: string,
  maxKeys: number = 1000,
): Promise<{ key: string; size: number; lastModified: Date }[]> {
  const client = getSpacesClient();
  if (!client) return [];

  try {
    const input: ListObjectsV2CommandInput = {
      Bucket: SPACES_BUCKET,
      Prefix: prefix,
      MaxKeys: maxKeys,
    };

    const response = await client.send(new ListObjectsV2Command(input));

    return (response.Contents || []).map((obj) => ({
      key: obj.Key || "",
      size: obj.Size || 0,
      lastModified: obj.LastModified || new Date(),
    }));
  } catch (error) {
    console.error("[DO Spaces] List error:", error);
    return [];
  }
}

/**
 * Check if an object exists in Spaces
 */
export async function existsInSpaces(key: string): Promise<boolean> {
  const client = getSpacesClient();
  if (!client) return false;

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: key,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Get a presigned URL for temporary access
 */
export async function getPresignedUrl(
  key: string,
  expiresIn: number = 3600,
): Promise<string | null> {
  const client = getSpacesClient();
  if (!client) return null;

  try {
    const command = new GetObjectCommand({
      Bucket: SPACES_BUCKET,
      Key: key,
    });

    return await getSignedUrl(client, command, { expiresIn });
  } catch (error) {
    console.error("[DO Spaces] Presigned URL error:", error);
    return null;
  }
}

/**
 * Copy an object within Spaces
 */
export async function copyInSpaces(
  sourceKey: string,
  destinationKey: string,
): Promise<boolean> {
  const client = getSpacesClient();
  if (!client) return false;

  try {
    await client.send(
      new CopyObjectCommand({
        Bucket: SPACES_BUCKET,
        CopySource: `${SPACES_BUCKET}/${sourceKey}`,
        Key: destinationKey,
      }),
    );
    return true;
  } catch (error) {
    console.error("[DO Spaces] Copy error:", error);
    return false;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  CopyObjectCommand,
};

// Export config for direct access if needed
export const spacesConfig = {
  endpoint: SPACES_ENDPOINT,
  region: SPACES_REGION,
  bucket: SPACES_BUCKET,
  cdnUrl: SPACES_CDN_URL,
};
