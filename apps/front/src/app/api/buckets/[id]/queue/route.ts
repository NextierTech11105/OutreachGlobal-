import { NextRequest, NextResponse } from "next/server";
import { QueueBucketRequest } from "@/lib/types/bucket";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

// DO Spaces configuration
const SPACES_ENDPOINT = "https://nyc3.digitaloceanspaces.com";
const SPACES_BUCKET = "nextier";
const SPACES_KEY = process.env.DO_SPACES_KEY || "";
const SPACES_SECRET = process.env.DO_SPACES_SECRET || "";

function getS3Client(): S3Client | null {
  if (!SPACES_KEY || !SPACES_SECRET) {
    console.warn("[Bucket Queue API] DO Spaces not configured");
    return null;
  }
  return new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: "nyc3",
    credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
  });
}

interface BucketData {
  metadata?: {
    id: string;
    name: string;
    totalCount?: number;
    savedCount?: number;
  };
  properties?: Array<Record<string, unknown>>;
  leads?: Array<{
    id: string;
    enrichmentStatus?: string;
    phone?: string;
    email?: string;
    [key: string]: unknown;
  }>;
}

interface QueueEntry {
  id: string;
  bucketId: string;
  campaignId?: string;
  sequenceId?: string;
  leadsQueued: number;
  leadsIds: string[];
  scheduledAt: string;
  status: "queued" | "processing" | "completed" | "failed";
  createdAt: string;
  processedAt?: string;
}

// Load bucket data from DO Spaces
async function getBucketData(id: string): Promise<BucketData | null> {
  const client = getS3Client();
  if (!client) return null;

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: `buckets/${id}.json`,
      }),
    );

    const bodyContents = await response.Body?.transformToString();
    if (!bodyContents) return null;

    return JSON.parse(bodyContents);
  } catch (error: unknown) {
    const err = error as { name?: string };
    if (err.name === "NoSuchKey") return null;
    console.error("[Bucket Queue API] Get error:", error);
    return null;
  }
}

// Save queue entry to DO Spaces
async function saveQueueEntry(entry: QueueEntry): Promise<boolean> {
  const client = getS3Client();
  if (!client) return false;

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: `queues/${entry.id}.json`,
        Body: JSON.stringify(entry, null, 2),
        ContentType: "application/json",
      }),
    );
    return true;
  } catch (error) {
    console.error("[Bucket Queue API] Save error:", error);
    return false;
  }
}

// POST /api/buckets/:id/queue - Queue bucket leads for outreach
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body: QueueBucketRequest = await request.json().catch(() => ({}));

    // Fetch real bucket data to get actual enriched lead count
    const bucketData = await getBucketData(id);

    let leadsQueued = 0;
    const leadsIds: string[] = [];

    if (bucketData) {
      // Only queue enriched leads (those with phone/email)
      if (bucketData.leads && bucketData.leads.length > 0) {
        for (const lead of bucketData.leads) {
          if (
            lead.enrichmentStatus === "completed" ||
            lead.phone ||
            lead.email
          ) {
            leadsQueued++;
            leadsIds.push(lead.id);
          }
        }
      } else if (bucketData.properties && bucketData.properties.length > 0) {
        // Properties that have been skip traced
        for (const prop of bucketData.properties) {
          const p = prop as Record<string, unknown>;
          if (p.phone || p.email) {
            leadsQueued++;
            if (p.id) leadsIds.push(p.id as string);
          }
        }
      }
    }

    const queueId = `queue-${id}-${Date.now()}`;

    const queueEntry: QueueEntry = {
      id: queueId,
      bucketId: id,
      campaignId: body.campaignId,
      sequenceId: body.sequenceId,
      leadsQueued,
      leadsIds,
      scheduledAt: body.scheduledAt || new Date().toISOString(),
      status: "queued",
      createdAt: new Date().toISOString(),
    };

    // Save queue entry to DO Spaces
    await saveQueueEntry(queueEntry);

    return NextResponse.json({
      success: true,
      message:
        leadsQueued > 0
          ? "Leads queued for outreach"
          : "No enriched leads to queue",
      queue: {
        id: queueId,
        bucketId: id,
        campaignId: body.campaignId,
        sequenceId: body.sequenceId,
        leadsQueued,
        scheduledAt: queueEntry.scheduledAt,
        status: queueEntry.status,
      },
    });
  } catch (error) {
    console.error("[Bucket Queue API] POST error:", error);
    return NextResponse.json(
      { error: "Failed to queue leads" },
      { status: 500 },
    );
  }
}
