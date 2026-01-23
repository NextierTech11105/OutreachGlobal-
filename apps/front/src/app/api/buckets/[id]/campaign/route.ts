import { NextRequest, NextResponse } from "next/server";
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
    console.warn("[Bucket Campaign API] DO Spaces not configured");
    return null;
  }
  return new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: "nyc3",
    credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
    forcePathStyle: true, // CRITICAL for DO Spaces
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
  leads?: Array<Record<string, unknown>>;
}

interface Campaign {
  id: string;
  name: string;
  bucketId: string;
  templateId?: string;
  sequenceId?: string;
  status: "draft" | "active" | "paused" | "completed";
  leadsCount: number;
  createdAt: string;
  updatedAt: string;
}

interface CreateCampaignRequest {
  name?: string;
  templateId?: string;
  sequenceId?: string;
  startImmediately?: boolean;
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
    console.error("[Bucket Campaign API] Get error:", error);
    return null;
  }
}

// Save campaign to DO Spaces
async function saveCampaign(campaign: Campaign): Promise<boolean> {
  const client = getS3Client();
  if (!client) return false;

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: `campaigns/${campaign.id}.json`,
        Body: JSON.stringify(campaign, null, 2),
        ContentType: "application/json",
      }),
    );
    return true;
  } catch (error) {
    console.error("[Bucket Campaign API] Save error:", error);
    return false;
  }
}

// POST /api/buckets/:id/campaign - Create campaign from bucket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body: CreateCampaignRequest = await request.json().catch(() => ({}));

    // Fetch real bucket data to get actual lead count
    const bucketData = await getBucketData(id);

    let leadsCount = 0;
    let bucketName = id;

    if (bucketData) {
      // Get real lead count from bucket
      if (bucketData.leads && bucketData.leads.length > 0) {
        leadsCount = bucketData.leads.length;
      } else if (bucketData.properties && bucketData.properties.length > 0) {
        leadsCount = bucketData.properties.length;
      }

      if (bucketData.metadata?.name) {
        bucketName = bucketData.metadata.name;
      }
    }

    const campaignId = `campaign-${Date.now()}`;

    const campaign: Campaign = {
      id: campaignId,
      name: body.name || `Campaign from ${bucketName}`,
      bucketId: id,
      templateId: body.templateId,
      sequenceId: body.sequenceId,
      status: body.startImmediately ? "active" : "draft",
      leadsCount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save campaign to DO Spaces
    await saveCampaign(campaign);

    return NextResponse.json({
      success: true,
      message: "Campaign created from bucket",
      campaign,
    });
  } catch (error) {
    console.error("[Bucket Campaign API] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 },
    );
  }
}
