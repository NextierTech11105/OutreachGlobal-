import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

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
      sqft: property.squareFeet || property.buildingSize || property.livingArea || 0,
      yearBuilt: property.yearBuilt || 0,
      lotSize: property.lotSize || property.lotSquareFeet || 0,
      estimatedValue: valuation?.estimatedValue || property.estimatedValue || property.avm || 0,
      lastSaleAmount: property.lastSaleAmount || 0,
      lastSaleDate: property.lastSaleDate || "",
      mortgageBalance: property.openMortgageBalance || property.mortgageBalance || 0,
      ownerOccupied: property.ownerOccupied,
      pool: property.pool,
      garage: property.garage,
      stories: property.stories || property.numberOfStories,
      zoning: property.zoning,
      taxAssessedValue: property.taxAssessedValue || property.assessedValue,
      features: property.features || property.amenities || [],
    };

    // Build prompt for AI analysis
    const prompt = `You are a professional real estate analyst. Analyze the following property and provide a comprehensive valuation report with actionable insights.

PROPERTY DATA:
Address: ${propertyDetails.address}
Property Type: ${propertyDetails.propertyType}
Bedrooms: ${propertyDetails.bedrooms}
Bathrooms: ${propertyDetails.bathrooms}
Square Feet: ${propertyDetails.sqft.toLocaleString()}
Year Built: ${propertyDetails.yearBuilt}
Lot Size: ${propertyDetails.lotSize.toLocaleString()} sq ft
Estimated Value: $${propertyDetails.estimatedValue.toLocaleString()}
Last Sale: $${propertyDetails.lastSaleAmount.toLocaleString()} on ${propertyDetails.lastSaleDate || "N/A"}
Mortgage Balance: $${propertyDetails.mortgageBalance.toLocaleString()}
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

COMPARABLE PROPERTIES: ${comparables?.length || 0} found

Provide your analysis in the following JSON format:
{
  "executiveSummary": "A 2-3 sentence overview of the property and its market position",
  "valuationAnalysis": {
    "marketPosition": "How the property compares to market (above/at/below market value)",
    "valueDrivers": ["List of 3-5 factors positively affecting value"],
    "valueDetractors": ["List of 1-3 factors negatively affecting value"],
    "appreciationPotential": "Short-term and long-term appreciation outlook"
  },
  "investmentInsights": {
    "investorProfile": "What type of investor this property suits",
    "rentalPotential": "Estimated monthly rent range and yield",
    "flipPotential": "Rehab opportunity assessment",
    "holdStrategy": "Long-term hold recommendations"
  },
  "marketTrends": {
    "neighborhoodOutlook": "Area growth/decline indicators",
    "supplyDemand": "Current market conditions",
    "bestTimeToSell": "Optimal selling timing advice"
  },
  "recommendations": ["List of 3-5 actionable recommendations"],
  "riskFactors": ["List of 2-3 key risks to consider"],
  "confidenceScore": 85,
  "analysisDate": "${new Date().toISOString().split('T')[0]}"
}

IMPORTANT: Return ONLY valid JSON, no markdown or additional text.`;

    // Call Claude API
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract text response
    const responseText = message.content[0].type === "text" ? message.content[0].text : "";

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
