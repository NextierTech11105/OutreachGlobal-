/**
 * PUSH TO LEADS API
 *
 * Pushes enriched bucket records to the leads table in PostgreSQL.
 * Records must have mobile phone to be pushed (skip trace enriched).
 *
 * POST /api/buckets/:id/push-to-leads
 * - Reads bucket data from DO Spaces
 * - Filters for records with phone numbers
 * - Inserts into leads table
 * - Returns success/skipped counts
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";

// DO Spaces configuration
const SPACES_ENDPOINT = "https://nyc3.digitaloceanspaces.com";
const SPACES_BUCKET = "nextier";
const SPACES_KEY = process.env.DO_SPACES_KEY || "";
const SPACES_SECRET = process.env.DO_SPACES_SECRET || "";

function getS3Client(): S3Client | null {
  if (!SPACES_KEY || !SPACES_SECRET) {
    return null;
  }
  return new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: "nyc3",
    credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
    forcePathStyle: true, // CRITICAL for DO Spaces
  });
}

interface BucketRecord {
  id?: string;
  matchingKeys?: {
    companyName?: string | null;
    contactName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    title?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    sicCode?: string | null;
  };
  flags?: {
    hasPhone?: boolean;
    hasEmail?: boolean;
    hasCellPhone?: boolean;
  };
  tags?: string[];
  _original?: Record<string, string>;
  // Skip trace enriched fields
  phone?: string;
  email?: string;
  enrichmentStatus?: string;
}

interface BucketProperty {
  id?: string;
  address?: { address?: string; city?: string; state?: string; zip?: string };
  owner1FirstName?: string;
  owner1LastName?: string;
  phone?: string;
  email?: string;
  enrichmentStatus?: string;
  propertyType?: string;
  estimatedValue?: number;
}

interface BucketData {
  metadata?: {
    id: string;
    name: string;
  };
  records?: BucketRecord[];
  properties?: BucketProperty[];
  leads?: Array<{
    id: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    company?: string;
    title?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    source?: string;
    status?: string;
    tags?: string[];
    enrichmentStatus?: string;
  }>;
}

// Generate lead ID with prefix
function generateLeadId(): string {
  const chars = "0123456789abcdefghjkmnpqrstvwxyz"; // Crockford Base32
  let id = "lead_";
  const timestamp = Date.now().toString(36);
  id += timestamp;
  for (let i = 0; i < 10; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

// Normalize phone to E.164
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (phone.startsWith("+")) return phone;
  return `+${digits}`;
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
    console.error("[Push to Leads] Get error:", error);
    return null;
  }
}

// Extract phone from various record formats
function extractPhone(record: BucketRecord): string | null {
  // Direct phone field (from skip trace)
  if (record.phone) return record.phone;

  // From _original CSV columns
  const original = record._original || {};
  const phoneFields = [
    "Phone",
    "phone",
    "Phone Number",
    "Direct Phone",
    "Cell Phone",
    "cell",
    "PHONE",
    "Telephone",
    "Mobile",
    "mobile",
    "Cell",
  ];

  for (const field of phoneFields) {
    if (original[field]) return original[field];
  }

  return null;
}

// Extract email from various record formats
function extractEmail(record: BucketRecord): string | null {
  if (record.email) return record.email;

  const original = record._original || {};
  const emailFields = ["Email", "email", "Email Address", "EMAIL", "E-mail"];

  for (const field of emailFields) {
    if (original[field]) return original[field];
  }

  return null;
}

// POST /api/buckets/:id/push-to-leads
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: bucketId } = await params;
    const body = await request.json().catch(() => ({}));
    const { teamId, requirePhone = true, requireEnriched = false } = body;

    if (!teamId) {
      return NextResponse.json(
        { success: false, error: "teamId is required" },
        { status: 400 },
      );
    }

    // Load bucket data
    const bucketData = await getBucketData(bucketId);
    if (!bucketData) {
      return NextResponse.json(
        { success: false, error: "Bucket not found" },
        { status: 404 },
      );
    }

    const results = {
      total: 0,
      pushed: 0,
      skipped: 0,
      duplicates: 0,
      errors: 0,
      leadIds: [] as string[],
    };

    // Process CSV records (USBizData format)
    if (bucketData.records && bucketData.records.length > 0) {
      results.total = bucketData.records.length;

      for (const record of bucketData.records) {
        const phone = extractPhone(record);
        const email = extractEmail(record);

        // Skip if no phone and phone is required
        if (requirePhone && !phone) {
          results.skipped++;
          continue;
        }

        // Skip if enriched required but not enriched
        if (requireEnriched && record.enrichmentStatus !== "completed") {
          results.skipped++;
          continue;
        }

        const keys = record.matchingKeys || {};
        const original = record._original || {};

        try {
          const leadId = generateLeadId();

          // GOLD = Skip traced + Mobile + Email captured
          const isGold = phone && email;
          const leadTags = [...(record.tags || [])];
          if (isGold && !leadTags.includes("gold")) {
            leadTags.push("gold");
          }

          // Handle USBizData "Contact Name" field - split into first/last if needed
          let firstName = keys.firstName || "";
          let lastName = keys.lastName || "";

          if (!firstName && keys.contactName) {
            const nameParts = keys.contactName.trim().split(/\s+/);
            firstName = nameParts[0] || "";
            lastName = nameParts.slice(1).join(" ") || "";
          }

          await db.insert(leads).values({
            id: leadId,
            teamId,
            firstName,
            lastName,
            email: email || "",
            phone: phone ? normalizePhone(phone) : "",
            // mobilePhone: phone ? normalizePhone(phone) : "", // Also set mobile
            title: keys.title || "",
            company: keys.companyName || "",
            address: keys.address || "",
            city: keys.city || "",
            state: keys.state || "",
            zipCode: keys.zip || "",
            source: "bucket:" + bucketId,
            status: "new",
            tags: leadTags,
            metadata: {
              bucketId,
              sicCode: keys.sicCode,
              industry: original["Industry"] || original["industry"],
              revenue: original["Revenue"] || original["revenue"],
              employees: original["Employees"] || original["employees"],
              originalRecordId: record.id,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          results.pushed++;
          results.leadIds.push(leadId);
        } catch (error: unknown) {
          const err = error as { code?: string };
          if (err.code === "23505") {
            // Duplicate key
            results.duplicates++;
          } else {
            console.error("[Push to Leads] Insert error:", error);
            results.errors++;
          }
        }
      }
    }

    // Process property records (Real Estate format)
    if (bucketData.properties && bucketData.properties.length > 0) {
      results.total += bucketData.properties.length;

      for (const prop of bucketData.properties) {
        // Skip if no phone and phone required
        if (requirePhone && !prop.phone) {
          results.skipped++;
          continue;
        }

        // Skip if enriched required but not enriched
        if (requireEnriched && prop.enrichmentStatus !== "completed") {
          results.skipped++;
          continue;
        }

        const addr = prop.address || {};

        try {
          const leadId = generateLeadId();

          // GOLD = Skip traced + Mobile + Email captured
          const isGold = prop.phone && prop.email;
          const leadTags: string[] = [];
          if (isGold) {
            leadTags.push("gold");
          }

          await db.insert(leads).values({
            id: leadId,
            teamId,
            propertyId: prop.id,
            firstName: prop.owner1FirstName || "",
            lastName: prop.owner1LastName || "",
            email: prop.email || "",
            phone: prop.phone ? normalizePhone(prop.phone) : "",
            // mobilePhone: prop.phone ? normalizePhone(prop.phone) : "", // Also set mobile
            address: addr.address || "",
            city: addr.city || "",
            state: addr.state || "",
            zipCode: addr.zip || "",
            source: "bucket:" + bucketId,
            status: "new",
            tags: leadTags,
            metadata: {
              bucketId,
              propertyType: prop.propertyType,
              estimatedValue: prop.estimatedValue,
              originalPropertyId: prop.id,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          results.pushed++;
          results.leadIds.push(leadId);
        } catch (error: unknown) {
          const err = error as { code?: string };
          if (err.code === "23505") {
            results.duplicates++;
          } else {
            console.error("[Push to Leads] Insert error:", error);
            results.errors++;
          }
        }
      }
    }

    // Process pre-formatted leads
    if (bucketData.leads && bucketData.leads.length > 0) {
      results.total += bucketData.leads.length;

      for (const lead of bucketData.leads) {
        if (requirePhone && !lead.phone) {
          results.skipped++;
          continue;
        }

        if (requireEnriched && lead.enrichmentStatus !== "completed") {
          results.skipped++;
          continue;
        }

        try {
          const leadId = generateLeadId();

          // GOLD = Skip traced + Mobile + Email captured
          const isGold = lead.phone && lead.email;
          const leadTags = [...(lead.tags || [])];
          if (isGold && !leadTags.includes("gold")) {
            leadTags.push("gold");
          }

          await db.insert(leads).values({
            id: leadId,
            teamId,
            firstName: lead.firstName || "",
            lastName: lead.lastName || "",
            email: lead.email || "",
            phone: lead.phone ? normalizePhone(lead.phone) : "",
            // mobilePhone: lead.phone ? normalizePhone(lead.phone) : "", // Also set mobile
            title: lead.title || "",
            company: lead.company || "",
            address: lead.address || "",
            city: lead.city || "",
            state: lead.state || "",
            zipCode: lead.zipCode || "",
            source: lead.source || "bucket:" + bucketId,
            status: lead.status || "new",
            tags: leadTags,
            metadata: {
              bucketId,
              originalLeadId: lead.id,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          results.pushed++;
          results.leadIds.push(leadId);
        } catch (error: unknown) {
          const err = error as { code?: string };
          if (err.code === "23505") {
            results.duplicates++;
          } else {
            console.error("[Push to Leads] Insert error:", error);
            results.errors++;
          }
        }
      }
    }

    console.log(
      `[Push to Leads] Bucket ${bucketId}: ${results.pushed}/${results.total} pushed, ${results.skipped} skipped, ${results.duplicates} duplicates`,
    );

    return NextResponse.json({
      success: true,
      bucketId,
      results,
      message: `Pushed ${results.pushed} leads to database`,
    });
  } catch (error) {
    console.error("[Push to Leads] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Push failed",
      },
      { status: 500 },
    );
  }
}

// GET - Check push status / preview
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: bucketId } = await params;

    const bucketData = await getBucketData(bucketId);
    if (!bucketData) {
      return NextResponse.json(
        { success: false, error: "Bucket not found" },
        { status: 404 },
      );
    }

    let total = 0;
    let withPhone = 0;
    let withEmail = 0;
    let enriched = 0;

    // Count records
    if (bucketData.records) {
      total += bucketData.records.length;
      for (const r of bucketData.records) {
        if (extractPhone(r)) withPhone++;
        if (extractEmail(r)) withEmail++;
        if (r.enrichmentStatus === "completed") enriched++;
      }
    }

    if (bucketData.properties) {
      total += bucketData.properties.length;
      for (const p of bucketData.properties) {
        if (p.phone) withPhone++;
        if (p.email) withEmail++;
        if (p.enrichmentStatus === "completed") enriched++;
      }
    }

    if (bucketData.leads) {
      total += bucketData.leads.length;
      for (const l of bucketData.leads) {
        if (l.phone) withPhone++;
        if (l.email) withEmail++;
        if (l.enrichmentStatus === "completed") enriched++;
      }
    }

    return NextResponse.json({
      success: true,
      bucketId,
      preview: {
        total,
        withPhone,
        withEmail,
        enriched,
        pushableWithPhone: withPhone,
        pushableEnrichedOnly: enriched,
      },
    });
  } catch (error) {
    console.error("[Push to Leads] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Preview failed" },
      { status: 500 },
    );
  }
}
