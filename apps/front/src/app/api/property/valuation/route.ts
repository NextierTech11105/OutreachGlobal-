import { NextRequest, NextResponse } from "next/server";

const REALESTATE_API_KEY = process.env.REAL_ESTATE_API_KEY || process.env.REALESTATE_API_KEY || "";
const PROPERTY_DETAIL_URL = "https://api.realestateapi.com/v2/PropertyDetail";
const PROPERTY_SEARCH_URL = "https://api.realestateapi.com/v2/PropertySearch";
const PROPERTY_COMPS_URL = "https://api.realestateapi.com/v3/PropertyComps";
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1IjoibmV4dGllcjExMTA1IiwiYSI6ImNtaXVrbmRodTFrY3YzanEwamFoZG44dWQifQ.EGNVQPofUwZm60KP6iID_g";

interface NormalizedProperty {
  id: string | number;
  address: {
    address?: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    latitude?: number;
    longitude?: number;
  };
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  yearBuilt?: number;
  estimatedValue?: number;
  lastSaleAmount?: number;
  lastSaleDate?: string;
  openMortgageBalance?: number;
  estimatedEquity?: number;
  lotSquareFeet?: number;
  ownerOccupied?: boolean;
  owner1FirstName?: string;
  owner1LastName?: string;
  latitude?: number;
  longitude?: number;
}

interface ValuationData {
  property: NormalizedProperty;
  comparables: NormalizedProperty[];
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

// Normalize RealEstateAPI PropertyDetail response to flat structure
function normalizePropertyDetail(rawProperty: Record<string, unknown>, inputData?: { address?: string; city?: string; state?: string; zip?: string; latitude?: number; longitude?: number }): NormalizedProperty {
  // PropertyDetail has nested propertyInfo structure
  const propertyInfo = (rawProperty.propertyInfo as Record<string, unknown>) || {};
  const addressObj = (propertyInfo.address as Record<string, unknown>) || {};
  const ownerInfo = (rawProperty.ownerInfo as Record<string, unknown>) || {};
  const lotInfo = (rawProperty.lotInfo as Record<string, unknown>) || {};
  const lastSale = (rawProperty.lastSale as Record<string, unknown>) || {};

  return {
    id: rawProperty.id as string || "unknown",
    address: {
      address: (addressObj.address || addressObj.label || inputData?.address) as string,
      street: (addressObj.street || addressObj.address || inputData?.address) as string,
      city: (addressObj.city || inputData?.city) as string,
      state: (addressObj.state || inputData?.state) as string,
      zip: (addressObj.zip || inputData?.zip) as string,
      latitude: (inputData?.latitude || propertyInfo.latitude) as number,
      longitude: (inputData?.longitude || propertyInfo.longitude) as number,
    },
    propertyType: rawProperty.propertyType as string || "Unknown",
    bedrooms: (propertyInfo.bedrooms || propertyInfo.beds) as number,
    bathrooms: (propertyInfo.bathrooms || propertyInfo.baths) as number,
    squareFeet: (propertyInfo.livingSquareFeet || propertyInfo.buildingSquareFeet || propertyInfo.squareFeet) as number,
    yearBuilt: Number(propertyInfo.yearBuilt) || undefined,
    estimatedValue: Number(rawProperty.estimatedValue) || undefined,
    lastSaleAmount: Number(rawProperty.lastSalePrice || lastSale.saleAmount) || undefined,
    lastSaleDate: (rawProperty.lastSaleDate || lastSale.saleDate) as string,
    openMortgageBalance: Number(rawProperty.openMortgageBalance) || 0,
    estimatedEquity: Number(rawProperty.estimatedEquity) || undefined,
    lotSquareFeet: Number(lotInfo.lotSquareFeet || propertyInfo.lotSquareFeet) || undefined,
    ownerOccupied: rawProperty.ownerOccupied as boolean,
    owner1FirstName: ownerInfo.owner1FirstName as string,
    owner1LastName: ownerInfo.owner1LastName as string,
    latitude: (inputData?.latitude || propertyInfo.latitude) as number,
    longitude: (inputData?.longitude || propertyInfo.longitude) as number,
  };
}

// Normalize comp from v3/PropertyComps response (flatter structure)
function normalizeComp(comp: Record<string, unknown>): NormalizedProperty {
  const addressObj = (comp.address as Record<string, unknown>) || {};

  return {
    id: comp.id as string,
    address: {
      address: addressObj.address as string || addressObj.street as string,
      street: addressObj.street as string,
      city: addressObj.city as string,
      state: addressObj.state as string,
      zip: addressObj.zip as string,
      latitude: comp.latitude as number,
      longitude: comp.longitude as number,
    },
    propertyType: comp.propertyType as string,
    bedrooms: comp.bedrooms as number,
    bathrooms: comp.bathrooms as number,
    squareFeet: Number(comp.squareFeet) || undefined,
    yearBuilt: Number(comp.yearBuilt) || undefined,
    estimatedValue: Number(comp.estimatedValue) || undefined,
    lastSaleAmount: Number(comp.lastSaleAmount) || undefined,
    lastSaleDate: comp.lastSaleDate as string,
    openMortgageBalance: Number(comp.openMortgageBalance) || 0,
    estimatedEquity: Number(comp.estimatedEquity) || undefined,
    lotSquareFeet: Number(comp.lotSquareFeet) || undefined,
    ownerOccupied: comp.ownerOccupied as boolean,
    owner1FirstName: comp.owner1FirstName as string,
    owner1LastName: comp.owner1LastName as string,
    latitude: comp.latitude as number,
    longitude: comp.longitude as number,
  };
}

// GET valuation by property ID
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Property ID required" }, { status: 400 });
  }

  try {
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
    const rawProperty = propertyData.data || propertyData;
    const property = normalizePropertyDetail(rawProperty);

    const valuation = await buildValuationReport(property, rawProperty.id);

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
    const { address, city, state, zip, id, latitude: inputLat, longitude: inputLng } = body;

    const inputData = { address, city, state, zip, latitude: inputLat, longitude: inputLng };
    let property: NormalizedProperty | null = null;
    let propertyId: string | null = null;

    // If ID provided, fetch directly with PropertyDetail
    if (id) {
      console.log("[Valuation] Fetching by ID:", id);
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
        const rawProperty = data.data || data;
        property = normalizePropertyDetail(rawProperty, inputData);
        propertyId = String(rawProperty.id);
        console.log("[Valuation] Found property by ID:", propertyId);
      }
    }

    // Otherwise search by address
    if (!property && address) {
      console.log("[Valuation] Searching by address:", address, city, state, zip);
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
        console.log("[Valuation] Search results:", results.length);

        if (results.length > 0) {
          const foundId = results[0].id;
          console.log("[Valuation] Getting detail for ID:", foundId);

          // Get full details with PropertyDetail
          const detailResponse = await fetch(PROPERTY_DETAIL_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": REALESTATE_API_KEY,
            },
            body: JSON.stringify({ id: foundId }),
          });

          if (detailResponse.ok) {
            const detailData = await detailResponse.json();
            const rawProperty = detailData.data || detailData;
            property = normalizePropertyDetail(rawProperty, inputData);
            propertyId = String(rawProperty.id);
            console.log("[Valuation] Got property detail:", propertyId);
          }
        }
      }
    }

    // If no property found, create a minimal property with Mapbox coords
    if (!property) {
      if (inputLat && inputLng) {
        console.log("[Valuation] Creating minimal property from Mapbox coords");
        property = {
          id: "mapbox-geocode",
          address: {
            address: address,
            street: address,
            city: city,
            state: state,
            zip: zip,
            latitude: inputLat,
            longitude: inputLng,
          },
          propertyType: "Unknown",
          latitude: inputLat,
          longitude: inputLng,
        };
      } else {
        return NextResponse.json(
          { error: "Property not found. Please check the address and try again." },
          { status: 404 }
        );
      }
    }

    // Build valuation report
    const valuation = await buildValuationReport(property, propertyId);

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

async function buildValuationReport(property: NormalizedProperty, propertyId: string | null): Promise<ValuationData> {
  const bedrooms = property.bedrooms || 0;
  const bathrooms = property.bathrooms || 0;
  const sqft = property.squareFeet || 0;
  const yearBuilt = property.yearBuilt || 0;
  const estimatedValue = property.estimatedValue || 0;
  const lastSaleAmount = property.lastSaleAmount || 0;
  const lastSaleDate = property.lastSaleDate || "";
  const mortgageBalance = property.openMortgageBalance || 0;
  const latitude = property.address?.latitude || property.latitude;
  const longitude = property.address?.longitude || property.longitude;

  // Get comparables using v3/PropertyComps
  const comparables = await getComparables(property, propertyId);

  // Calculate valuation metrics
  const pricePerSqft = sqft > 0 ? estimatedValue / sqft : 0;

  // Calculate comparable averages
  let compAvgValue = 0;
  let compAvgPricePerSqft = 0;
  if (comparables.length > 0) {
    const compValues = comparables
      .map((c) => c.estimatedValue || c.lastSaleAmount || 0)
      .filter((v) => v > 0);

    const compSqftPrices = comparables
      .map((c) => {
        const compSqft = c.squareFeet || 0;
        const compValue = c.estimatedValue || c.lastSaleAmount || 0;
        return compSqft > 0 ? compValue / compSqft : 0;
      })
      .filter((v) => v > 0);

    if (compValues.length > 0) {
      compAvgValue = compValues.reduce((a, b) => a + b, 0) / compValues.length;
    }
    if (compSqftPrices.length > 0) {
      compAvgPricePerSqft = compSqftPrices.reduce((a, b) => a + b, 0) / compSqftPrices.length;
    }
  }

  // Calculate equity estimate
  const equityEstimate = estimatedValue - mortgageBalance;

  // Confidence level
  let confidence: "high" | "medium" | "low" = "medium";
  if (comparables.length >= 5 && sqft > 0 && yearBuilt > 0) {
    confidence = "high";
  } else if (comparables.length < 2 || sqft === 0) {
    confidence = "low";
  }

  // Value adjustments
  const adjustments: Array<{ factor: string; impact: number; description: string }> = [];
  const currentYear = new Date().getFullYear();
  const age = yearBuilt > 0 ? currentYear - yearBuilt : 0;

  if (age > 50) {
    adjustments.push({
      factor: "Age",
      impact: -5,
      description: `Property is ${age} years old - older homes may need updates`,
    });
  } else if (age > 0 && age < 5) {
    adjustments.push({
      factor: "Age",
      impact: 5,
      description: "Recently built - modern features and minimal maintenance",
    });
  }

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

  // Build Mapbox map URLs
  let streetViewUrl: string | null = null;
  let mapUrl: string | null = null;

  if (latitude && longitude && MAPBOX_ACCESS_TOKEN) {
    streetViewUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${longitude},${latitude},18,0/600x400?access_token=${MAPBOX_ACCESS_TOKEN}`;
    mapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l+ff0000(${longitude},${latitude})/${longitude},${latitude},16,0/600x300?access_token=${MAPBOX_ACCESS_TOKEN}`;
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

async function getComparables(property: NormalizedProperty, propertyId: string | null): Promise<NormalizedProperty[]> {
  // Use v3/PropertyComps API for comparables
  const address = property.address;
  const fullAddress = [address?.address, address?.city, address?.state, address?.zip].filter(Boolean).join(", ");

  if (!propertyId && !fullAddress) {
    return [];
  }

  try {
    const compsBody: Record<string, unknown> = {
      max_radius_miles: 5,
      max_days_back: 365,
      max_results: 10,
    };

    // Use property ID if available, otherwise use address
    if (propertyId && propertyId !== "mapbox-geocode") {
      compsBody.id = propertyId;
    } else if (fullAddress) {
      compsBody.address = fullAddress;
    }

    console.log("[Valuation] Fetching comps with:", JSON.stringify(compsBody));

    const response = await fetch(PROPERTY_COMPS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify(compsBody),
    });

    if (!response.ok) {
      console.error("[Valuation] Comps request failed:", response.status);
      return [];
    }

    const data = await response.json();
    const comps = data.comps || data.data || [];
    console.log("[Valuation] Found comps:", comps.length);

    return comps.map((c: Record<string, unknown>) => normalizeComp(c));
  } catch (error) {
    console.error("[Valuation] Error fetching comps:", error);
    return [];
  }
}

async function getNeighborhoodStats(property: NormalizedProperty): Promise<ValuationData["neighborhood"]> {
  const address = property.address;
  const zip = address?.zip || "";
  const city = address?.city || "";
  const state = address?.state || "";

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
    const searchBody: Record<string, unknown> = {
      size: 50,
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

    const values = results
      .map((p: Record<string, unknown>) => Number(p.estimatedValue || p.avm) || 0)
      .filter((v: number) => v > 0)
      .sort((a: number, b: number) => a - b);

    const sqftPrices = results
      .map((p: Record<string, unknown>) => {
        const val = Number(p.estimatedValue || p.avm) || 0;
        const sf = Number(p.squareFeet || p.buildingSize) || 0;
        return sf > 0 ? val / sf : 0;
      })
      .filter((v: number) => v > 0);

    const yearBuilts = results
      .map((p: Record<string, unknown>) => Number(p.yearBuilt) || 0)
      .filter((y: number) => y > 1800);

    const medianValue = values.length > 0 ? values[Math.floor(values.length / 2)] : 0;
    const avgPricePerSqft = sqftPrices.length > 0
      ? Math.round(sqftPrices.reduce((a: number, b: number) => a + b, 0) / sqftPrices.length)
      : 0;
    const avgYearBuilt = yearBuilts.length > 0
      ? Math.round(yearBuilts.reduce((a: number, b: number) => a + b, 0) / yearBuilts.length)
      : 0;

    const currentAvg = values.length > 0
      ? values.reduce((a: number, b: number) => a + b, 0) / values.length
      : 0;

    const priceHistory = [];
    const currentYear = new Date().getFullYear();
    for (let i = 4; i >= 0; i--) {
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
