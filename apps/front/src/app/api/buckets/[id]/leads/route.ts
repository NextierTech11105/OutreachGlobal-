import { NextRequest, NextResponse } from "next/server";
import { Lead, BucketLeadsResponse, applyAutoTags } from "@/lib/types/bucket";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

// DO Spaces configuration
const SPACES_ENDPOINT = "https://nyc3.digitaloceanspaces.com";
const SPACES_BUCKET = "nextier";
const SPACES_KEY = process.env.DO_SPACES_KEY || "";
const SPACES_SECRET = process.env.DO_SPACES_SECRET || "";

function getS3Client(): S3Client | null {
  if (!SPACES_KEY || !SPACES_SECRET) {
    console.warn("[Bucket Leads API] DO Spaces not configured");
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
  properties?: Array<{
    id?: string;
    address?: { address?: string; city?: string; state?: string; zip?: string };
    propertyType?: string;
    owner1FirstName?: string;
    owner1LastName?: string;
    estimatedValue?: number;
    estimatedEquity?: number;
    equityPercent?: number;
    preForeclosure?: boolean;
    foreclosure?: boolean;
    taxLien?: boolean;
    absenteeOwner?: boolean;
    vacant?: boolean;
    inherited?: boolean;
    bedrooms?: number;
    bathrooms?: number;
    squareFeet?: number;
    yearBuilt?: number;
    lastSaleDate?: string;
    lastSaleAmount?: number;
    ownerOccupied?: boolean;
    _raw?: Record<string, unknown>;
    // Skip trace enriched fields
    phone?: string;
    email?: string;
    enrichmentStatus?: string;
    enrichedAt?: string;
  }>;
  leads?: Lead[];
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
      })
    );

    const bodyContents = await response.Body?.transformToString();
    if (!bodyContents) return null;

    return JSON.parse(bodyContents);
  } catch (error: unknown) {
    const err = error as { name?: string };
    if (err.name === "NoSuchKey") return null;
    console.error("[Bucket Leads API] Get error:", error);
    return null;
  }
}

// Convert property data to Lead format
function propertyToLead(prop: NonNullable<BucketData["properties"]>[number], bucketId: string, index: number): Lead {
  const addr = prop.address || {};

  const lead: Lead = {
    id: prop.id || `lead-${bucketId}-${index}`,
    bucketId,
    source: "real-estate",
    status: "new",
    tags: [],
    autoTags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    firstName: prop.owner1FirstName || "",
    lastName: prop.owner1LastName || "",
    email: prop.email || "",
    phone: prop.phone || "",
    enrichmentStatus: (prop.enrichmentStatus as "pending" | "queued" | "processing" | "completed" | "failed" | "partial") || "pending",
    activityCount: 0,
    propertyData: {
      propertyId: prop.id || `prop-${index}`,
      address: addr.address || "",
      city: addr.city || "",
      state: addr.state || "",
      zipCode: addr.zip || "",
      propertyType: prop.propertyType || "",
      bedrooms: prop.bedrooms || 0,
      bathrooms: prop.bathrooms || 0,
      sqft: prop.squareFeet || 0,
      yearBuilt: prop.yearBuilt || 0,
      estimatedValue: prop.estimatedValue || 0,
      estimatedEquity: prop.estimatedEquity || 0,
      equityPercent: prop.equityPercent || 0,
      lastSaleDate: prop.lastSaleDate || "",
      lastSaleAmount: prop.lastSaleAmount || 0,
      ownerOccupied: prop.ownerOccupied || false,
      absenteeOwner: prop.absenteeOwner || false,
    },
  };

  if (prop.enrichedAt) {
    lead.enrichedAt = prop.enrichedAt;
  }

  // Apply auto-tags based on property data
  lead.autoTags = applyAutoTags(lead);

  return lead;
}

// GET /api/buckets/:id/leads - Get leads for a bucket
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("perPage") || "25");
    const status = searchParams.get("status");
    const tag = searchParams.get("tag");
    const enriched = searchParams.get("enriched");

    // Load real bucket data from DO Spaces
    const bucketData = await getBucketData(id);

    if (!bucketData) {
      return NextResponse.json({
        leads: [],
        total: 0,
        page,
        perPage,
        enrichmentStatus: "pending",
        error: "Bucket not found or DO Spaces not configured",
      });
    }

    // Convert properties to leads
    let leads: Lead[] = [];

    if (bucketData.leads && bucketData.leads.length > 0) {
      // Bucket already has leads format
      leads = bucketData.leads;
    } else if (bucketData.properties && bucketData.properties.length > 0) {
      // Convert properties to leads
      leads = bucketData.properties.map((prop, index) => propertyToLead(prop, id, index));
    }

    // Apply filters
    if (status) {
      leads = leads.filter((l) => l.status === status);
    }
    if (tag) {
      leads = leads.filter((l) => l.tags.includes(tag) || l.autoTags.includes(tag));
    }
    if (enriched === "true") {
      leads = leads.filter((l) => l.enrichmentStatus === "completed");
    } else if (enriched === "false") {
      leads = leads.filter((l) => l.enrichmentStatus !== "completed");
    }

    // Paginate
    const total = leads.length;
    const start = (page - 1) * perPage;
    const paginatedLeads = leads.slice(start, start + perPage);

    // Determine enrichment status
    const enrichedCount = leads.filter((l) => l.enrichmentStatus === "completed").length;
    let enrichmentStatus: BucketLeadsResponse["enrichmentStatus"] = "pending";
    if (enrichedCount === total && total > 0) {
      enrichmentStatus = "completed";
    } else if (enrichedCount > 0) {
      enrichmentStatus = "processing";
    }

    const response: BucketLeadsResponse = {
      leads: paginatedLeads,
      total,
      page,
      perPage,
      enrichmentStatus,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Bucket Leads API] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}
