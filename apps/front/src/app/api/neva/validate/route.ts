import { NextRequest, NextResponse } from "next/server";
import {
  quickValidationScan,
  batchValidate,
} from "@/lib/ai-workers/neva-research";
import {
  validateBusinessAddress,
  batchValidateAddresses,
} from "@/lib/ai-workers/neva-location";

/**
 * POST /api/neva/validate
 *
 * Quick business validation - Apollo-style checks
 * Uses Perplexity + Mapbox for comprehensive validation.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businesses, single } = body;

    // Single validation
    if (single) {
      const { companyName, address, city, state, zip } = single;

      if (!companyName || !city || !state) {
        return NextResponse.json(
          { success: false, error: "Company name, city, and state required" },
          { status: 400 },
        );
      }

      // Run both validations in parallel
      const [perplexityResult, mapboxResult] = await Promise.all([
        quickValidationScan(companyName, { city, state, zip }),
        validateBusinessAddress(address || companyName, city, state, zip),
      ]);

      return NextResponse.json({
        success: true,
        validation: {
          business: perplexityResult,
          location: mapboxResult,
          overallValid: perplexityResult.isOperating && mapboxResult.isValid,
          confidence: Math.round(
            (perplexityResult.confidenceScore + mapboxResult.confidence) / 2,
          ),
        },
      });
    }

    // Batch validation
    if (businesses && Array.isArray(businesses)) {
      if (businesses.length > 100) {
        return NextResponse.json(
          { success: false, error: "Maximum 100 businesses per batch" },
          { status: 400 },
        );
      }

      // Run Perplexity batch validation
      const perplexityResults = await batchValidate(
        businesses.map((b: any) => ({
          id: b.id,
          name: b.companyName,
          address: { city: b.city, state: b.state, zip: b.zip },
        })),
      );

      // Run Mapbox batch validation
      const mapboxResults = await batchValidateAddresses(
        businesses.map((b: any) => ({
          id: b.id,
          address: b.address || b.companyName,
          city: b.city,
          state: b.state,
          zip: b.zip,
        })),
      );

      // Combine results
      const combined = businesses.map((b: any) => {
        const pResult = perplexityResults.get(b.id);
        const mResult = mapboxResults.get(b.id);

        return {
          id: b.id,
          companyName: b.companyName,
          business: pResult,
          location: mResult,
          overallValid: pResult?.isOperating && mResult?.isValid,
          confidence:
            pResult && mResult
              ? Math.round((pResult.confidenceScore + mResult.confidence) / 2)
              : 0,
        };
      });

      const validCount = combined.filter((c: any) => c.overallValid).length;

      return NextResponse.json({
        success: true,
        total: businesses.length,
        valid: validCount,
        invalid: businesses.length - validCount,
        results: combined,
      });
    }

    return NextResponse.json(
      { success: false, error: "Provide single or businesses array" },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("NEVA validation error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Validation failed" },
      { status: 500 },
    );
  }
}
