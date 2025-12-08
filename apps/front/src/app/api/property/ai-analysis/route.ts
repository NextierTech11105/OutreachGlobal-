import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

interface PropertyData {
  property: Record<string, unknown>;
  comparables: Record<string, unknown>[];
  valuation: {
    estimatedValue: number;
    pricePerSqft: number;
    comparableAvg: number;
    comparablePricePerSqft: number;
    equityEstimate: number;
    confidence: string;
    adjustments: Array<{ factor: string; impact: number; description: string }>;
  };
  neighborhood: {
    medianValue: number;
    avgPricePerSqft: number;
    totalProperties: number;
    avgYearBuilt: number;
    priceHistory: Array<{ year: number; avgPrice: number }>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: PropertyData = await request.json();
    const { property, comparables, valuation, neighborhood } = body;

    if (!property) {
      return NextResponse.json({ error: "Property data required" }, { status: 400 });
    }

    // Extract property details
    const address = property.address as Record<string, unknown> || {};
    const fullAddress = [
      address.address || address.street,
      address.city,
      address.state,
      address.zip,
    ].filter(Boolean).join(", ");

    const propertyDetails = {
      address: fullAddress,
      propertyType: property.propertyType || "Unknown",
      bedrooms: property.bedrooms || property.beds || 0,
      bathrooms: property.bathrooms || property.baths || 0,
      halfBaths: property.halfBaths || 0,
      sqft: property.squareFeet || property.buildingSize || property.livingArea || 0,
      yearBuilt: property.yearBuilt || 0,
      lotSize: property.lotSize || property.lotSquareFeet || 0,
      estimatedValue: valuation?.estimatedValue || property.estimatedValue || property.avm || 0,
      lastSaleAmount: property.lastSaleAmount || 0,
      lastSaleDate: property.lastSaleDate || "",
      mortgageBalance: property.openMortgageBalance || property.mortgageBalance || 0,
      lastLoanAmount: property.lastLoanAmount || 0,
      lastLoanDate: property.lastLoanDate || "",
      ownerOccupied: property.ownerOccupied,
      pool: property.pool,
      garage: property.garage,
      stories: property.stories || property.numberOfStories,
      zoning: property.zoning || "Unknown",
      taxAssessedValue: property.taxAssessedValue || property.assessedValue,
      features: property.features || property.amenities || [],
    };

    // Determine the city/area for context
    const cityState = [address.city, address.state].filter(Boolean).join(", ");
    const currentYear = new Date().getFullYear();
    const propertyAge = propertyDetails.yearBuilt ? currentYear - Number(propertyDetails.yearBuilt) : 0;

    // Build prompt for AI analysis with neighborhood history
    const prompt = `You are an expert real estate analyst with deep knowledge of ${cityState || "this area"}'s real estate market history. Analyze the following property and provide a COMPREHENSIVE valuation report with neighborhood history, decade-by-decade market evolution, and actionable insights.

PROPERTY DATA:
Address: ${propertyDetails.address}
Property Type: ${propertyDetails.propertyType}
Bedrooms: ${propertyDetails.bedrooms}${propertyDetails.halfBaths ? ` + ${propertyDetails.halfBaths} half baths` : ""}
Bathrooms: ${propertyDetails.bathrooms}
Square Feet: ${propertyDetails.sqft.toLocaleString()}
Year Built: ${propertyDetails.yearBuilt} (${propertyAge} years old)
Lot Size: ${propertyDetails.lotSize.toLocaleString()} sq ft
Zoning: ${propertyDetails.zoning}
Estimated Value: $${propertyDetails.estimatedValue.toLocaleString()}
Last Sale: $${propertyDetails.lastSaleAmount.toLocaleString()} on ${propertyDetails.lastSaleDate || "N/A"}
Last Loan Amount: $${propertyDetails.lastLoanAmount.toLocaleString()} ${propertyDetails.lastLoanDate ? `(${propertyDetails.lastLoanDate})` : ""}
Mortgage Balance: $${propertyDetails.mortgageBalance.toLocaleString()}
Tax Assessed Value: $${(propertyDetails.taxAssessedValue || 0).toLocaleString()}
Owner Occupied: ${propertyDetails.ownerOccupied ? "Yes" : "No/Unknown"}
Pool: ${propertyDetails.pool ? "Yes" : "No"}
Garage: ${propertyDetails.garage ? "Yes" : "No/Unknown"}
Stories: ${propertyDetails.stories || "Unknown"}

VALUATION METRICS:
- Price per Sq Ft: $${valuation?.pricePerSqft || 0}
- Comparable Average: $${valuation?.comparableAvg?.toLocaleString() || 0}
- Comparable Price/SqFt: $${valuation?.comparablePricePerSqft || 0}
- Equity Estimate: $${valuation?.equityEstimate?.toLocaleString() || 0}
- Confidence Level: ${valuation?.confidence || "Unknown"}

NEIGHBORHOOD STATS:
- Median Home Value: $${neighborhood?.medianValue?.toLocaleString() || 0}
- Avg Price/SqFt: $${neighborhood?.avgPricePerSqft || 0}
- Total Properties: ${neighborhood?.totalProperties || 0}
- Average Year Built: ${neighborhood?.avgYearBuilt || "Unknown"}
${neighborhood?.priceHistory ? `- Price History: ${JSON.stringify(neighborhood.priceHistory)}` : ""}

COMPARABLE PROPERTIES: ${comparables?.length || 0} found

Provide your COMPREHENSIVE analysis in the following JSON format. Be specific with numbers and provide realistic data based on the ${cityState || "area"} market:

{
  "executiveSummary": "A detailed 3-4 sentence overview of the property, its unique position in the market, and key investment thesis",
  "valuationAnalysis": {
    "marketPosition": "Detailed explanation of how this property compares to market (include specific percentage above/below market)",
    "valueDrivers": ["List of 4-6 specific factors positively affecting value with explanations"],
    "valueDetractors": ["List of 2-4 factors that could negatively affect value"],
    "appreciationPotential": "Detailed short-term (1-2 year) and long-term (5-10 year) appreciation forecast with percentages",
    "fairMarketValueRange": {
      "low": "Conservative estimate",
      "mid": "Most likely value",
      "high": "Optimistic estimate"
    }
  },
  "neighborhoodHistory": {
    "overview": "Comprehensive 3-4 sentence history of ${cityState || "the neighborhood"} and its development",
    "decadeByDecade": [
      {
        "decade": "1980s",
        "description": "What was happening in this area during the 1980s",
        "avgHomePrice": "Average home price in this decade (estimate)",
        "keyEvents": ["Major events or changes that shaped the area"]
      },
      {
        "decade": "1990s",
        "description": "Development and changes in the 1990s",
        "avgHomePrice": "Average home price estimate",
        "keyEvents": ["Key developments"]
      },
      {
        "decade": "2000s",
        "description": "The 2000s including the housing bubble impact",
        "avgHomePrice": "Average home price estimate",
        "keyEvents": ["Key developments including 2008 crisis impact"]
      },
      {
        "decade": "2010s",
        "description": "Recovery and growth in the 2010s",
        "avgHomePrice": "Average home price estimate",
        "keyEvents": ["Post-recession recovery, new developments"]
      },
      {
        "decade": "2020s",
        "description": "Current decade including COVID impact and recent trends",
        "avgHomePrice": "Current average home price",
        "keyEvents": ["COVID impact, remote work migration, current developments"]
      }
    ],
    "futureOutlook": "5-10 year prediction for the neighborhood",
    "gentrificationStatus": "Current gentrification stage (early/mid/mature/declining) and trajectory"
  },
  "priceEvolution": {
    "chartData": [
      {"year": 1990, "avgPrice": 100000, "thisProperty": null},
      {"year": 1995, "avgPrice": 120000, "thisProperty": null},
      {"year": 2000, "avgPrice": 180000, "thisProperty": ${propertyDetails.lastSaleDate?.includes("2000") ? propertyDetails.lastSaleAmount : "null"}},
      {"year": 2005, "avgPrice": 350000, "thisProperty": null},
      {"year": 2008, "avgPrice": 400000, "thisProperty": null},
      {"year": 2010, "avgPrice": 280000, "thisProperty": null},
      {"year": 2015, "avgPrice": 380000, "thisProperty": ${propertyDetails.lastSaleDate?.includes("2015") ? propertyDetails.lastSaleAmount : "null"}},
      {"year": 2020, "avgPrice": 550000, "thisProperty": null},
      {"year": 2023, "avgPrice": 750000, "thisProperty": null},
      {"year": 2024, "avgPrice": ${neighborhood?.medianValue || 800000}, "thisProperty": ${propertyDetails.estimatedValue}},
      {"year": 2025, "avgPrice": "Projected value", "thisProperty": "Projected value"}
    ],
    "totalAppreciation": "Percentage appreciation from earliest data point to now",
    "annualizedReturn": "Average annual appreciation rate"
  },
  "investmentInsights": {
    "investorProfile": "Detailed description of ideal investor type with specific use cases",
    "rentalPotential": {
      "estimatedMonthlyRent": "Realistic monthly rent estimate",
      "grossYield": "Annual gross rental yield percentage",
      "netYield": "Net yield after expenses",
      "rentToValueRatio": "Rent as percentage of property value"
    },
    "flipPotential": {
      "rehabCostEstimate": "Estimated renovation cost range",
      "afterRepairValue": "Projected ARV after renovations",
      "potentialProfit": "Expected profit after flip",
      "recommendation": "Whether to flip or not and why"
    },
    "holdStrategy": "Detailed long-term hold recommendations with exit strategy options",
    "cashFlowAnalysis": {
      "monthlyMortgage": "Estimated mortgage payment",
      "monthlyCashFlow": "Net monthly cash flow if rented",
      "breakEvenPoint": "Years to break even on investment"
    }
  },
  "marketTrends": {
    "neighborhoodOutlook": "Detailed area growth indicators with specific data points",
    "supplyDemand": {
      "inventoryLevel": "Current inventory status (low/balanced/high)",
      "daysOnMarket": "Average days on market in area",
      "buyerDemand": "Current buyer demand level",
      "priceDirection": "Whether prices are rising/stable/falling"
    },
    "bestTimeToSell": "Specific timing advice with seasonal considerations",
    "economicFactors": ["List of 3-4 economic factors affecting this market"],
    "competingListings": "Analysis of current competition in the area"
  },
  "comparableAnalysis": {
    "summary": "How this property stacks up against the ${comparables?.length || 0} comparables",
    "strengths": ["What makes this property better than comps"],
    "weaknesses": ["Where this property falls short of comps"],
    "pricePositioning": "Whether priced correctly relative to comps"
  },
  "recommendations": [
    "5-7 specific, actionable recommendations with timelines and expected outcomes"
  ],
  "riskFactors": [
    "3-5 detailed risk factors with mitigation strategies"
  ],
  "actionPlan": {
    "immediate": ["Actions to take in the next 30 days"],
    "shortTerm": ["Actions for the next 3-6 months"],
    "longTerm": ["Strategic moves for 1-5 years"]
  },
  "equityUnlockingStrategies": {
    "zoningOpportunities": {
      "currentZoning": "Current zoning classification (${propertyDetails.zoning}) and what it allows",
      "maxFAR": "Maximum Floor Area Ratio allowed",
      "currentFAR": "Current FAR being used (building sqft / lot sqft)",
      "unusedFAR": "Unused FAR potential - additional buildable square footage",
      "potentialUpzoning": "Possibility of rezoning and what it could unlock",
      "additionalUnits": "Can an ADU, duplex conversion, or additional units be added?",
      "commercialPotential": "Any mixed-use or commercial potential?",
      "bigLotFlag": "Flag if lot size > 5000 sqft with development potential"
    },
    "lotDevelopment": {
      "lotSize": "${propertyDetails.lotSize.toLocaleString()} sq ft",
      "lotUtilization": "Current lot coverage percentage and efficiency",
      "subdivisionPotential": "Can the lot be subdivided?",
      "buildableArea": "Additional buildable square footage based on unused FAR",
      "setbackAnalysis": "Front/side/rear setback opportunities",
      "landscapingValue": "Outdoor improvements that add value"
    },
    "structuralOpportunities": {
      "currentBuildingSqFt": "${propertyDetails.sqft.toLocaleString()} sq ft",
      "additionPotential": "Can the structure be expanded vertically or horizontally?",
      "conversionOptions": "Basement, attic, or garage conversion possibilities",
      "modernizationROI": "Which upgrades offer best ROI?"
    },
    "financialStrategies": {
      "cashOutRefi": "Cash-out refinance potential and recommended amount",
      "heloc": "HELOC availability and optimal usage",
      "rentalIncome": "Adding rental income through conversion",
      "shortTermRental": "Airbnb/VRBO potential based on local regulations"
    },
    "neighborhoodLeverage": {
      "developmentTrends": "How nearby development affects this property's potential",
      "infrastructureChanges": "Upcoming transit, schools, or amenities that add value",
      "comparableProjects": "What neighbors have done to unlock equity"
    },
    "estimatedEquityUnlock": "Total potential equity that could be unlocked with improvements",
    "recommendedStrategy": "The single best strategy for this specific property"
  },
  "neighborhoodAmenities": {
    "dining": ["List 3-5 popular restaurants, cafes, and food spots within walking distance"],
    "entertainment": ["List 3-5 entertainment venues, bars, nightlife, theaters nearby"],
    "shopping": ["List notable shopping areas, malls, boutiques"],
    "transportation": {
      "subway": "Nearest subway/metro stations and lines",
      "bus": "Bus routes serving the area",
      "highways": "Major highways and commute times to downtown",
      "walkScore": "Estimated walk score (0-100)",
      "transitScore": "Estimated transit score (0-100)"
    },
    "famousResidents": "Any notable past or current residents, celebrities, or historical figures from this neighborhood",
    "landmarks": ["Notable landmarks, parks, or cultural sites nearby"]
  },
  "sisterCityComparison": {
    "domesticComparisons": [
      {
        "city": "Similar US city with comparable trajectory",
        "similarity": "Why this city is comparable (demographics, growth pattern)",
        "appreciationThere": "What appreciation looked like there during similar phase",
        "lessonForHere": "What this suggests for the subject property's area"
      }
    ],
    "internationalComparisons": [
      {
        "city": "International city with similar characteristics",
        "similarity": "Key similarities (waterfront, density, transit, culture)",
        "appreciationThere": "Property appreciation history in that market",
        "lessonForHere": "Investment insights from this comparison"
      }
    ],
    "growthBenchmark": "Based on sister cities, expected 5-year and 10-year appreciation potential"
  },
  "confidenceScore": 85,
  "analysisDate": "${new Date().toISOString().split('T')[0]}",
  "disclaimer": "This analysis is for informational purposes only and should not be considered financial advice. Values are estimates based on available data."
}

CRITICAL:
1. Return ONLY valid JSON, no markdown, no code blocks, no additional text
2. Be SPECIFIC with numbers - use realistic values for ${cityState || "the area"} market
3. Include actual decade-by-decade history with realistic price evolution
4. Provide actionable insights that an investor could immediately use
5. Make the neighborhood history compelling and educational`;

    // Call OpenAI API for comprehensive analysis
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 503 });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Using mini for higher rate limits
        messages: [
          { role: "system", content: "You are an expert real estate analyst. Always respond with valid JSON only, no markdown or code blocks." },
          { role: "user", content: prompt },
        ],
        max_tokens: 4000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[AI Analysis] OpenAI error:", error);
      return NextResponse.json({ error: `OpenAI API error: ${response.status}` }, { status: 500 });
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content?.trim() || "";

    // Parse JSON response
    let analysis;
    try {
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("[AI Analysis] Parse error:", parseError);
      // Return a structured fallback
      analysis = {
        executiveSummary: responseText.substring(0, 500),
        valuationAnalysis: {
          marketPosition: "Unable to determine",
          valueDrivers: [],
          valueDetractors: [],
          appreciationPotential: "Analysis unavailable",
        },
        investmentInsights: {
          investorProfile: "Analysis unavailable",
          rentalPotential: "Analysis unavailable",
          flipPotential: "Analysis unavailable",
          holdStrategy: "Analysis unavailable",
        },
        marketTrends: {
          neighborhoodOutlook: "Analysis unavailable",
          supplyDemand: "Analysis unavailable",
          bestTimeToSell: "Analysis unavailable",
        },
        recommendations: ["Contact a local real estate professional for detailed analysis"],
        riskFactors: ["Insufficient data for comprehensive risk assessment"],
        confidenceScore: 50,
        analysisDate: new Date().toISOString().split("T")[0],
        rawResponse: responseText,
      };
    }

    return NextResponse.json({
      success: true,
      analysis,
      property: propertyDetails,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("[AI Analysis] Error:", error);
    const message = error instanceof Error ? error.message : "AI analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
