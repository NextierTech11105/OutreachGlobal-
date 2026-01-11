import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { sql, eq, isNotNull } from "drizzle-orm";
import { requireTenantContext } from "@/lib/api-auth";

/**
 * GET /api/territories
 *
 * Returns territories aggregated from businesses by state
 */
export async function GET() {
  try {
    const { userId } = await requireTenantContext();

    // Aggregate businesses by state
    const stateStats = await db
      .select({
        state: businesses.state,
        companyCount: sql<number>`count(*)`,
        smsReadyCount: sql<number>`count(*) filter (where ${businesses.enrichmentStatus} = 'sms_ready')`,
        avgScore: sql<number>`round(avg(${businesses.score}))`,
      })
      .from(businesses)
      .where(eq(businesses.userId, userId))
      .groupBy(businesses.state)
      .having(isNotNull(businesses.state));

    // Map states to regions
    const regionMap: Record<string, string> = {
      // Northeast
      ME: "Northeast",
      NH: "Northeast",
      VT: "Northeast",
      MA: "Northeast",
      RI: "Northeast",
      CT: "Northeast",
      NY: "Northeast",
      NJ: "Northeast",
      PA: "Northeast",
      // Southeast
      DE: "Southeast",
      MD: "Southeast",
      VA: "Southeast",
      WV: "Southeast",
      NC: "Southeast",
      SC: "Southeast",
      GA: "Southeast",
      FL: "Southeast",
      KY: "Southeast",
      TN: "Southeast",
      AL: "Southeast",
      MS: "Southeast",
      AR: "Southeast",
      LA: "Southeast",
      // Midwest
      OH: "Midwest",
      MI: "Midwest",
      IN: "Midwest",
      IL: "Midwest",
      WI: "Midwest",
      MN: "Midwest",
      IA: "Midwest",
      MO: "Midwest",
      ND: "Midwest",
      SD: "Midwest",
      NE: "Midwest",
      KS: "Midwest",
      // Southwest
      TX: "Southwest",
      OK: "Southwest",
      NM: "Southwest",
      AZ: "Southwest",
      // West
      CO: "West",
      WY: "West",
      MT: "West",
      ID: "West",
      UT: "West",
      NV: "West",
      WA: "West",
      OR: "West",
      CA: "West",
      AK: "West",
      HI: "West",
    };

    // Group states into territories by region
    const territoriesMap = new Map<
      string,
      {
        name: string;
        states: string[];
        companyCount: number;
        smsReadyCount: number;
        avgScore: number;
      }
    >();

    for (const stat of stateStats) {
      if (!stat.state) continue;

      const stateCode = stat.state.toUpperCase().trim();
      const region = regionMap[stateCode] || "Other";

      if (!territoriesMap.has(region)) {
        territoriesMap.set(region, {
          name: region,
          states: [],
          companyCount: 0,
          smsReadyCount: 0,
          avgScore: 0,
        });
      }

      const territory = territoriesMap.get(region)!;
      if (!territory.states.includes(stateCode)) {
        territory.states.push(stateCode);
      }
      territory.companyCount += Number(stat.companyCount) || 0;
      territory.smsReadyCount += Number(stat.smsReadyCount) || 0;
      // Running average
      territory.avgScore = Math.round(
        (territory.avgScore * (territory.states.length - 1) +
          (Number(stat.avgScore) || 0)) /
          territory.states.length,
      );
    }

    // Convert to array and sort by company count
    const territories = Array.from(territoriesMap.values())
      .map((t, i) => ({
        id: `territory-${i + 1}`,
        ...t,
        states: t.states.sort(),
      }))
      .sort((a, b) => b.companyCount - a.companyCount);

    // Summary
    const totalCompanies = territories.reduce(
      (sum, t) => sum + t.companyCount,
      0,
    );
    const totalSmsReady = territories.reduce(
      (sum, t) => sum + t.smsReadyCount,
      0,
    );

    return NextResponse.json({
      success: true,
      territories,
      summary: {
        totalTerritories: territories.length,
        totalCompanies,
        totalSmsReady,
        totalStates: territories.reduce((sum, t) => sum + t.states.length, 0),
      },
    });
  } catch (error) {
    console.error("[Territories API] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch territories",
      },
      { status: 500 },
    );
  }
}
