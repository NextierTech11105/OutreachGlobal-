import { NextRequest, NextResponse } from "next/server";

const REALESTATE_API_KEY = process.env.REAL_ESTATE_API_KEY || process.env.REALESTATE_API_KEY || "";
const REALESTATE_API_URL = "https://api.realestateapi.com/v2/PropertyDetail";
const SKIP_TRACE_URL = "https://api.realestateapi.com/v2/SkipTrace";

// Daily usage tracking for batch limits (5,000/day)
const dailyUsage = new Map<string, { detail: number; skipTrace: number }>();
const DAILY_LIMIT = 5000;

function getTodayUsage(): { detail: number; skipTrace: number; date: string; remaining: number } {
  const today = new Date().toISOString().split("T")[0];
  const usage = dailyUsage.get(today) || { detail: 0, skipTrace: 0 };
  return { ...usage, date: today, remaining: DAILY_LIMIT - usage.detail };
}

function incrementUsage(type: "detail" | "skipTrace", count: number = 1) {
  const today = new Date().toISOString().split("T")[0];
  const usage = dailyUsage.get(today) || { detail: 0, skipTrace: 0 };
  usage[type] += count;
  dailyUsage.set(today, usage);
}

// Skip trace a property after detail fetch
async function performSkipTrace(propertyId: string): Promise<{
  phones: string[];
  emails: string[];
  ownerName?: string;
  mailingAddress?: string;
} | null> {
  try {
    const response = await fetch(SKIP_TRACE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify({ id: propertyId }),
    });

    if (!response.ok) {
      console.error("[Skip Trace] API error:", response.status);
      return null;
    }

    const data = await response.json();
    const result = data.data || data;

    incrementUsage("skipTrace");

    return {
      phones: (result.phones || []).map((p: { number?: string } | string) =>
        typeof p === "string" ? p : p.number
      ).filter(Boolean),
      emails: (result.emails || []).map((e: { email?: string } | string) =>
        typeof e === "string" ? e : e.email
      ).filter(Boolean),
      ownerName: result.ownerName || result.name,
      mailingAddress: result.mailingAddress || result.mailing_address,
    };
  } catch (error) {
    console.error("[Skip Trace] Error:", error);
    return null;
  }
}

// GET single property detail with optional auto skip trace
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const autoSkipTrace = searchParams.get("skipTrace") !== "false";
    const checkUsage = searchParams.get("usage") === "true";

    // Check usage only
    if (checkUsage) {
      return NextResponse.json({ success: true, usage: getTodayUsage() });
    }

    if (!id) {
      return NextResponse.json({ error: "Property ID required" }, { status: 400 });
    }

    const usage = getTodayUsage();
    if (usage.remaining <= 0) {
      return NextResponse.json({ error: "Daily limit reached", usage }, { status: 429 });
    }

    const response = await fetch(REALESTATE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify({ id }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "Failed to get property detail" },
        { status: response.status }
      );
    }

    incrementUsage("detail");
    const property = data.data || data;

    // Auto skip trace after detail fetch
    if (autoSkipTrace && property.id) {
      const skipTraceData = await performSkipTrace(property.id);
      if (skipTraceData) {
        property.phones = skipTraceData.phones;
        property.emails = skipTraceData.emails;
        property.ownerName = skipTraceData.ownerName || property.ownerName;
        property.mailingAddress = skipTraceData.mailingAddress;
        property.skipTracedAt = new Date().toISOString();
      }
    }

    return NextResponse.json({ success: true, property, usage: getTodayUsage() });
  } catch (error: any) {
    console.error("Property detail error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST property details - batch processing with auto skip trace
// Limits: 250 per batch, 2K micro-campaign block, 5K per phone number per day
const BATCH_SIZE = 250;
const MICRO_CAMPAIGN_LIMIT = 2000;
const PER_NUMBER_DAILY_LIMIT = 5000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ids, autoSkipTrace = true, phoneNumberId } = body;

    // Support single id or array of ids
    let idList: string[] = [];
    if (id) {
      idList = [String(id)];
    } else if (ids && Array.isArray(ids)) {
      idList = ids.map(String);
    }

    if (idList.length === 0) {
      return NextResponse.json({ error: "id or ids required" }, { status: 400 });
    }

    const usage = getTodayUsage();

    // If single ID, return single result with skip trace
    if (idList.length === 1) {
      if (usage.remaining <= 0) {
        return NextResponse.json({ error: "Daily limit reached", usage }, { status: 429 });
      }

      const response = await fetch(REALESTATE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": REALESTATE_API_KEY,
        },
        body: JSON.stringify({ id: idList[0] }),
      });

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { error: data.message || "Failed to get property detail" },
          { status: response.status }
        );
      }

      incrementUsage("detail");
      const property = data.data || data;

      // Auto skip trace after detail (ALWAYS before SMS)
      if (autoSkipTrace && property.id) {
        const skipTraceData = await performSkipTrace(property.id);
        if (skipTraceData) {
          property.phones = skipTraceData.phones;
          property.emails = skipTraceData.emails;
          property.ownerName = skipTraceData.ownerName || property.ownerName;
          property.mailingAddress = skipTraceData.mailingAddress;
          property.skipTracedAt = new Date().toISOString();
          property.skipTraceCost = skipTraceData.phones.length > 0 ? 0.05 : 0;
        }
      }

      return NextResponse.json({ success: true, property, usage: getTodayUsage() });
    }

    // BATCH PROCESSING: 250 per batch, stop at 2K micro-campaign block
    const maxToProcess = Math.min(idList.length, MICRO_CAMPAIGN_LIMIT, usage.remaining);
    const batchIds = idList.slice(0, Math.min(BATCH_SIZE, maxToProcess));

    console.log(`[Property Detail] Processing batch: ${batchIds.length} of ${idList.length} (max ${maxToProcess})`);

    const results: any[] = [];
    const errors: string[] = [];
    let totalSkipTraceCost = 0;

    // Fetch details in parallel with concurrency limit
    const concurrency = 10;
    for (let i = 0; i < batchIds.length; i += concurrency) {
      const batch = batchIds.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(async (propId: string) => {
          try {
            const response = await fetch(REALESTATE_API_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": REALESTATE_API_KEY,
              },
              body: JSON.stringify({ id: String(propId) }),
            });

            if (!response.ok) {
              errors.push(`${propId}: ${response.status}`);
              return null;
            }

            const data = await response.json();
            incrementUsage("detail");
            const property = data.data || data;

            // Auto skip trace after each detail fetch
            if (autoSkipTrace && property.id) {
              const skipTraceData = await performSkipTrace(property.id);
              if (skipTraceData) {
                property.phones = skipTraceData.phones;
                property.emails = skipTraceData.emails;
                property.ownerName = skipTraceData.ownerName || property.ownerName;
                property.mailingAddress = skipTraceData.mailingAddress;
                property.skipTracedAt = new Date().toISOString();
                property.skipTraceCost = skipTraceData.phones.length > 0 ? 0.05 : 0;
                totalSkipTraceCost += property.skipTraceCost;
              }
            }

            return property;
          } catch (err: any) {
            errors.push(`${propId}: ${err.message}`);
            return null;
          }
        })
      );

      results.push(...batchResults.filter(Boolean));

      // Small delay between batches to avoid rate limits
      if (i + concurrency < batchIds.length) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    const updatedUsage = getTodayUsage();
    const remainingIds = idList.slice(batchIds.length);
    const hitMicroCampaignLimit = results.length >= MICRO_CAMPAIGN_LIMIT;

    return NextResponse.json({
      success: true,
      results,
      stats: {
        processed: results.length,
        withPhones: results.filter((r) => r.phones && r.phones.length > 0).length,
        withEmails: results.filter((r) => r.emails && r.emails.length > 0).length,
        errors: errors.length,
        skipTraceCost: totalSkipTraceCost,
      },
      batch: {
        size: BATCH_SIZE,
        microCampaignLimit: MICRO_CAMPAIGN_LIMIT,
        perNumberDailyLimit: PER_NUMBER_DAILY_LIMIT,
        hitLimit: hitMicroCampaignLimit,
      },
      remaining: remainingIds.length,
      nextBatchIds: remainingIds.slice(0, BATCH_SIZE),
      usage: updatedUsage,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Batch property detail error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
