import { NextRequest, NextResponse } from "next/server";

/**
 * Skip Trace API - RealEstateAPI Integration
 *
 * On-demand enrichment to get phones, emails, address history from RealEstateAPI.
 * Cost: ~$0.10-0.25 per person
 *
 * Usage:
 *   POST /api/enrichment/skip-trace
 *   Body: { recordId, bucketId, firstName, lastName, address, city, state, zip }
 *
 * Docs: See docs/REALESTATE_API_COOKBOOK.md
 */

const REALESTATE_API_URL = "https://api.realestateapi.com/v1/SkipTrace";
const REALESTATE_API_KEY = process.env.REALESTATE_API_KEY || "";

interface SkipTraceRequest {
  recordId: string;
  bucketId: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface SkipTraceResult {
  success: boolean;
  data?: {
    owner_names: string[];
    phones: Array<{ number: string; type: string; carrier?: string }>;
    emails: Array<{ email: string; type: string }>;
    address_history: Array<{ address: string; dates: string }>;
    age?: number;
    date_of_birth?: string;
    job_history?: Array<{ employer: string; title: string }>;
  };
  error?: string;
  credits_used?: number;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: SkipTraceRequest = await request.json();
    const {
      recordId,
      bucketId,
      firstName,
      lastName,
      address,
      city,
      state,
      zip,
    } = body;

    // Validate required fields
    if (!recordId || !bucketId) {
      return NextResponse.json(
        { error: "recordId and bucketId are required" },
        { status: 400 },
      );
    }

    // Need at least name + address for skip trace
    if (!firstName && !lastName) {
      return NextResponse.json(
        { error: "firstName or lastName is required for skip trace" },
        { status: 400 },
      );
    }

    if (!address || !city || !state) {
      return NextResponse.json(
        { error: "address, city, and state are required for skip trace" },
        { status: 400 },
      );
    }

    // Check API key
    if (!REALESTATE_API_KEY) {
      console.warn("[Skip Trace] REALESTATE_API_KEY not configured");
      return NextResponse.json(
        {
          error: "Skip trace API not configured",
          hint: "Set REALESTATE_API_KEY environment variable",
        },
        { status: 503 },
      );
    }

    console.log(
      `[Skip Trace] Processing record ${recordId} from bucket ${bucketId}`,
    );

    // Call RealEstateAPI Skip Trace
    const response = await fetch(REALESTATE_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": REALESTATE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        first_name: firstName || "",
        last_name: lastName || "",
        address: address,
        city: city,
        state: state,
        zip: zip || "",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[Skip Trace] API error: ${response.status} - ${errorText}`,
      );

      if (response.status === 401) {
        return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
      }
      if (response.status === 403) {
        return NextResponse.json(
          { error: "No skip trace credits remaining" },
          { status: 403 },
        );
      }
      if (response.status === 429) {
        return NextResponse.json(
          { error: "Rate limited - slow down requests" },
          { status: 429 },
        );
      }

      return NextResponse.json(
        { error: `Skip trace failed: ${response.status}` },
        { status: response.status },
      );
    }

    const result: SkipTraceResult = await response.json();

    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "No data returned",
          recordId,
          bucketId,
        },
        { status: 200 },
      );
    }

    // Extract the best phone (prefer mobile)
    const phones = result.data.phones || [];
    const mobilePhone = phones.find((p) => p.type === "mobile");
    const bestPhone = mobilePhone || phones[0];

    // Extract the best email (prefer personal)
    const emails = result.data.emails || [];
    const personalEmail = emails.find((e) => e.type === "personal");
    const bestEmail = personalEmail || emails[0];

    console.log(
      `[Skip Trace] Success for ${recordId}: ${phones.length} phones, ${emails.length} emails`,
    );

    return NextResponse.json({
      success: true,
      recordId,
      bucketId,
      enrichedData: {
        skipTraced: true,
        skipTracedAt: new Date().toISOString(),
        // Best contact info
        phone: bestPhone?.number || null,
        phoneType: bestPhone?.type || null,
        carrier: bestPhone?.carrier || null,
        email: bestEmail?.email || null,
        emailType: bestEmail?.type || null,
        // All phones and emails
        allPhones: phones,
        allEmails: emails,
        // Additional data
        ownerNames: result.data.owner_names || [],
        addressHistory: result.data.address_history || [],
        age: result.data.age || null,
        dateOfBirth: result.data.date_of_birth || null,
        jobHistory: result.data.job_history || [],
      },
      creditsUsed: result.credits_used || 1,
    });
  } catch (error) {
    console.error("[Skip Trace] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Skip trace failed" },
      { status: 500 },
    );
  }
}

// GET endpoint to check skip trace quota/status
export async function GET(): Promise<NextResponse> {
  if (!REALESTATE_API_KEY) {
    return NextResponse.json({
      configured: false,
      message: "REALESTATE_API_KEY not set",
    });
  }

  return NextResponse.json({
    configured: true,
    endpoint: "POST /api/enrichment/skip-trace",
    requiredFields: [
      "recordId",
      "bucketId",
      "firstName",
      "lastName",
      "address",
      "city",
      "state",
    ],
    optionalFields: ["zip"],
    costPerTrace: "$0.10-0.25",
    documentation: "/docs/REALESTATE_API_COOKBOOK.md",
  });
}
