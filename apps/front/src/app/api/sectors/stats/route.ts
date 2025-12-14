import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { sql, eq, like, or } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

/**
 * Sector Stats API
 * Returns REAL counts from the businesses table by SIC code
 */

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

export async function GET(): Promise<NextResponse> {
  try {
    const { userId } = await auth();

    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 },
      );
    }

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

    return NextResponse.json({
      sectors: sectorStats,
      topSicCodes: topSicCodes.map((s) => ({
        sicCode: s.sicCode,
        sicDescription: s.sicDescription,
        count: s.count,
      })),
      totals: {
        totalRecords,
        sectorsWithData: Object.values(sectorStats).filter(
          (s) => s.totalRecords > 0,
        ).length,
        source: "database",
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
