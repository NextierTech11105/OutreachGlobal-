import { NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";

/**
 * Sector Stats API
 * Aggregates bucket records by SIC code into B2B sectors
 */

const SPACES_ENDPOINT = "https://nyc3.digitaloceanspaces.com";
const SPACES_BUCKET = "nextier";
const SPACES_KEY = process.env.DO_SPACES_KEY || "";
const SPACES_SECRET = process.env.DO_SPACES_SECRET || "";

// B2B Sectors with SIC code prefixes
const BUSINESS_SECTORS: Record<string, { name: string; sicPrefixes: string[] }> = {
  professional_services: {
    name: "Professional Services",
    sicPrefixes: ["8111", "8721", "8742", "8748", "81", "87"],
  },
  healthcare: {
    name: "Healthcare & Medical",
    sicPrefixes: ["8011", "8021", "8031", "8041", "8042", "8049", "8051", "8052", "8059", "8062", "8063", "8069", "80"],
  },
  restaurants_food: {
    name: "Restaurants & Food Service",
    sicPrefixes: ["5812", "5813", "5814", "581"],
  },
  retail: {
    name: "Retail & Stores",
    sicPrefixes: ["52", "53", "54", "55", "56", "57", "58", "59"],
  },
  manufacturing: {
    name: "Manufacturing",
    sicPrefixes: ["20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39"],
  },
  transportation: {
    name: "Transportation & Logistics",
    sicPrefixes: ["40", "41", "42", "43", "44", "45", "46", "47"],
  },
  hospitality: {
    name: "Hotels & Hospitality",
    sicPrefixes: ["7011", "7021", "7032", "7033", "7041", "701", "702", "703"],
  },
  education: {
    name: "Education & Training",
    sicPrefixes: ["8211", "8221", "8222", "8231", "8243", "8244", "8249", "8299", "82"],
  },
  automotive: {
    name: "Automotive",
    sicPrefixes: ["5511", "5521", "5531", "5541", "5551", "5561", "5571", "5599", "7532", "7533", "7534", "7535", "7536", "7537", "7538", "7539", "551", "552", "553", "554", "555", "753"],
  },
  financial_services: {
    name: "Financial Services",
    sicPrefixes: ["60", "61", "62", "63", "64", "65", "67"],
  },
  real_estate_biz: {
    name: "Real Estate Businesses",
    sicPrefixes: ["6512", "6513", "6514", "6515", "6517", "6519", "6531", "6541", "6552", "6553", "651", "653", "654", "655"],
  },
  construction: {
    name: "Construction & Contractors",
    sicPrefixes: ["15", "16", "17"],
  },
};

function getS3Client(): S3Client | null {
  if (!SPACES_KEY || !SPACES_SECRET) return null;
  return new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: "nyc3",
    credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
  });
}

function matchSICToSector(sicCode: string | undefined | null): string | null {
  if (!sicCode) return null;
  const sic = sicCode.toString().trim();

  for (const [sectorId, sector] of Object.entries(BUSINESS_SECTORS)) {
    for (const prefix of sector.sicPrefixes) {
      if (sic.startsWith(prefix)) {
        return sectorId;
      }
    }
  }
  return null;
}

export async function GET(): Promise<NextResponse> {
  const client = getS3Client();
  if (!client) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
  }

  try {
    // Initialize sector stats
    const sectorStats: Record<string, {
      sectorId: string;
      name: string;
      totalRecords: number;
      withPhone: number;
      withEmail: number;
      enriched: number;
    }> = {};

    for (const [id, sector] of Object.entries(BUSINESS_SECTORS)) {
      sectorStats[id] = {
        sectorId: id,
        name: sector.name,
        totalRecords: 0,
        withPhone: 0,
        withEmail: 0,
        enriched: 0,
      };
    }

    // List all buckets
    const listResponse = await client.send(
      new ListObjectsV2Command({
        Bucket: SPACES_BUCKET,
        Prefix: "buckets/",
        MaxKeys: 1000,
      })
    );

    const bucketKeys = listResponse.Contents?.filter(
      (obj) => obj.Key?.endsWith(".json")
    ).map((obj) => obj.Key!) || [];

    console.log(`[Sector Stats] Scanning ${bucketKeys.length} buckets...`);

    // Sample up to 20 buckets for stats (reduced for speed)
    const sampleSize = Math.min(20, bucketKeys.length);
    const sampledKeys = bucketKeys.slice(0, sampleSize);

    // Process buckets in parallel for speed
    const bucketPromises = sampledKeys.map(async (key) => {
      try {
        const response = await client.send(
          new GetObjectCommand({ Bucket: SPACES_BUCKET, Key: key })
        );
        const content = await response.Body?.transformToString();
        if (!content) return null;

        const bucket = JSON.parse(content);
        // Handle records, leads, or properties format
        const records = bucket.records || bucket.leads || bucket.properties || [];
        return { key, records, totalLeads: bucket.totalLeads || records.length };
      } catch (err) {
        console.error(`[Sector Stats] Error reading ${key}:`, err);
        return null;
      }
    });

    const bucketResults = (await Promise.all(bucketPromises)).filter(Boolean);

    for (const result of bucketResults) {
      if (!result) continue;
      const records = result.records;

      for (const record of records) {
        const sicCode = record.matchingKeys?.sicCode || record._original?.["SIC Code"];
        const sectorId = matchSICToSector(sicCode);

        if (sectorId && sectorStats[sectorId]) {
          sectorStats[sectorId].totalRecords++;

          const original = record._original || {};
          const flags = record.flags || {};

          if (flags.hasPhone || original["Phone"]) {
            sectorStats[sectorId].withPhone++;
          }
          if (flags.hasEmail || original["Email"]) {
            sectorStats[sectorId].withEmail++;
          }
          if (record.enrichment?.status === "success") {
            sectorStats[sectorId].enriched++;
          }
        }
      }
    }

    // Extrapolate if we sampled
    if (sampleSize < bucketKeys.length) {
      const multiplier = bucketKeys.length / sampleSize;
      for (const stat of Object.values(sectorStats)) {
        stat.totalRecords = Math.round(stat.totalRecords * multiplier);
        stat.withPhone = Math.round(stat.withPhone * multiplier);
        stat.withEmail = Math.round(stat.withEmail * multiplier);
        stat.enriched = Math.round(stat.enriched * multiplier);
      }
    }

    // Calculate totals
    const totals = {
      totalBuckets: bucketKeys.length,
      sampledBuckets: sampleSize,
      totalRecords: Object.values(sectorStats).reduce((sum, s) => sum + s.totalRecords, 0),
    };

    return NextResponse.json({
      sectors: sectorStats,
      totals,
      source: "SIC code aggregation",
    });
  } catch (error) {
    console.error("[Sector Stats] Error:", error);
    return NextResponse.json({ error: "Failed to compute sector stats" }, { status: 500 });
  }
}
