import { NextRequest, NextResponse } from "next/server";

const REALESTATE_API_KEY = process.env.REAL_ESTATE_API_KEY || process.env.REALESTATE_API_KEY || "";
const PROPERTY_DETAIL_URL = "https://api.realestateapi.com/v2/PropertyDetail";
const PROPERTY_SEARCH_URL = "https://api.realestateapi.com/v2/PropertySearch";
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1IjoibmV4dGllcjExMTA1IiwiYSI6ImNtaXVrbmRodTFrY3YzanEwamFoZG44dWQifQ.EGNVQPofUwZm60KP6iID_g";

interface ValuationData {
  property: Record<string, unknown>;
  comparables: Record<string, unknown>[];
  valuation: {
    estimatedValue: number;
    pricePerSqft: number;
    comparableAvg: number;
    comparablePricePerSqft: number;
    equityEstimate: number;
    confidence: "high" | "medium" | "low";
    adjustments: Array<{ factor: string; impact: number; description: string }>;
  };
  neighborhood: {
    medianValue: number;
    avgPricePerSqft: number;
    totalProperties: number;
    avgYearBuilt: number;
    priceHistory: Array<{ year: number; avgPrice: number }>;
  };
  streetViewUrl: string | null;
  mapUrl: string | null;
}

// GET valuation by property ID
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Property ID required" }, { status: 400 });
  }

  try {
    // Get property detail
    const propertyResponse = await fetch(PROPERTY_DETAIL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify({ id }),
    });

    if (!propertyResponse.ok) {
      const error = await propertyResponse.json();
      return NextResponse.json(
        { error: error.message || "Failed to fetch property details" },
        { status: propertyResponse.status }
      );
    }

    const propertyData = await propertyResponse.json();
    const property = propertyData.data || propertyData;

    // Build valuation report
    const valuation = await buildValuationReport(property);

    return NextResponse.json({
      success: true,
      ...valuation,
    });
  } catch (error: unknown) {
    console.error("[Valuation] Error:", error);
    const message = error instanceof Error ? error.message : "Valuation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST valuation by address
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, city, state, zip, id } = body;

    let property: Record<string, unknown> | null = null;

    // If ID provided, fetch directly
    if (id) {
      const propertyResponse = await fetch(PROPERTY_DETAIL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": REALESTATE_API_KEY,
        },
        body: JSON.stringify({ id }),
      });

      if (propertyResponse.ok) {
        const data = await propertyResponse.json();
        property = data.data || data;
      }
    }

    // Otherwise search by address
    if (!property && address) {
      const searchBody: Record<string, unknown> = {
        size: 1,
      };

      if (address) searchBody.address = address;
      if (city) searchBody.city = city;
      if (state) searchBody.state = state;
      if (zip) searchBody.zip = zip;

      const searchResponse = await fetch(PROPERTY_SEARCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": REALESTATE_API_KEY,
        },
        body: JSON.stringify(searchBody),
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        const results = searchData.data || searchData.properties || [];

        if (results.length > 0) {
          // Get full details
          const detailResponse = await fetch(PROPERTY_DETAIL_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": REALESTATE_API_KEY,
            },
            body: JSON.stringify({ id: results[0].id }),
          });

          if (detailResponse.ok) {
            const detailData = await detailResponse.json();
            property = detailData.data || detailData;
          }
        }
      }
    }

    if (!property) {
      return NextResponse.json(
        { error: "Property not found. Please check the address and try again." },
        { status: 404 }
      );
    }

    // Build valuation report
    const valuation = await buildValuationReport(property);

    return NextResponse.json({
      success: true,
      ...valuation,
    });
  } catch (error: unknown) {
    console.error("[Valuation] Error:", error);
    const message = error instanceof Error ? error.message : "Valuation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function buildValuationReport(property: Record<string, unknown>): Promise<ValuationData> {
  // Extract property details
  const address = property.address as Record<string, unknown> || {};
  const propertyType = property.propertyType as string || "SFR";
  const bedrooms = (property.bedrooms || property.beds) as number || 0;
  const bathrooms = (property.bathrooms || property.baths) as number || 0;
  const sqft = (property.squareFeet || property.buildingSize || property.livingArea) as number || 0;
  const yearBuilt = property.yearBuilt as number || 0;
  const estimatedValue = (property.estimatedValue || property.avm) as number || 0;
  const lastSaleAmount = property.lastSaleAmount as number || 0;
  const lastSaleDate = property.lastSaleDate as string || "";
  const mortgageBalance = (property.openMortgageBalance || property.mortgageBalance) as number || 0;
  const latitude = (address.latitude || property.latitude) as number;
  const longitude = (address.longitude || property.longitude) as number;

  // Get comparable properties
  const comparables = await getComparables(property);

  // Calculate valuation metrics
  const pricePerSqft = sqft > 0 ? estimatedValue / sqft : 0;

  // Calculate comparable averages
  let compAvgValue = 0;
  let compAvgPricePerSqft = 0;
  if (comparables.length > 0) {
    const compValues = comparables.map((c) =>
      (c.estimatedValue || c.avm || c.lastSaleAmount) as number || 0
    ).filter((v) => v > 0);

    const compSqftPrices = comparables.map((c) => {
      const compSqft = (c.squareFeet || c.buildingSize) as number || 0;
      const compValue = (c.estimatedValue || c.avm || c.lastSaleAmount) as number || 0;
      return compSqft > 0 ? compValue / compSqft : 0;
    }).filter((v) => v > 0);

    if (compValues.length > 0) {
      compAvgValue = compValues.reduce((a, b) => a + b, 0) / compValues.length;
    }
    if (compSqftPrices.length > 0) {
      compAvgPricePerSqft = compSqftPrices.reduce((a, b) => a + b, 0) / compSqftPrices.length;
    }
  }

  // Calculate equity estimate
  const equityEstimate = estimatedValue - mortgageBalance;

  // Confidence level based on data quality
  let confidence: "high" | "medium" | "low" = "medium";
  if (comparables.length >= 5 && sqft > 0 && yearBuilt > 0) {
    confidence = "high";
  } else if (comparables.length < 2 || sqft === 0) {
    confidence = "low";
  }

  // Value adjustments
  const adjustments: Array<{ factor: string; impact: number; description: string }> = [];

  // Age adjustment
  const currentYear = new Date().getFullYear();
  const age = yearBuilt > 0 ? currentYear - yearBuilt : 0;
  if (age > 50) {
    adjustments.push({
      factor: "Age",
      impact: -5,
      description: `Property is ${age} years old - older homes may need updates`,
    });
  } else if (age < 5) {
    adjustments.push({
      factor: "Age",
      impact: 5,
      description: "Recently built - modern features and minimal maintenance",
    });
  }

  // Size vs comparables
  if (compAvgPricePerSqft > 0 && pricePerSqft > 0) {
    const pricePerSqftDiff = ((pricePerSqft - compAvgPricePerSqft) / compAvgPricePerSqft) * 100;
    if (pricePerSqftDiff > 20) {
      adjustments.push({
        factor: "Price/SqFt",
        impact: -3,
        description: "Priced above comparable average - potential overvaluation",
      });
    } else if (pricePerSqftDiff < -20) {
      adjustments.push({
        factor: "Price/SqFt",
        impact: 5,
        description: "Priced below comparable average - potential value opportunity",
      });
    }
  }

  // Recent sale appreciation
  if (lastSaleAmount > 0 && estimatedValue > 0 && lastSaleDate) {
    const saleYear = new Date(lastSaleDate).getFullYear();
    const yearsSinceSale = currentYear - saleYear;
    if (yearsSinceSale > 0) {
      const appreciation = ((estimatedValue - lastSaleAmount) / lastSaleAmount) * 100;
      const annualAppreciation = appreciation / yearsSinceSale;
      if (annualAppreciation > 10) {
        adjustments.push({
          factor: "Appreciation",
          impact: 3,
          description: `Strong appreciation: ${annualAppreciation.toFixed(1)}% per year since purchase`,
        });
      }
    }
  }

  // Get neighborhood stats
  const neighborhood = await getNeighborhoodStats(property);

  // Build Mapbox Static Map URLs
  let streetViewUrl: string | null = null;
  let mapUrl: string | null = null;

  if (latitude && longitude && MAPBOX_ACCESS_TOKEN) {
    // Mapbox Static Images API - satellite view for "street view" style
    // Format: https://api.mapbox.com/styles/v1/{username}/{style_id}/static/{lon},{lat},{zoom},{bearing},{pitch}|{overlay}/{width}x{height}

    // Satellite view (closest to street view)
    streetViewUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${longitude},${latitude},18,0/600x400?access_token=${MAPBOX_ACCESS_TOKEN}`;

    // Standard street map with marker
    // pin-l = large pin, +ff0000 = red color
    mapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l+ff0000(${longitude},${latitude})/${longitude},${latitude},16,0/600x300?access_token=${MAPBOX_ACCESS_TOKEN}`;
  } else if (MAPBOX_ACCESS_TOKEN) {
    // Try geocoding the address to get coordinates
    const fullAddress = [
      address.address || address.street,
      address.city,
      address.state,
      address.zip,
    ].filter(Boolean).join(", ");

    if (fullAddress) {
      try {
        // Geocode the address first
        const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`;
        const geocodeResponse = await fetch(geocodeUrl);
        const geocodeData = await geocodeResponse.json();

        if (geocodeData.features && geocodeData.features.length > 0) {
          const [lng, lat] = geocodeData.features[0].center;
          streetViewUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${lng},${lat},18,0/600x400?access_token=${MAPBOX_ACCESS_TOKEN}`;
          mapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l+ff0000(${lng},${lat})/${lng},${lat},16,0/600x300?access_token=${MAPBOX_ACCESS_TOKEN}`;
        }
      } catch (geocodeError) {
        console.error("[Valuation] Mapbox geocode error:", geocodeError);
      }
    }
  }

  return {
    property,
    comparables,
    valuation: {
      estimatedValue,
      pricePerSqft: Math.round(pricePerSqft),
      comparableAvg: Math.round(compAvgValue),
      comparablePricePerSqft: Math.round(compAvgPricePerSqft),
      equityEstimate,
      confidence,
      adjustments,
    },
    neighborhood,
    streetViewUrl,
    mapUrl,
  };
}

async function getComparables(property: Record<string, unknown>): Promise<Record<string, unknown>[]> {
  const address = property.address as Record<string, unknown> || {};
  const propertyType = property.propertyType as string || "SFR";
  const bedrooms = (property.bedrooms || property.beds) as number || 0;
  const sqft = (property.squareFeet || property.buildingSize) as number || 0;
  const zip = address.zip as string || "";
  const city = address.city as string || "";
  const state = address.state as string || "";

  if (!zip && !city) {
    return [];
  }

  try {
    // Search for comparable properties
    const searchBody: Record<string, unknown> = {
      size: 10,
      property_type: propertyType,
    };

    if (zip) {
      searchBody.zip = zip;
    } else if (city && state) {
      searchBody.city = city;
      searchBody.state = state;
    }

    // Similar bedrooms (+/- 1)
    if (bedrooms > 0) {
      searchBody.beds_min = Math.max(1, bedrooms - 1);
      searchBody.beds_max = bedrooms + 1;
    }

    // Similar square footage (+/- 25%)
    if (sqft > 0) {
      searchBody.building_size_min = Math.round(sqft * 0.75);
      searchBody.building_size_max = Math.round(sqft * 1.25);
    }

    // Recent sales only (last 12 months)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    searchBody.last_sale_date_min = oneYearAgo.toISOString().split("T")[0];

    const response = await fetch(PROPERTY_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify(searchBody),
    });

    if (!response.ok) {
      console.error("[Valuation] Comparable search failed:", response.status);
      return [];
    }

    const data = await response.json();
    const results = data.data || data.properties || [];

    // Exclude the subject property
    const propertyId = property.id as string;
    return results.filter((comp: Record<string, unknown>) => comp.id !== propertyId);
  } catch (error) {
    console.error("[Valuation] Error fetching comparables:", error);
    return [];
  }
}

async function getNeighborhoodStats(property: Record<string, unknown>): Promise<ValuationData["neighborhood"]> {
  const address = property.address as Record<string, unknown> || {};
  const zip = address.zip as string || "";
  const city = address.city as string || "";
  const state = address.state as string || "";

  const defaultStats = {
    medianValue: 0,
    avgPricePerSqft: 0,
    totalProperties: 0,
    avgYearBuilt: 0,
    priceHistory: [],
  };

  if (!zip && !city) {
    return defaultStats;
  }

  try {
    // Get neighborhood summary
    const searchBody: Record<string, unknown> = {
      size: 50, // Sample size for stats
      summary: true,
    };

    if (zip) {
      searchBody.zip = zip;
    } else if (city && state) {
      searchBody.city = city;
      searchBody.state = state;
    }

    const response = await fetch(PROPERTY_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify(searchBody),
    });

    if (!response.ok) {
      return defaultStats;
    }

    const data = await response.json();
    const results = data.data || data.properties || [];
    const summary = data.summary || {};

    if (results.length === 0) {
      return defaultStats;
    }

    // Calculate stats from results
    const values = results
      .map((p: Record<string, unknown>) => (p.estimatedValue || p.avm) as number || 0)
      .filter((v: number) => v > 0)
      .sort((a: number, b: number) => a - b);

    const sqftPrices = results
      .map((p: Record<string, unknown>) => {
        const val = (p.estimatedValue || p.avm) as number || 0;
        const sf = (p.squareFeet || p.buildingSize) as number || 0;
        return sf > 0 ? val / sf : 0;
      })
      .filter((v: number) => v > 0);

    const yearBuilts = results
      .map((p: Record<string, unknown>) => p.yearBuilt as number || 0)
      .filter((y: number) => y > 1800);

    const medianValue = values.length > 0
      ? values[Math.floor(values.length / 2)]
      : 0;

    const avgPricePerSqft = sqftPrices.length > 0
      ? Math.round(sqftPrices.reduce((a: number, b: number) => a + b, 0) / sqftPrices.length)
      : 0;

    const avgYearBuilt = yearBuilts.length > 0
      ? Math.round(yearBuilts.reduce((a: number, b: number) => a + b, 0) / yearBuilts.length)
      : 0;

    // Build simple price history (would need actual historical data for accuracy)
    const currentAvg = values.length > 0
      ? values.reduce((a: number, b: number) => a + b, 0) / values.length
      : 0;

    const priceHistory = [];
    const currentYear = new Date().getFullYear();
    for (let i = 4; i >= 0; i--) {
      // Estimate 5% annual appreciation for history
      const yearValue = currentAvg / Math.pow(1.05, i);
      priceHistory.push({
        year: currentYear - i,
        avgPrice: Math.round(yearValue),
      });
    }

    return {
      medianValue: Math.round(medianValue),
      avgPricePerSqft,
      totalProperties: summary.totalCount || results.length,
      avgYearBuilt,
      priceHistory,
    };
  } catch (error) {
    console.error("[Valuation] Error fetching neighborhood stats:", error);
    return defaultStats;
  }
}
