import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { sql, eq, like, or } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

/**
 * Sector Stats API
 * Returns REAL counts from:
 * 1. businesses table by SIC code
 * 2. DO Spaces buckets for geographic breakdowns
 */

// DO Spaces configuration - check multiple env var names for compatibility
const SPACES_ENDPOINT = "https://nyc3.digitaloceanspaces.com";
const SPACES_BUCKET = process.env.SPACES_BUCKET || process.env.DO_SPACES_BUCKET || "nextier";
const SPACES_KEY = process.env.SPACES_KEY || process.env.DO_SPACES_KEY || "";
const SPACES_SECRET = process.env.SPACES_SECRET || process.env.DO_SPACES_SECRET || "";

function getS3Client(): S3Client | null {
  if (!SPACES_KEY || !SPACES_SECRET) {
    return null;
  }
  return new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: "nyc3",
    credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
  });
}

// Geographic sector definitions for NY
const GEOGRAPHIC_SECTORS: Record<string, { name: string; state: string; counties?: string[] }> = {
  ny_metro: {
    name: "NYC Metro Area",
    state: "NY",
    counties: ["New York", "Kings", "Queens", "Bronx", "Richmond", "Nassau", "Suffolk", "Westchester"],
  },
  ny_upstate: {
    name: "Upstate New York",
    state: "NY",
    // Exclude metro counties
  },
  bronx: { name: "Bronx County", state: "NY", counties: ["Bronx"] },
  brooklyn: { name: "Brooklyn (Kings County)", state: "NY", counties: ["Kings"] },
  manhattan: { name: "Manhattan (New York County)", state: "NY", counties: ["New York"] },
  queens: { name: "Queens County", state: "NY", counties: ["Queens"] },
  staten_island: { name: "Staten Island (Richmond County)", state: "NY", counties: ["Richmond"] },
};

// B2B Sectors with SIC code prefixes
const BUSINESS_SECTORS: Record<
  string,
  { name: string; sicPrefixes: string[] }
> = {
  // Your exact lists
  hotels_motels: {
    name: "Hotels & Motels",
    sicPrefixes: ["7011", "7021"],
  },
  campgrounds_rv: {
    name: "Campgrounds & RV Parks",
    sicPrefixes: ["7032", "7033"],
  },
  trucking: {
    name: "Trucking Companies",
    sicPrefixes: ["4212", "4213", "4214", "4215"],
  },
  us_schools: {
    name: "US Schools Database",
    sicPrefixes: ["8211"],
  },
  // Standard sectors
  professional_services: {
    name: "Professional Services",
    sicPrefixes: ["8111", "8721", "8742", "8748"],
  },
  healthcare: {
    name: "Healthcare & Medical",
    sicPrefixes: [
      "8011",
      "8021",
      "8031",
      "8041",
      "8042",
      "8049",
      "8051",
      "8052",
      "8059",
      "8062",
      "8063",
      "8069",
    ],
  },
  restaurants_food: {
    name: "Restaurants & Food Service",
    sicPrefixes: ["5812", "5813", "5814"],
  },
  retail: {
    name: "Retail & Stores",
    sicPrefixes: ["52", "53", "54", "55", "56", "57", "58", "59"],
  },
  manufacturing: {
    name: "Manufacturing",
    sicPrefixes: [
      "20",
      "21",
      "22",
      "23",
      "24",
      "25",
      "26",
      "27",
      "28",
      "29",
      "30",
      "31",
      "32",
      "33",
      "34",
      "35",
      "36",
      "37",
      "38",
      "39",
    ],
  },
  transportation: {
    name: "Transportation & Logistics",
    sicPrefixes: ["40", "41", "42", "43", "44", "45", "46", "47"],
  },
  education_training: {
    name: "Education & Training Centers",
    sicPrefixes: ["8221", "8222", "8231", "8243", "8244", "8249", "8299"],
  },
  automotive: {
    name: "Automotive",
    sicPrefixes: [
      "5511",
      "5521",
      "5531",
      "5541",
      "5551",
      "5561",
      "5571",
      "5599",
      "7532",
      "7533",
      "7534",
      "7535",
      "7536",
      "7537",
      "7538",
      "7539",
    ],
  },
  financial_services: {
    name: "Financial Services",
    sicPrefixes: ["60", "61", "62", "63", "64", "65", "67"],
  },
  real_estate_biz: {
    name: "Real Estate Businesses",
    sicPrefixes: [
      "6512",
      "6513",
      "6514",
      "6515",
      "6517",
      "6519",
      "6531",
      "6541",
      "6552",
      "6553",
    ],
  },
  construction: {
    name: "Construction & Contractors",
    sicPrefixes: ["15", "16", "17"],
  },
};

// Helper to read bucket index from DO Spaces
async function getBucketGeographicStats(s3: S3Client | null): Promise<{
  byCounty: Record<string, number>;
  byState: Record<string, number>;
  totalFromBuckets: number;
}> {
  const result = { byCounty: {} as Record<string, number>, byState: {} as Record<string, number>, totalFromBuckets: 0 };

  if (!s3) return result;

  try {
    // List all bucket indexes
    const listCommand = new ListObjectsV2Command({
      Bucket: SPACES_BUCKET,
      Prefix: "buckets/",
      Delimiter: "/",
    });
    const listResult = await s3.send(listCommand);
    const bucketPrefixes = listResult.CommonPrefixes || [];

    // Read each bucket's index.json
    for (const prefix of bucketPrefixes) {
      if (!prefix.Prefix) continue;

      try {
        const indexCommand = new GetObjectCommand({
          Bucket: SPACES_BUCKET,
          Key: `${prefix.Prefix}index.json`,
        });
        const indexResult = await s3.send(indexCommand);
        const indexBody = await indexResult.Body?.transformToString();
        if (!indexBody) continue;

        const index = JSON.parse(indexBody);
        result.totalFromBuckets += index.totalLeads || 0;

        // Aggregate by state
        if (index.indexes?.byState) {
          for (const [state, ids] of Object.entries(index.indexes.byState)) {
            const count = Array.isArray(ids) ? ids.length : 0;
            result.byState[state] = (result.byState[state] || 0) + count;
          }
        }

        // Aggregate by county (if available) or by city fallback
        if (index.indexes?.byCounty) {
          for (const [county, ids] of Object.entries(index.indexes.byCounty)) {
            const count = Array.isArray(ids) ? ids.length : 0;
            result.byCounty[county] = (result.byCounty[county] || 0) + count;
          }
        }
      } catch (bucketError) {
        // Skip buckets without index.json
        continue;
      }
    }
  } catch (error) {
    console.error("[Sector Stats] Error reading bucket stats:", error);
  }

  return result;
}

export async function GET(): Promise<NextResponse> {
  try {
    // Try to get userId but don't fail if Clerk middleware isn't configured
    let userId: string | null = null;
    try {
      const authResult = await auth();
      userId = authResult.userId;
    } catch (authError) {
      console.log("[Sector Stats] Auth not available, proceeding without user filter");
    }
    const s3 = getS3Client();

    // Get bucket stats first (works without DB)
    const bucketStats = await getBucketGeographicStats(s3);

    // If no DB, return bucket-only stats
    if (!db) {
      console.log("[Sector Stats] No database - returning bucket-only stats");

      // Calculate geographic sector stats from bucket data only
      const geoSectorStats: Record<string, {
        sectorId: string;
        name: string;
        totalRecords: number;
        enriched: number;
      }> = {};

      const metroCounties = ["New York", "Kings", "Queens", "Bronx", "Richmond", "Nassau", "Suffolk", "Westchester"];

      for (const [sectorId, sector] of Object.entries(GEOGRAPHIC_SECTORS)) {
        let count = 0;
        if (sector.counties) {
          for (const county of sector.counties) {
            count += bucketStats.byCounty[county] || 0;
            count += bucketStats.byCounty[`${county} County`] || 0;
          }
        } else if (sectorId === "ny_upstate") {
          const nyTotal = bucketStats.byState["NY"] || 0;
          let metroTotal = 0;
          for (const county of metroCounties) {
            metroTotal += bucketStats.byCounty[county] || 0;
            metroTotal += bucketStats.byCounty[`${county} County`] || 0;
          }
          count = Math.max(0, nyTotal - metroTotal);
        }

        geoSectorStats[sectorId] = {
          sectorId,
          name: sector.name,
          totalRecords: count,
          enriched: 0,
        };
      }

      return NextResponse.json({
        sectors: geoSectorStats,
        geoSectors: geoSectorStats,
        topSicCodes: [],
        bucketStats: {
          byState: bucketStats.byState,
          byCounty: bucketStats.byCounty,
          totalFromBuckets: bucketStats.totalFromBuckets,
        },
        totals: {
          totalRecords: bucketStats.totalFromBuckets,
          totalFromDB: 0,
          totalFromBuckets: bucketStats.totalFromBuckets,
          sectorsWithData: Object.values(geoSectorStats).filter(s => s.totalRecords > 0).length,
          source: "buckets_only",
        },
      });
    }

    // bucketStats already fetched above, reuse it for the DB-present case

    // Get total count from businesses table
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(businesses)
      .where(userId ? eq(businesses.userId, userId) : sql`1=1`);

    const totalRecords = totalResult?.count || 0;

    // Get counts by SIC code prefix for each sector
    const sectorStats: Record<
      string,
      {
        sectorId: string;
        name: string;
        totalRecords: number;
        withPhone: number;
        withEmail: number;
        withOwner: number;
        enriched: number;
      }
    > = {};

    // Query each sector's counts
    for (const [sectorId, sector] of Object.entries(BUSINESS_SECTORS)) {
      // Build OR conditions for all SIC prefixes
      const sicConditions = sector.sicPrefixes.map(
        (prefix) => sql`${businesses.sicCode} LIKE ${prefix + "%"}`,
      );

      const userCondition = userId ? eq(businesses.userId, userId) : sql`1=1`;

      // Get count for this sector
      const [countResult] = await db
        .select({
          total: sql<number>`count(*)`,
          withPhone: sql<number>`count(CASE WHEN ${businesses.phone} IS NOT NULL AND ${businesses.phone} != '' THEN 1 END)`,
          withEmail: sql<number>`count(CASE WHEN ${businesses.email} IS NOT NULL AND ${businesses.email} != '' THEN 1 END)`,
          withOwner: sql<number>`count(CASE WHEN ${businesses.ownerName} IS NOT NULL AND ${businesses.ownerName} != '' THEN 1 END)`,
          enriched: sql<number>`count(CASE WHEN ${businesses.apolloMatched} = true OR ${businesses.skipTraced} = true THEN 1 END)`,
        })
        .from(businesses)
        .where(
          sql`(${sql.join(sicConditions, sql` OR `)}) AND ${userCondition}`,
        );

      sectorStats[sectorId] = {
        sectorId,
        name: sector.name,
        totalRecords: countResult?.total || 0,
        withPhone: countResult?.withPhone || 0,
        withEmail: countResult?.withEmail || 0,
        withOwner: countResult?.withOwner || 0,
        enriched: countResult?.enriched || 0,
      };
    }

    // Also get top SIC codes with counts
    const topSicCodes = await db
      .select({
        sicCode: businesses.sicCode,
        sicDescription: businesses.sicDescription,
        count: sql<number>`count(*)`,
      })
      .from(businesses)
      .where(userId ? eq(businesses.userId, userId) : sql`1=1`)
      .groupBy(businesses.sicCode, businesses.sicDescription)
      .orderBy(sql`count(*) DESC`)
      .limit(50);

    // Calculate geographic sector stats from bucket data (using bucketStats from above)
    const geoSectorStats: Record<string, {
      sectorId: string;
      name: string;
      totalRecords: number;
      enriched: number;
    }> = {};

    // NY Metro counties for exclusion in upstate
    const metroCounties = ["New York", "Kings", "Queens", "Bronx", "Richmond", "Nassau", "Suffolk", "Westchester"];

    for (const [sectorId, sector] of Object.entries(GEOGRAPHIC_SECTORS)) {
      let count = 0;

      if (sector.counties) {
        // Sum counts for specific counties
        for (const county of sector.counties) {
          count += bucketStats.byCounty[county] || 0;
          // Also check variations
          count += bucketStats.byCounty[`${county} County`] || 0;
        }
      } else if (sectorId === "ny_upstate") {
        // Upstate = NY total minus metro counties
        const nyTotal = bucketStats.byState["NY"] || 0;
        let metroTotal = 0;
        for (const county of metroCounties) {
          metroTotal += bucketStats.byCounty[county] || 0;
          metroTotal += bucketStats.byCounty[`${county} County`] || 0;
        }
        count = Math.max(0, nyTotal - metroTotal);
      }

      geoSectorStats[sectorId] = {
        sectorId,
        name: sector.name,
        totalRecords: count,
        enriched: 0, // Would need to track enrichment in bucket index
      };
    }

    // Merge geo stats into sector stats
    const allSectorStats = { ...sectorStats, ...geoSectorStats };

    return NextResponse.json({
      sectors: allSectorStats,
      geoSectors: geoSectorStats,
      topSicCodes: topSicCodes.map((s) => ({
        sicCode: s.sicCode,
        sicDescription: s.sicDescription,
        count: s.count,
      })),
      bucketStats: {
        byState: bucketStats.byState,
        byCounty: bucketStats.byCounty,
        totalFromBuckets: bucketStats.totalFromBuckets,
      },
      totals: {
        totalRecords: totalRecords + bucketStats.totalFromBuckets,
        totalFromDB: totalRecords,
        totalFromBuckets: bucketStats.totalFromBuckets,
        sectorsWithData: Object.values(allSectorStats).filter(
          (s) => s.totalRecords > 0,
        ).length,
        source: "database+buckets",
      },
    });
  } catch (error) {
    console.error("[Sector Stats] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to compute sector stats",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
