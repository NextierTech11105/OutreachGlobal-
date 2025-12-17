import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

// DO Spaces configuration - check multiple env var names for compatibility
const SPACES_ENDPOINT = "https://nyc3.digitaloceanspaces.com";
const SPACES_BUCKET =
  process.env.SPACES_BUCKET || process.env.DO_SPACES_BUCKET || "nextier";
const SPACES_KEY = process.env.SPACES_KEY || process.env.DO_SPACES_KEY || "";
const SPACES_SECRET =
  process.env.SPACES_SECRET || process.env.DO_SPACES_SECRET || "";

// Apollo API
const APOLLO_API_KEY =
  process.env.APOLLO_IO_API_KEY ||
  process.env.NEXT_PUBLIC_APOLLO_IO_API_KEY ||
  process.env.APOLLO_API_KEY ||
  "";
const APOLLO_PEOPLE_URL = "https://api.apollo.io/api/v1/people/bulk_match";

function getS3Client(): S3Client | null {
  if (!SPACES_KEY || !SPACES_SECRET) {
    console.warn("[Bucket Enrich] DO Spaces not configured");
    return null;
  }
  return new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: "nyc3",
    credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
  });
}

interface BucketProperty {
  id: string;
  companyName?: string;
  contactName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  website?: string;
  industry?: string;
  enriched?: boolean;
  enrichedPhones?: string[];
  enrichedEmails?: string[];
  apolloData?: Record<string, unknown>;
  [key: string]: unknown;
}

interface Bucket {
  id: string;
  name: string;
  properties?: BucketProperty[];
  totalLeads: number;
  enrichedLeads: number;
  [key: string]: unknown;
}

// Apollo person match
interface ApolloPersonResult {
  id?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  email_status?: string;
  personal_emails?: string[];
  phone_numbers?: Array<{
    raw_number?: string;
    sanitized_number?: string;
    type?: string;
  }>;
  organization?: {
    id?: string;
    name?: string;
    website_url?: string;
    industry?: string;
    estimated_num_employees?: number;
  };
  title?: string;
  linkedin_url?: string;
}

// Bulk enrich people via Apollo (max 10 per request)
async function bulkEnrichPeople(
  people: Array<{
    id: string;
    first_name?: string;
    last_name?: string;
    name?: string;
    organization_name?: string;
    domain?: string;
  }>,
): Promise<Map<string, ApolloPersonResult>> {
  const results = new Map<string, ApolloPersonResult>();

  if (!APOLLO_API_KEY) {
    console.warn("[Bucket Enrich] Apollo API key not configured");
    return results;
  }

  // Process in chunks of 10
  for (let i = 0; i < people.length; i += 10) {
    const chunk = people.slice(i, i + 10);

    const details = chunk.map((p) => ({
      first_name: p.first_name,
      last_name: p.last_name,
      name: p.name,
      organization_name: p.organization_name,
      domain: p.domain,
      reveal_personal_emails: true,
      reveal_phone_number: true,
    }));

    try {
      const response = await fetch(APOLLO_PEOPLE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": APOLLO_API_KEY,
        },
        body: JSON.stringify({ details }),
      });

      if (!response.ok) {
        console.error(
          `[Bucket Enrich] Apollo bulk_match failed:`,
          await response.text(),
        );
        continue;
      }

      const data = await response.json();
      const matches = data.matches || [];

      // Map results back to original IDs
      for (let j = 0; j < chunk.length && j < matches.length; j++) {
        if (matches[j]?.id) {
          results.set(chunk[j].id, matches[j]);
        }
      }
    } catch (err) {
      console.error(`[Bucket Enrich] Apollo error:`, err);
    }

    // Rate limit delay between chunks
    if (i + 10 < people.length) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  return results;
}

// POST /api/buckets/:id/enrich - Enrich bucket records with Apollo
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { maxRecords = 100, enrichType = "apollo" } = body;

    const client = getS3Client();
    if (!client) {
      return NextResponse.json(
        { error: "Storage not configured" },
        { status: 500 },
      );
    }

    // Load bucket data
    let bucket: Bucket;
    try {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: SPACES_BUCKET,
          Key: `buckets/${id}.json`,
        }),
      );
      const bodyContents = await response.Body?.transformToString();
      if (!bodyContents) {
        return NextResponse.json(
          { error: "Bucket not found" },
          { status: 404 },
        );
      }
      bucket = JSON.parse(bodyContents);
    } catch (error) {
      console.error("[Bucket Enrich] Load bucket error:", error);
      return NextResponse.json({ error: "Bucket not found" }, { status: 404 });
    }

    if (!bucket.properties || bucket.properties.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No records to enrich",
        results: { total: 0, enriched: 0, failed: 0 },
      });
    }

    // Filter to records that haven't been enriched yet
    const toEnrich = bucket.properties
      .filter(
        (p) =>
          !p.enriched &&
          (p.companyName || p.contactName || p.firstName || p.lastName),
      )
      .slice(0, maxRecords);

    if (toEnrich.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All records already enriched",
        results: {
          total: bucket.properties.length,
          enriched: 0,
          alreadyEnriched: bucket.enrichedLeads,
        },
      });
    }

    console.log(
      `[Bucket Enrich] Starting ${enrichType} enrichment for ${toEnrich.length} records in bucket ${id}`,
    );

    let enrichedCount = 0;
    let failedCount = 0;

    if (enrichType === "apollo") {
      // Build Apollo match requests
      const peopleToMatch = toEnrich.map((p) => {
        const nameParts = p.contactName?.split(" ") || [];
        return {
          id: p.id,
          first_name: p.firstName || nameParts[0] || undefined,
          last_name: p.lastName || nameParts.slice(1).join(" ") || undefined,
          name: p.contactName || undefined,
          organization_name: p.companyName || undefined,
          domain:
            p.website?.replace(/^https?:\/\//, "").split("/")[0] || undefined,
        };
      });

      // Bulk enrich via Apollo
      const apolloResults = await bulkEnrichPeople(peopleToMatch);

      // Update bucket properties with Apollo data
      bucket.properties = bucket.properties.map((prop) => {
        const apolloData = apolloResults.get(prop.id);
        if (apolloData) {
          enrichedCount++;
          const phones =
            apolloData.phone_numbers
              ?.filter((p) => p.sanitized_number || p.raw_number)
              .map((p) => p.sanitized_number || p.raw_number || "") || [];
          const emails = [
            apolloData.email,
            ...(apolloData.personal_emails || []),
          ].filter(Boolean) as string[];

          return {
            ...prop,
            enriched: true,
            enrichedPhones: phones,
            enrichedEmails: emails,
            apolloData: {
              id: apolloData.id,
              title: apolloData.title,
              linkedinUrl: apolloData.linkedin_url,
              organization: apolloData.organization,
              emailStatus: apolloData.email_status,
            },
            // Update primary fields if we got better data
            phone: phones[0] || prop.phone,
            email: emails[0] || prop.email,
          };
        } else if (toEnrich.some((e) => e.id === prop.id)) {
          failedCount++;
        }
        return prop;
      });
    } else if (enrichType === "skip_trace") {
      // Skip trace enrichment for property records
      for (const prop of toEnrich) {
        if (!prop.address || !prop.city || !prop.state) {
          failedCount++;
          continue;
        }

        try {
          const response = await fetch(
            `${request.nextUrl.origin}/api/skip-trace`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                address: prop.address,
                city: prop.city,
                state: prop.state,
                zip: prop.zip,
              }),
            },
          );

          const data = await response.json();
          if (
            data.success &&
            (data.phones?.length > 0 || data.emails?.length > 0)
          ) {
            enrichedCount++;
            const propIndex = bucket.properties!.findIndex(
              (p) => p.id === prop.id,
            );
            if (propIndex >= 0) {
              bucket.properties![propIndex] = {
                ...bucket.properties![propIndex],
                enriched: true,
                enrichedPhones:
                  data.phones?.map((p: { number: string }) => p.number) || [],
                enrichedEmails:
                  data.emails?.map((e: { email: string }) => e.email) || [],
                ownerName: data.ownerName,
              };
            }
          } else {
            failedCount++;
          }
        } catch (err) {
          console.error(
            `[Bucket Enrich] Skip trace error for ${prop.id}:`,
            err,
          );
          failedCount++;
        }

        // Rate limit
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    // Update bucket stats
    bucket.enrichedLeads = bucket.properties.filter((p) => p.enriched).length;

    // Save updated bucket
    await client.send(
      new PutObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: `buckets/${id}.json`,
        Body: JSON.stringify(bucket, null, 2),
        ContentType: "application/json",
      }),
    );

    console.log(
      `[Bucket Enrich] Complete: ${enrichedCount} enriched, ${failedCount} failed`,
    );

    return NextResponse.json({
      success: true,
      message: `Enriched ${enrichedCount} records`,
      results: {
        total: toEnrich.length,
        enriched: enrichedCount,
        failed: failedCount,
        totalEnriched: bucket.enrichedLeads,
        totalRecords: bucket.totalLeads,
      },
    });
  } catch (error) {
    console.error("[Bucket Enrich] POST error:", error);
    return NextResponse.json(
      { error: "Failed to enrich bucket" },
      { status: 500 },
    );
  }
}

// GET /api/buckets/:id/enrich - Check enrichment status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const client = getS3Client();

    if (!client) {
      return NextResponse.json(
        { error: "Storage not configured" },
        { status: 500 },
      );
    }

    // Load bucket
    const response = await client.send(
      new GetObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: `buckets/${id}.json`,
      }),
    );

    const bodyContents = await response.Body?.transformToString();
    if (!bodyContents) {
      return NextResponse.json({ error: "Bucket not found" }, { status: 404 });
    }

    const bucket: Bucket = JSON.parse(bodyContents);
    const enrichable =
      bucket.properties?.filter(
        (p) =>
          !p.enriched &&
          (p.companyName || p.contactName || p.firstName || p.address),
      ).length || 0;

    return NextResponse.json({
      bucketId: id,
      totalRecords: bucket.totalLeads,
      enrichedRecords: bucket.enrichedLeads,
      enrichableRecords: enrichable,
      apolloConfigured: !!APOLLO_API_KEY,
      skipTraceConfigured: true, // Always available via RealEstateAPI
    });
  } catch (error) {
    console.error("[Bucket Enrich] GET error:", error);
    return NextResponse.json(
      { error: "Failed to get enrichment status" },
      { status: 500 },
    );
  }
}
