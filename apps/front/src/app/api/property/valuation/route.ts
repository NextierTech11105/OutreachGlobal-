import { NextRequest, NextResponse } from "next/server";

const REALESTATE_API_KEY = process.env.REAL_ESTATE_API_KEY || process.env.REALESTATE_API_KEY || "";
const PROPERTY_DETAIL_URL = "https://api.realestateapi.com/v2/PropertyDetail";
const PROPERTY_SEARCH_URL = "https://api.realestateapi.com/v2/PropertySearch";
const PROPERTY_COMPS_URL = "https://api.realestateapi.com/v3/PropertyComps";
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1IjoibmV4dGllcjExMTA1IiwiYSI6ImNtaXVrbmRodTFrY3YzanEwamFoZG44dWQifQ.EGNVQPofUwZm60KP6iID_g";

// Validate API key on startup
function validateApiKey(): { valid: boolean; message: string } {
  if (!REALESTATE_API_KEY) {
    return { valid: false, message: "REALESTATE_API_KEY not configured" };
  }
  if (!REALESTATE_API_KEY.startsWith("NEXTIER-")) {
    return { valid: false, message: "Invalid API key format - should start with NEXTIER-" };
  }
  return { valid: true, message: "API key configured" };
}

console.log("[Valuation] API Key Status:", validateApiKey());

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
  // Rental estimates
  rentEstimate?: number;
  rentRangeLow?: number;
  rentRangeHigh?: number;
  grossYield?: number;
  // Motivated seller flags
  preForeclosure?: boolean;
  inForeclosure?: boolean;
  isVacant?: boolean;
  taxDelinquent?: boolean;
  freeClear?: boolean;
  highEquity?: boolean;
  // Multi-family
  units?: number;
  rentPerUnit?: number;
  // Additional property info
  halfBaths?: number;
  zoning?: string;
  lastLoanAmount?: number;
  lastLoanDate?: string;
  stories?: number;
  pool?: boolean;
  garage?: boolean;
  taxAssessedValue?: number;
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
  console.log("[Valuation] Raw PropertyDetail response:", JSON.stringify(rawProperty, null, 2).substring(0, 2000));

  // PropertyDetail has nested propertyInfo structure
  const propertyInfo = (rawProperty.propertyInfo as Record<string, unknown>) || {};
  const addressObj = (propertyInfo.address as Record<string, unknown>) || {};
  const ownerInfo = (rawProperty.ownerInfo as Record<string, unknown>) || {};
  const lotInfo = (rawProperty.lotInfo as Record<string, unknown>) || {};
  const lastSale = (rawProperty.lastSale as Record<string, unknown>) || {};

  // Also check for flat structure (v2 API sometimes returns flat)
  const flatAddress = (rawProperty.address as Record<string, unknown>) || {};

  // Get address - check nested first, then flat, then input
  const resolvedAddress = (addressObj.address || addressObj.label || flatAddress.address || flatAddress.label || inputData?.address) as string;
  const resolvedCity = (addressObj.city || flatAddress.city || inputData?.city) as string;
  const resolvedState = (addressObj.state || flatAddress.state || inputData?.state) as string;
  const resolvedZip = (addressObj.zip || flatAddress.zip || inputData?.zip) as string;

  console.log("[Valuation] Resolved address:", resolvedAddress, resolvedCity, resolvedState, resolvedZip);

  // Get property values - check nested then flat (RealEstateAPI uses many field variations)
  const bedrooms = Number(
    propertyInfo.bedrooms || propertyInfo.beds || propertyInfo.bedroomsTotal ||
    rawProperty.bedrooms || rawProperty.beds || rawProperty.bedroomsTotal ||
    rawProperty.bedroomCount || rawProperty.numBedrooms
  ) || undefined;

  // Bathrooms - check ALL possible field names from RealEstateAPI
  const bathrooms = Number(
    propertyInfo.bathrooms || propertyInfo.baths || propertyInfo.bathroomsTotal ||
    propertyInfo.bathsFull || propertyInfo.bathsTotal || propertyInfo.fullBaths ||
    rawProperty.bathrooms || rawProperty.baths || rawProperty.bathroomsTotal ||
    rawProperty.bathsFull || rawProperty.bathsTotal || rawProperty.fullBaths ||
    rawProperty.bathroomCount || rawProperty.numBathrooms || rawProperty.totalBaths
  ) || undefined;

  // Half baths if available
  const halfBaths = Number(
    propertyInfo.halfBaths || propertyInfo.bathsHalf || propertyInfo.halfBathrooms ||
    rawProperty.halfBaths || rawProperty.bathsHalf || rawProperty.halfBathrooms
  ) || undefined;

  const squareFeet = Number(
    propertyInfo.livingSquareFeet || propertyInfo.buildingSquareFeet ||
    propertyInfo.squareFeet || propertyInfo.livingArea || propertyInfo.grossSquareFeet ||
    rawProperty.squareFeet || rawProperty.buildingSize || rawProperty.livingSquareFeet ||
    rawProperty.buildingSquareFeet || rawProperty.grossSquareFeet
  ) || undefined;

  const yearBuilt = Number(propertyInfo.yearBuilt || rawProperty.yearBuilt || rawProperty.effectiveYearBuilt) || undefined;

  // Zoning info (critical for value-add analysis)
  const zoning = (
    propertyInfo.zoning || propertyInfo.zoningCode || propertyInfo.zoningDescription ||
    rawProperty.zoning || rawProperty.zoningCode || rawProperty.zoningDescription ||
    lotInfo.zoning || lotInfo.zoningCode
  ) as string || undefined;

  // Last loan/mortgage info (for equity analysis)
  const lastLoanAmount = Number(
    rawProperty.lastLoanAmount || rawProperty.loanAmount ||
    rawProperty.openMortgageAmount || rawProperty.mortgageLoanAmount ||
    rawProperty.originalLoanAmount
  ) || undefined;

  const lastLoanDate = (
    rawProperty.lastLoanDate || rawProperty.loanDate ||
    rawProperty.mortgageDate || rawProperty.mortgageRecordingDate
  ) as string || undefined;

  // Additional property features
  const stories = Number(propertyInfo.stories || propertyInfo.numberOfStories || rawProperty.stories || rawProperty.numberOfStories) || undefined;
  const pool = Boolean(propertyInfo.pool || rawProperty.pool || rawProperty.hasPool);
  const garage = Boolean(propertyInfo.garage || rawProperty.garage || rawProperty.hasGarage || rawProperty.garageSpaces);
  const taxAssessedValue = Number(rawProperty.taxAssessedValue || rawProperty.assessedValue || rawProperty.taxAssessment) || undefined;

  // Extract rental estimate data
  const rentalInfo = (rawProperty.rentalEstimate as Record<string, unknown>) || (rawProperty.rental as Record<string, unknown>) || {};
  const rentEstimate = Number(rentalInfo.rent || rentalInfo.rentEstimate || rawProperty.rentEstimate || rawProperty.estimatedRent) || undefined;
  const rentRangeLow = Number(rentalInfo.rentRangeLow || rentalInfo.low || rawProperty.rentRangeLow) || undefined;
  const rentRangeHigh = Number(rentalInfo.rentRangeHigh || rentalInfo.high || rawProperty.rentRangeHigh) || undefined;

  // Calculate gross yield if we have rent and value
  const estimatedValue = Number(rawProperty.estimatedValue || rawProperty.avm) || 0;
  const grossYield = rentEstimate && estimatedValue > 0 ? ((rentEstimate * 12) / estimatedValue) * 100 : undefined;

  // Multi-family units
  const units = Number(propertyInfo.units || propertyInfo.numberOfUnits || rawProperty.units || rawProperty.numberOfUnits) || undefined;
  const rentPerUnit = units && rentEstimate ? Math.round(rentEstimate / units) : undefined;

  // Motivated seller flags from RealEstateAPI
  const preForeclosure = Boolean(rawProperty.preForeclosure || rawProperty.isPreForeclosure);
  const inForeclosure = Boolean(rawProperty.inForeclosure || rawProperty.isForeclosure || rawProperty.foreclosure);
  const isVacant = Boolean(rawProperty.vacant || rawProperty.isVacant);
  const taxDelinquent = Boolean(rawProperty.taxDelinquent || rawProperty.isTaxDelinquent);
  const freeClear = Boolean(rawProperty.freeClear || rawProperty.isFreeClear);

  // High equity = equity > 50% of value
  const equity = Number(rawProperty.estimatedEquity) || (estimatedValue - Number(rawProperty.openMortgageBalance || 0));
  const highEquity = estimatedValue > 0 && equity > (estimatedValue * 0.5);

  const result = {
    id: rawProperty.id as string || "unknown",
    address: {
      address: resolvedAddress,
      street: resolvedAddress,
      city: resolvedCity,
      state: resolvedState,
      zip: resolvedZip,
      latitude: (inputData?.latitude || propertyInfo.latitude || rawProperty.latitude) as number,
      longitude: (inputData?.longitude || propertyInfo.longitude || rawProperty.longitude) as number,
    },
    propertyType: (rawProperty.propertyType || propertyInfo.propertyType) as string || "Unknown",
    bedrooms,
    bathrooms,
    halfBaths,
    squareFeet,
    yearBuilt,
    estimatedValue: estimatedValue || undefined,
    lastSaleAmount: Number(rawProperty.lastSalePrice || rawProperty.lastSaleAmount || lastSale.saleAmount) || undefined,
    lastSaleDate: (rawProperty.lastSaleDate || lastSale.saleDate) as string,
    openMortgageBalance: Number(rawProperty.openMortgageBalance) || 0,
    estimatedEquity: Number(rawProperty.estimatedEquity) || equity || undefined,
    lotSquareFeet: Number(lotInfo.lotSquareFeet || propertyInfo.lotSquareFeet || rawProperty.lotSquareFeet) || undefined,
    ownerOccupied: (rawProperty.ownerOccupied || propertyInfo.ownerOccupied) as boolean,
    owner1FirstName: (ownerInfo.owner1FirstName || rawProperty.owner1FirstName) as string,
    owner1LastName: (ownerInfo.owner1LastName || rawProperty.owner1LastName) as string,
    latitude: (inputData?.latitude || propertyInfo.latitude || rawProperty.latitude) as number,
    longitude: (inputData?.longitude || propertyInfo.longitude || rawProperty.longitude) as number,
    // Additional property info (for AI analysis)
    zoning,
    lastLoanAmount,
    lastLoanDate,
    stories,
    pool,
    garage,
    taxAssessedValue,
    // Rental data
    rentEstimate,
    rentRangeLow,
    rentRangeHigh,
    grossYield,
    units,
    rentPerUnit,
    // Motivated seller flags
    preForeclosure,
    inForeclosure,
    isVacant,
    taxDelinquent,
    freeClear,
    highEquity,
  };

  console.log("[Valuation] Normalized property:", JSON.stringify(result, null, 2));
  return result;
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
    const { address, city, state, zip, id, latitude: inputLat, longitude: inputLng, fullAddress } = body;

    let lat = inputLat;
    let lng = inputLng;

    // If no coordinates provided, geocode the address using Mapbox
    if (!lat || !lng) {
      const searchAddress = fullAddress || `${address}, ${city}, ${state} ${zip}`.trim();
      console.log("[Valuation] Geocoding address:", searchAddress);

      try {
        const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchAddress)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=address&country=US&limit=1`;
        const geoResponse = await fetch(geocodeUrl);

        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          if (geoData.features && geoData.features.length > 0) {
            const feature = geoData.features[0];
            lng = feature.center[0];
            lat = feature.center[1];
            console.log("[Valuation] Geocoded to:", lat, lng);
          }
        }
      } catch (geoError) {
        console.error("[Valuation] Geocoding error:", geoError);
      }
    }

    const inputData = { address, city, state, zip, latitude: lat, longitude: lng };
    let property: NormalizedProperty | null = null;
    let propertyId: string | null = null;

    // If ID provided, fetch directly with PropertyDetail
    if (id && id !== "mapbox-geocode") {
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

    // BEST APPROACH: Use coordinate-based search (most accurate per RealEstateAPI support)
    if (!property && lat && lng) {
      console.log("[Valuation] Coordinate search with lat:", lat, "lng:", lng);

      // Check API key before making request
      const keyStatus = validateApiKey();
      if (!keyStatus.valid) {
        console.error("[Valuation] API Key Error:", keyStatus.message);
      }

      // Try multiple radius sizes for better matching
      const radiusSizes = [0.05, 0.1, 0.25]; // ~250ft, ~500ft, ~1300ft

      for (const radius of radiusSizes) {
        if (property) break;

        const searchBody = {
          latitude: lat,
          longitude: lng,
          radius,
          size: 5, // Get top 5 results to find best match
        };

        console.log("[Valuation] Trying radius:", radius, "miles");

        try {
          const searchResponse = await fetch(PROPERTY_SEARCH_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": REALESTATE_API_KEY,
            },
            body: JSON.stringify(searchBody),
          });

          if (!searchResponse.ok) {
            const errorText = await searchResponse.text();
            console.error("[Valuation] PropertySearch failed:", searchResponse.status, errorText);
            continue;
          }

          const searchData = await searchResponse.json();
          console.log("[Valuation] PropertySearch response:", JSON.stringify(searchData).substring(0, 500));

          const results = searchData.data || searchData.properties || searchData.results || [];
          console.log("[Valuation] Coordinate search found:", results.length, "properties at radius", radius);

          if (results.length > 0) {
            // Find best match by comparing address if available
            let bestMatch = results[0];
            if (address && results.length > 1) {
              const inputAddrLower = address.toLowerCase();
              for (const result of results) {
                const resultAddr = (result.address?.address || result.address || "").toLowerCase();
                if (resultAddr.includes(inputAddrLower) || inputAddrLower.includes(resultAddr)) {
                  bestMatch = result;
                  break;
                }
              }
            }

            const foundId = bestMatch.id;
            console.log("[Valuation] Getting PropertyDetail for ID:", foundId);

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
              console.log("[Valuation] Got property via coordinate search:", propertyId);
            } else {
              const errorText = await detailResponse.text();
              console.error("[Valuation] PropertyDetail failed:", detailResponse.status, errorText);
            }
          }
        } catch (searchError) {
          console.error("[Valuation] Coordinate search error at radius", radius, ":", searchError);
        }
      }
    }

    // Fallback: Try PropertyDetail with full address if coordinate search failed
    if (!property && (fullAddress || (address && city && state))) {
      const searchAddress = fullAddress || `${address}, ${city}, ${state} ${zip}`.trim();
      console.log("[Valuation] Fallback: PropertyDetail with address:", searchAddress);

      try {
        const detailResponse = await fetch(PROPERTY_DETAIL_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": REALESTATE_API_KEY,
          },
          body: JSON.stringify({ address: searchAddress }),
        });

        if (detailResponse.ok) {
          const detailData = await detailResponse.json();
          console.log("[Valuation] Address fallback response:", JSON.stringify(detailData).substring(0, 500));
          const rawProperty = detailData.data || detailData;
          if (rawProperty && rawProperty.id) {
            property = normalizePropertyDetail(rawProperty, inputData);
            propertyId = String(rawProperty.id);
            console.log("[Valuation] Found via address fallback:", propertyId);
          } else {
            console.error("[Valuation] Address fallback returned no ID:", rawProperty);
          }
        } else {
          const errorText = await detailResponse.text();
          console.error("[Valuation] Address fallback failed:", detailResponse.status, errorText);
        }
      } catch (addressError) {
        console.error("[Valuation] Address fallback error:", addressError);
      }
    }

    // If no property found, create a minimal property with geocoded coords
    if (!property) {
      if (lat && lng) {
        console.warn("[Valuation] WARNING: Creating minimal mapbox-geocode property - RealEstateAPI lookup failed");
        console.warn("[Valuation] API Key configured:", !!REALESTATE_API_KEY, "Key prefix:", REALESTATE_API_KEY?.substring(0, 10));
        console.warn("[Valuation] Input:", { address, city, state, zip, lat, lng, id });
        property = {
          id: "mapbox-geocode",
          address: {
            address: address,
            street: address,
            city: city,
            state: state,
            zip: zip,
            latitude: lat,
            longitude: lng,
          },
          propertyType: "Unknown",
          latitude: lat,
          longitude: lng,
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
