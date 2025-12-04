import { NextRequest, NextResponse } from "next/server";

const REALESTATE_API_KEY = process.env.REAL_ESTATE_API_KEY || process.env.REALESTATE_API_KEY || "";
const REALESTATE_API_URL = "https://api.realestateapi.com/v2/PropertyDetail";

// Event signals that affect campaign prioritization
export type SignalType = "ADVANCE" | "SUPPRESS" | "NEUTRAL";

export interface PropertySignal {
  propertyId: string;
  signalType: SignalType;
  signalReason: string;
  previousValue: unknown;
  newValue: unknown;
  field: string;
  detectedAt: string;
  priority: number; // 1-10, higher = more important
}

// Signal detection rules
const SIGNAL_RULES: Array<{
  field: string;
  check: (prev: unknown, curr: unknown) => SignalType | null;
  reason: (prev: unknown, curr: unknown) => string;
  priority: number;
}> = [
  // ADVANCE signals - increase campaign priority
  {
    field: "preForeclosure",
    check: (prev, curr) => (!prev && curr ? "ADVANCE" : null),
    reason: () => "Property entered pre-foreclosure",
    priority: 10,
  },
  {
    field: "foreclosure",
    check: (prev, curr) => (!prev && curr ? "ADVANCE" : null),
    reason: () => "Property in foreclosure",
    priority: 9,
  },
  {
    field: "taxLien",
    check: (prev, curr) => (!prev && curr ? "ADVANCE" : null),
    reason: () => "Tax lien filed",
    priority: 8,
  },
  {
    field: "vacant",
    check: (prev, curr) => (!prev && curr ? "ADVANCE" : null),
    reason: () => "Property became vacant",
    priority: 7,
  },
  {
    field: "estimatedValue",
    check: (prev, curr) => {
      if (!prev || !curr) return null;
      const drop = ((Number(prev) - Number(curr)) / Number(prev)) * 100;
      if (drop > 10) return "ADVANCE"; // Value dropped >10%
      return null;
    },
    reason: (prev, curr) => `Value dropped ${Math.round(((Number(prev) - Number(curr)) / Number(prev)) * 100)}%`,
    priority: 6,
  },
  {
    field: "daysOnMarket",
    check: (prev, curr) => (Number(curr) > 90 && Number(prev) <= 90 ? "ADVANCE" : null),
    reason: () => "On market > 90 days (stale listing)",
    priority: 5,
  },
  {
    field: "absenteeOwner",
    check: (prev, curr) => (!prev && curr ? "ADVANCE" : null),
    reason: () => "Owner became absentee",
    priority: 4,
  },

  // SUPPRESS signals - decrease priority or remove
  {
    field: "sold",
    check: (prev, curr) => (!prev && curr ? "SUPPRESS" : null),
    reason: () => "Property was sold",
    priority: 10,
  },
  {
    field: "ownerName",
    check: (prev, curr) => (prev && curr && prev !== curr ? "SUPPRESS" : null),
    reason: () => "Owner changed (likely sold)",
    priority: 9,
  },
  {
    field: "mlsActive",
    check: (prev, curr) => (!prev && curr ? "SUPPRESS" : null),
    reason: () => "Listed on MLS (has agent)",
    priority: 7,
  },
  {
    field: "preForeclosure",
    check: (prev, curr) => (prev && !curr ? "SUPPRESS" : null),
    reason: () => "Pre-foreclosure resolved",
    priority: 5,
  },
  {
    field: "estimatedValue",
    check: (prev, curr) => {
      if (!prev || !curr) return null;
      const increase = ((Number(curr) - Number(prev)) / Number(prev)) * 100;
      if (increase > 20) return "SUPPRESS"; // Value increased >20% (less motivated)
      return null;
    },
    reason: (prev, curr) =>
      `Value increased ${Math.round(((Number(curr) - Number(prev)) / Number(prev)) * 100)}% (less motivated)`,
    priority: 4,
  },
];

// Detect signals by comparing previous vs current property data
function detectSignals(
  propertyId: string,
  previous: Record<string, unknown>,
  current: Record<string, unknown>
): PropertySignal[] {
  const signals: PropertySignal[] = [];

  for (const rule of SIGNAL_RULES) {
    const prevValue = previous[rule.field];
    const currValue = current[rule.field];

    const signalType = rule.check(prevValue, currValue);

    if (signalType) {
      signals.push({
        propertyId,
        signalType,
        signalReason: rule.reason(prevValue, currValue),
        previousValue: prevValue,
        newValue: currValue,
        field: rule.field,
        detectedAt: new Date().toISOString(),
        priority: rule.priority,
      });
    }
  }

  return signals;
}

// POST - Check a batch of properties for changes (called by cron job)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { propertyIds, previousData } = body;

    if (!propertyIds || !Array.isArray(propertyIds) || propertyIds.length === 0) {
      return NextResponse.json({ error: "propertyIds array required" }, { status: 400 });
    }

    if (!previousData || typeof previousData !== "object") {
      return NextResponse.json({ error: "previousData object required (propertyId -> data)" }, { status: 400 });
    }

    // Limit batch size
    const batchIds = propertyIds.slice(0, 250);
    const allSignals: PropertySignal[] = [];
    const advanceIds: string[] = [];
    const suppressIds: string[] = [];

    console.log(`[Monitor] Checking ${batchIds.length} properties for changes...`);

    // Fetch current data for each property
    const concurrency = 10;
    for (let i = 0; i < batchIds.length; i += concurrency) {
      const batch = batchIds.slice(i, i + concurrency);

      const results = await Promise.all(
        batch.map(async (id: string) => {
          try {
            const response = await fetch(REALESTATE_API_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": REALESTATE_API_KEY,
              },
              body: JSON.stringify({ id }),
            });

            if (!response.ok) return null;

            const data = await response.json();
            return { id, data: data.data || data };
          } catch {
            return null;
          }
        })
      );

      // Compare and detect signals
      for (const result of results) {
        if (!result) continue;

        const prevData = previousData[result.id];
        if (!prevData) continue;

        const signals = detectSignals(result.id, prevData, result.data);
        allSignals.push(...signals);

        // Categorize
        if (signals.some((s) => s.signalType === "ADVANCE")) {
          advanceIds.push(result.id);
        }
        if (signals.some((s) => s.signalType === "SUPPRESS")) {
          suppressIds.push(result.id);
        }
      }

      // Rate limit
      if (i + concurrency < batchIds.length) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    // Sort signals by priority
    allSignals.sort((a, b) => b.priority - a.priority);

    console.log(
      `[Monitor] Complete: ${allSignals.length} signals detected, ${advanceIds.length} ADVANCE, ${suppressIds.length} SUPPRESS`
    );

    return NextResponse.json({
      success: true,
      checked: batchIds.length,
      signals: allSignals,
      summary: {
        totalSignals: allSignals.length,
        advanceCount: advanceIds.length,
        suppressCount: suppressIds.length,
        advanceIds,
        suppressIds,
      },
      // For campaign queue updates
      actions: {
        increasePriority: advanceIds,
        decreasePriority: suppressIds,
      },
    });
  } catch (error: unknown) {
    console.error("[Monitor] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - Get monitoring status/stats
export async function GET() {
  return NextResponse.json({
    status: "ready",
    rules: SIGNAL_RULES.map((r) => ({
      field: r.field,
      priority: r.priority,
    })),
    description: "POST with propertyIds and previousData to detect changes",
    example: {
      propertyIds: ["12345", "67890"],
      previousData: {
        "12345": { preForeclosure: false, estimatedValue: 500000 },
        "67890": { ownerName: "John Smith" },
      },
    },
  });
}
