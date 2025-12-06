import { NextRequest, NextResponse } from "next/server";

const REALESTATE_API_KEY = process.env.REALESTATE_API_KEY || process.env.REAL_ESTATE_API_KEY || "";
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1IjoibmV4dGllcjExMTA1IiwiYSI6ImNtaXVrbmRodTFrY3YzanEwamFoZG44dWQifQ.EGNVQPofUwZm60KP6iID_g";

interface MapboxFeature {
  id: string;
  place_name: string;
  text: string;
  center: [number, number];
  context?: Array<{
    id: string;
    text: string;
    short_code?: string;
  }>;
  address?: string;
  properties?: {
    accuracy?: string;
  };
}

function parseMapboxFeature(feature: MapboxFeature) {
  // Extract address components from Mapbox context
  let street = feature.text;
  let city = "";
  let state = "";
  let zip = "";

  // If there's a street number, prepend it
  if (feature.address) {
    street = `${feature.address} ${feature.text}`;
  }

  // Parse context for city, state, zip
  if (feature.context) {
    for (const ctx of feature.context) {
      if (ctx.id.startsWith("postcode")) {
        zip = ctx.text;
      } else if (ctx.id.startsWith("place")) {
        city = ctx.text;
      } else if (ctx.id.startsWith("region")) {
        // Use short_code for state abbreviation (e.g., "US-FL" -> "FL")
        state = ctx.short_code?.replace("US-", "") || ctx.text;
      }
    }
  }

  return {
    id: feature.id,
    address: street,
    street,
    city,
    state,
    zip,
    fullAddress: feature.place_name,
    latitude: feature.center[1],
    longitude: feature.center[0],
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { search, type = "address", state, city } = body;

    if (!search || search.length < 3) {
      return NextResponse.json({ data: [], message: "Search term must be at least 3 characters" });
    }

    // USE REALESTATE API FIRST - This gives us property IDs!
    console.log("[Autocomplete] Searching RealEstateAPI for:", search);
    const autocompleteBody: Record<string, string> = {
      search: search.trim(),
      type,
    };

    if (state) autocompleteBody.state = state;
    if (city) autocompleteBody.city = city;

    const response = await fetch("https://api.realestateapi.com/v1/AutoComplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify(autocompleteBody),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("[Autocomplete] RealEstateAPI response:", JSON.stringify(data).substring(0, 500));

      // RealEstateAPI returns { data: [...] } with property objects containing id
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        // Transform to include property ID for direct PropertyDetail lookup
        const suggestions = data.data.map((item: Record<string, unknown>) => ({
          id: item.id, // Property ID for PropertyDetail!
          address: item.address || item.street,
          street: item.street || item.address,
          city: item.city,
          state: item.state,
          zip: item.zip || item.zipCode,
          fullAddress: `${item.address || item.street}, ${item.city}, ${item.state} ${item.zip || item.zipCode}`.trim(),
          latitude: item.latitude,
          longitude: item.longitude,
          propertyType: item.propertyType,
        }));
        console.log("[Autocomplete] Returning", suggestions.length, "suggestions from RealEstateAPI");
        return NextResponse.json({ data: suggestions, source: "realestate" });
      }
    }

    // Fallback to Mapbox if RealEstateAPI fails
    console.log("[Autocomplete] RealEstateAPI failed, falling back to Mapbox");
    if (MAPBOX_ACCESS_TOKEN && type === "address") {
      try {
        const mapboxUrl = new URL("https://api.mapbox.com/geocoding/v5/mapbox.places/" + encodeURIComponent(search) + ".json");
        mapboxUrl.searchParams.set("access_token", MAPBOX_ACCESS_TOKEN);
        mapboxUrl.searchParams.set("autocomplete", "true");
        mapboxUrl.searchParams.set("country", "US");
        mapboxUrl.searchParams.set("types", "address");
        mapboxUrl.searchParams.set("limit", "8");
        mapboxUrl.searchParams.set("proximity", "-73.935242,40.730610");

        const mapboxResponse = await fetch(mapboxUrl.toString());
        const mapboxData = await mapboxResponse.json();

        if (mapboxResponse.ok && mapboxData.features?.length > 0) {
          const suggestions = mapboxData.features.map(parseMapboxFeature);
          return NextResponse.json({ data: suggestions, source: "mapbox" });
        }
      } catch (mapboxError) {
        console.error("Mapbox autocomplete error:", mapboxError);
      }
    }

    return NextResponse.json({ data: [], message: "No results found" });
  } catch (error: any) {
    console.error("Address autocomplete error:", error);
    return NextResponse.json(
      { error: "Autocomplete failed", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("q") || searchParams.get("search") || "";
  const type = searchParams.get("type") || "address";
  const state = searchParams.get("state");
  const city = searchParams.get("city");

  if (!search || search.length < 3) {
    return NextResponse.json({ data: [], message: "Search term must be at least 3 characters" });
  }

  try {
    // USE REALESTATE API FIRST - This gives us property IDs!
    console.log("[Autocomplete GET] Searching RealEstateAPI for:", search);
    const autocompleteBody: Record<string, string> = {
      search: search.trim(),
      type,
    };

    if (state) autocompleteBody.state = state;
    if (city) autocompleteBody.city = city;

    const response = await fetch("https://api.realestateapi.com/v1/AutoComplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify(autocompleteBody),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("[Autocomplete GET] RealEstateAPI response:", JSON.stringify(data).substring(0, 500));

      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        const suggestions = data.data.map((item: Record<string, unknown>) => ({
          id: item.id,
          address: item.address || item.street,
          street: item.street || item.address,
          city: item.city,
          state: item.state,
          zip: item.zip || item.zipCode,
          fullAddress: `${item.address || item.street}, ${item.city}, ${item.state} ${item.zip || item.zipCode}`.trim(),
          latitude: item.latitude,
          longitude: item.longitude,
          propertyType: item.propertyType,
        }));
        console.log("[Autocomplete GET] Returning", suggestions.length, "suggestions from RealEstateAPI");
        return NextResponse.json({ data: suggestions, source: "realestate" });
      }
    }

    // Fallback to Mapbox if RealEstateAPI fails
    console.log("[Autocomplete GET] RealEstateAPI failed, falling back to Mapbox");
    if (MAPBOX_ACCESS_TOKEN && type === "address") {
      try {
        const mapboxUrl = new URL("https://api.mapbox.com/geocoding/v5/mapbox.places/" + encodeURIComponent(search) + ".json");
        mapboxUrl.searchParams.set("access_token", MAPBOX_ACCESS_TOKEN);
        mapboxUrl.searchParams.set("autocomplete", "true");
        mapboxUrl.searchParams.set("country", "US");
        mapboxUrl.searchParams.set("types", "address");
        mapboxUrl.searchParams.set("limit", "8");
        mapboxUrl.searchParams.set("proximity", "-73.935242,40.730610");

        const mapboxResponse = await fetch(mapboxUrl.toString());
        const mapboxData = await mapboxResponse.json();

        if (mapboxResponse.ok && mapboxData.features?.length > 0) {
          const suggestions = mapboxData.features.map(parseMapboxFeature);
          return NextResponse.json({ data: suggestions, source: "mapbox" });
        }
      } catch (mapboxError) {
        console.error("Mapbox autocomplete error:", mapboxError);
      }
    }

    return NextResponse.json({ data: [], message: "No results found" });
  } catch (error: any) {
    console.error("Address autocomplete error:", error);
    return NextResponse.json(
      { error: "Autocomplete failed", details: error.message },
      { status: 500 }
    );
  }
}
