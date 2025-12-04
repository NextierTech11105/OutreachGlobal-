import { NextRequest, NextResponse } from "next/server";

const REALESTATE_API_KEY = process.env.REAL_ESTATE_API_KEY || process.env.REALESTATE_API_KEY || "NEXTIER-2906-74a1-8684-d2f63f473b7b";
const REALESTATE_API_URL = "https://api.realestateapi.com/v2/PropertyDetail";

// GET single property detail
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Property ID required" }, { status: 400 });
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

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Property detail error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST property details - single id or batch (up to 250)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ids } = body;

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

    // If single ID, return single result
    if (idList.length === 1) {
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

      return NextResponse.json(data.data || data);
    }

    // Limit to 250 to avoid rate limits
    const batchIds = idList.slice(0, 250);
    const results: any[] = [];
    const errors: string[] = [];

    // Fetch details in parallel with concurrency limit
    const concurrency = 10;
    for (let i = 0; i < batchIds.length; i += concurrency) {
      const batch = batchIds.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(async (id: string) => {
          try {
            const response = await fetch(REALESTATE_API_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": REALESTATE_API_KEY,
              },
              body: JSON.stringify({ id: String(id) }),
            });

            if (!response.ok) {
              errors.push(`${id}: ${response.status}`);
              return null;
            }

            const data = await response.json();
            return data.data || data;
          } catch (err: any) {
            errors.push(`${id}: ${err.message}`);
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

    return NextResponse.json({
      success: true,
      data: results,
      count: results.length,
      requested: batchIds.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Batch property detail error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
