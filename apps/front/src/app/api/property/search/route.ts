import { NextRequest, NextResponse } from "next/server";

const REALESTATE_API_KEY = process.env.REALESTATE_API_KEY || "NEXTIER-2906-74a1-8684-d2f63f473b7b";
const REALESTATE_API_URL = "https://api.realestateapi.com/v2/PropertySearch";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Log the request for debugging
    console.log("PropertySearch request:", JSON.stringify(body, null, 2));

    const response = await fetch(REALESTATE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    // Log the response for debugging
    console.log("PropertySearch response status:", response.status);
    if (!response.ok) {
      console.error("PropertySearch error:", JSON.stringify(data, null, 2));
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: true, message: data.message || data.error || "API request failed", details: data },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Property search error:", error);
    return NextResponse.json(
      { error: true, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
