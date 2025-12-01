import { NextRequest, NextResponse } from "next/server";

const REALESTATE_API_KEY = process.env.REAL_ESTATE_API_KEY || process.env.REALESTATE_API_KEY || "NEXTIER-2906-74a1-8684-d2f63f473b7b";
const AUTOCOMPLETE_URL = "https://api.realestateapi.com/v1/AutoComplete";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { state, type = "county", query } = body;

    if (!state) {
      return NextResponse.json(
        { error: true, message: "State is required" },
        { status: 400 }
      );
    }

    const response = await fetch(AUTOCOMPLETE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify({
        state,
        type,
        query: query || "",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: true, message: data.message || "Autocomplete failed", details: data },
        { status: response.status }
      );
    }

    // Extract counties from response
    if (data.data && Array.isArray(data.data)) {
      const counties = data.data
        .map((item: { county?: string; name?: string; value?: string }) =>
          item.county || item.name || item.value || item
        )
        .filter((c: unknown): c is string => typeof c === "string" && c.length > 0);

      return NextResponse.json({ counties: [...new Set(counties)].sort() });
    }

    return NextResponse.json({ counties: [] });
  } catch (error: unknown) {
    console.error("Autocomplete error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: true, message },
      { status: 500 }
    );
  }
}
