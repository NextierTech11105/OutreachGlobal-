import { NextRequest, NextResponse } from "next/server";

const REALESTATE_API_KEY = process.env.REALESTATE_API_KEY || process.env.REAL_ESTATE_API_KEY || "";
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1IjoibmV4dGllcjExMTA1IiwiYSI6ImNtaXVrbmRodTFrY3YzanEwamFoZG44dWQifQ.EGNVQPofUwZm60KP6iID_g";

// Normalize NYC hyphenated addresses like "2158 36th" -> "21-58 36th"
// or "1234 Main" -> "12-34 Main" (Queens/Bronx style)
function normalizeNYCAddress(search: string): string {
  // Pattern: 4-digit number followed by street name (e.g., "2158 36th st")
  // This is common in Queens/Bronx where addresses are hyphenated
  const nycPattern = /^(\d{2})(\d{2})\s+(\d+)(th|st|nd|rd)?\s*(st|street|ave|avenue|blvd|boulevard|rd|road|pl|place|ct|court|ln|lane|dr|drive)?/i;
  const match = search.match(nycPattern);

  if (match) {
    const [, first, second, streetNum, ordinal, streetType] = match;
    const rest = search.replace(nycPattern, '').trim();
    const normalizedStreet = streetNum + (ordinal || '') + (streetType ? ' ' + streetType : '');
    return `${first}-${second} ${normalizedStreet} ${rest}`.trim();
  }

  return search;
}

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
    const { search } = body;

    if (!search || search.length < 3) {
      return NextResponse.json({ data: [], message: "Search term must be at least 3 characters" });
    }

    // Normalize NYC addresses (e.g., "2158 36th st" -> "21-58 36th st")
    const normalizedSearch = normalizeNYCAddress(search.trim());
    console.log("[Autocomplete] Original:", search, "-> Normalized:", normalizedSearch);

    // USE REALESTATE API FIRST - Returns property IDs for direct PropertyDetail lookup!
    if (REALESTATE_API_KEY) {
      try {
        console.log("[Autocomplete] Calling RealEstateAPI v2/AutoComplete with:", normalizedSearch);
        const response = await fetch("https://api.realestateapi.com/v2/AutoComplete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": REALESTATE_API_KEY,
          },
          body: JSON.stringify({ search: normalizedSearch, search_types: ["A"] }), // A = full addresses only
        });

        if (response.ok) {
          const data = await response.json();
          console.log("[Autocomplete] RealEstateAPI response:", JSON.stringify(data).substring(0, 1000));

          // RealEstateAPI returns { data: [...] } with objects containing id, searchType, title, etc.
          if (data.data && Array.isArray(data.data) && data.data.length > 0) {
            const suggestions = data.data
              .filter((item: Record<string, unknown>) => item.searchType === 'A') // Only full addresses
              .map((item: Record<string, unknown>) => ({
                id: item.id, // Property ID for PropertyDetail!
                searchType: item.searchType,
                address: item.title, // e.g., "21-58 36th Street, Astoria, NY, 11105"
                street: String(item.title).split(',')[0], // Extract street
                city: String(item.title).split(',')[1]?.trim() || '',
                state: String(item.title).split(',')[2]?.trim() || '',
                zip: String(item.title).split(',')[3]?.trim() || '',
                fullAddress: item.title,
                apn: item.apn,
                fips: item.fips,
                stateId: item.stateId,
                countyId: item.countyId,
              }));

            if (suggestions.length > 0) {
              console.log("[Autocomplete] Returning", suggestions.length, "suggestions from RealEstateAPI");
              return NextResponse.json({ data: suggestions, source: "realestate" });
            }
          }
        } else {
          const error = await response.text();
          console.error("[Autocomplete] RealEstateAPI error:", response.status, error);
        }
      } catch (reError) {
        console.error("[Autocomplete] RealEstateAPI exception:", reError);
      }
    }

    // Fallback to Mapbox if RealEstateAPI fails
    console.log("[Autocomplete] Falling back to Mapbox");
    if (MAPBOX_ACCESS_TOKEN) {
      try {
        let mapboxUrl = new URL("https://api.mapbox.com/geocoding/v5/mapbox.places/" + encodeURIComponent(normalizedSearch) + ".json");
        mapboxUrl.searchParams.set("access_token", MAPBOX_ACCESS_TOKEN);
        mapboxUrl.searchParams.set("autocomplete", "true");
        mapboxUrl.searchParams.set("country", "US");
        mapboxUrl.searchParams.set("types", "address");
        mapboxUrl.searchParams.set("limit", "8");
        mapboxUrl.searchParams.set("proximity", "-73.935242,40.730610"); // NYC bias

        let mapboxResponse = await fetch(mapboxUrl.toString());
        let mapboxData = await mapboxResponse.json();

        // If normalized search fails, try original search
        if (!mapboxData.features?.length && normalizedSearch !== search.trim()) {
          mapboxUrl = new URL("https://api.mapbox.com/geocoding/v5/mapbox.places/" + encodeURIComponent(search.trim()) + ".json");
          mapboxUrl.searchParams.set("access_token", MAPBOX_ACCESS_TOKEN);
          mapboxUrl.searchParams.set("autocomplete", "true");
          mapboxUrl.searchParams.set("country", "US");
          mapboxUrl.searchParams.set("types", "address");
          mapboxUrl.searchParams.set("limit", "8");
          mapboxUrl.searchParams.set("proximity", "-73.935242,40.730610");
          mapboxResponse = await fetch(mapboxUrl.toString());
          mapboxData = await mapboxResponse.json();
        }

        if (mapboxResponse.ok && mapboxData.features?.length > 0) {
          const suggestions = mapboxData.features.map(parseMapboxFeature);
          console.log("[Autocomplete] Returning", suggestions.length, "suggestions from Mapbox");
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

  if (!search || search.length < 3) {
    return NextResponse.json({ data: [], message: "Search term must be at least 3 characters" });
  }

  // Normalize NYC addresses
  const normalizedSearch = normalizeNYCAddress(search.trim());
  console.log("[Autocomplete GET] Original:", search, "-> Normalized:", normalizedSearch);

  // USE REALESTATE API FIRST - Returns property IDs for direct PropertyDetail lookup!
  if (REALESTATE_API_KEY) {
    try {
      console.log("[Autocomplete GET] Calling RealEstateAPI v2/AutoComplete");
      const response = await fetch("https://api.realestateapi.com/v2/AutoComplete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": REALESTATE_API_KEY,
        },
        body: JSON.stringify({ search: normalizedSearch, search_types: ["A"] }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("[Autocomplete GET] RealEstateAPI response:", JSON.stringify(data).substring(0, 1000));

        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          const suggestions = data.data
            .filter((item: Record<string, unknown>) => item.searchType === 'A')
            .map((item: Record<string, unknown>) => ({
              id: item.id,
              searchType: item.searchType,
              address: item.title,
              street: String(item.title).split(',')[0],
              city: String(item.title).split(',')[1]?.trim() || '',
              state: String(item.title).split(',')[2]?.trim() || '',
              zip: String(item.title).split(',')[3]?.trim() || '',
              fullAddress: item.title,
              apn: item.apn,
              fips: item.fips,
            }));

          if (suggestions.length > 0) {
            console.log("[Autocomplete GET] Returning", suggestions.length, "suggestions from RealEstateAPI");
            return NextResponse.json({ data: suggestions, source: "realestate" });
          }
        }
      } else {
        console.error("[Autocomplete GET] RealEstateAPI error:", response.status);
      }
    } catch (reError) {
      console.error("[Autocomplete GET] RealEstateAPI exception:", reError);
    }
  }

  // Fallback to Mapbox
  console.log("[Autocomplete GET] Falling back to Mapbox");
  if (MAPBOX_ACCESS_TOKEN) {
    try {
      const mapboxUrl = new URL("https://api.mapbox.com/geocoding/v5/mapbox.places/" + encodeURIComponent(normalizedSearch) + ".json");
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
}
