/**
 * ADMIN: Push ALL Buckets to Leads Table
 *
 * This endpoint iterates through ALL buckets in DO Spaces and pushes
 * their records to the PostgreSQL leads table.
 *
 * USBizData CSV → DO Spaces Bucket → PostgreSQL Leads Table
 */
import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { randomUUID } from "crypto";

// DO Spaces configuration
const SPACES_ENDPOINT = "https://nyc3.digitaloceanspaces.com";
const SPACES_BUCKET = process.env.SPACES_BUCKET || process.env.DO_SPACES_BUCKET || "nextier";
const SPACES_KEY = process.env.SPACES_KEY || process.env.DO_SPACES_KEY || "";
const SPACES_SECRET = process.env.SPACES_SECRET || process.env.DO_SPACES_SECRET || "";

function getS3Client(): S3Client | null {
  if (!SPACES_KEY || !SPACES_SECRET) return null;
  return new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: "nyc3",
    credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
    forcePathStyle: true,
  });
}

function generateLeadId(): string {
  return `lead_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

export async function POST(request: NextRequest) {
  try {
    // Get teamId from query or use default
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId") || "thomas-borrusos-team-f4371";
    const dryRun = searchParams.get("dryRun") === "true";

    const client = getS3Client();
    if (!client) {
      return NextResponse.json({ error: "DO Spaces not configured" }, { status: 500 });
    }

    // List all bucket JSON files
    const listResponse = await client.send(new ListObjectsV2Command({
      Bucket: SPACES_BUCKET,
      Prefix: "buckets/",
    }));

    const bucketFiles = (listResponse.Contents || [])
      .filter(obj => obj.Key?.endsWith(".json") && !obj.Key.includes("_index"))
      .map(obj => obj.Key!);

    console.log(`[Push All Buckets] Found ${bucketFiles.length} bucket files`);

    let totalRecords = 0;
    let totalInserted = 0;
    let totalSkipped = 0;
    const bucketStats: { id: string; name: string; records: number; inserted: number }[] = [];

    for (const bucketKey of bucketFiles) {
      try {
        // Get bucket data
        const getResponse = await client.send(new GetObjectCommand({
          Bucket: SPACES_BUCKET,
          Key: bucketKey,
        }));

        const content = await getResponse.Body?.transformToString();
        if (!content) continue;

        const bucket = JSON.parse(content);
        const records = bucket.records || [];

        console.log(`[Push All Buckets] Processing ${bucket.name}: ${records.length} records`);

        let insertedCount = 0;

        if (!dryRun) {
          // Insert records in batches of 100
          for (let i = 0; i < records.length; i += 100) {
            const batch = records.slice(i, i + 100);
            const leadsToInsert = batch.map((record: any) => {
              const keys = record.matchingKeys || {};
              const original = record._original || {};

              // Handle USBizData "Contact Name" field - split into first/last
              let firstName = keys.firstName || "";
              let lastName = keys.lastName || "";

              if (!firstName && keys.contactName) {
                const nameParts = keys.contactName.trim().split(/\s+/);
                firstName = nameParts[0] || "";
                lastName = nameParts.slice(1).join(" ") || "";
              }

              // Get phone from multiple sources
              const phone = original.phone || original.Phone || original["Phone Number"] ||
                keys.phone || keys.cellPhone || keys.directPhone || null;

              // Get email
              const email = original.email || original.Email || original["Email Address"] ||
                keys.email || null;

              return {
                id: generateLeadId(),
                teamId,
                firstName,
                lastName,
                company: keys.companyName || original["Company Name"] || original.company || "",
                title: keys.title || original.Title || "",
                email: email || "",
                phone: phone || "",
                address: keys.address || original["Street Address"] || original.Address || "",
                city: keys.city || original.City || "",
                state: keys.state || original.State || "",
                zipCode: keys.zip || original.Zip || original["Zip Code"] || "",
                source: bucket.source || "USBizData",
                status: "new",
                pipelineStatus: phone ? "ready" : "raw",
                score: record.propertyScore || 50,
                metadata: {
                  bucketId: bucket.id,
                  bucketName: bucket.name,
                  sicCode: keys.sicCode || original["SIC Code"] || "",
                  sicDescription: keys.sicDescription || original["SIC Description"] || "",
                  employees: original.Employees || original["Number of Employees"] || null,
                  annualRevenue: original["Annual Revenue"] || original.Revenue || null,
                  county: keys.county || original.County || "",
                  areaCode: keys.areaCode || original["Area Code"] || "",
                  website: original.Website || original["Website URL"] || "",
                  contactName: keys.contactName || original["Contact Name"] || "",
                },
                customFields: {
                  originalRow: original,
                  propertyLikelihood: record.propertyLikelihood || "unknown",
                  signals: record.signals || [],
                  tags: record.tags || [],
                },
                createdAt: new Date(),
                updatedAt: new Date(),
              };
            });

            try {
              await db.insert(leads).values(leadsToInsert).onConflictDoNothing();
              insertedCount += leadsToInsert.length;
            } catch (err) {
              console.error(`[Push All Buckets] Batch insert error:`, err);
            }
          }
        }

        totalRecords += records.length;
        totalInserted += insertedCount;
        bucketStats.push({
          id: bucket.id,
          name: bucket.name,
          records: records.length,
          inserted: insertedCount,
        });

      } catch (err) {
        console.error(`[Push All Buckets] Error processing ${bucketKey}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      teamId,
      summary: {
        bucketsProcessed: bucketStats.length,
        totalRecords,
        totalInserted,
        totalSkipped: totalRecords - totalInserted,
      },
      buckets: bucketStats,
      message: dryRun
        ? `DRY RUN: Would insert ${totalRecords} leads from ${bucketStats.length} buckets`
        : `Inserted ${totalInserted} leads from ${bucketStats.length} buckets`,
    });

  } catch (error) {
    console.error("[Push All Buckets] Error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to push buckets",
    }, { status: 500 });
  }
}

// GET - Check status / dry run
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  searchParams.set("dryRun", "true");
  return POST(request);
}
