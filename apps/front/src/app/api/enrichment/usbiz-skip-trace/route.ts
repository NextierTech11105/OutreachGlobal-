import { NextRequest, NextResponse } from "next/server";
import {
  TracerfyClient,
  TracerfyNormalResult,
  TraceJobInput,
  extractPhones,
  extractEmails,
} from "@/lib/tracerfy";
import { TRACERFY_COST_PER_LEAD } from "@/config/constants";

/**
 * USBizData Skip Trace API
 *
 * STRICT RULES:
 * - Input: FULL NAME + FULL ADDRESS only
 * - Source: USBizData owner records
 * - Vendor: Tracerfy ($0.02/lead) - COST EFFECTIVE
 * - Output: mobile phone + email
 *
 * NO BUSINESS NAMES SENT TO API
 * NO COMPANY IDENTIFIERS
 * PERSON + PROPERTY ONLY
 */

const tracerfy = new TracerfyClient();

// Fallback to RealEstateAPI if Tracerfy not configured
const USE_TRACERFY = !!process.env.TRACERFY_API_TOKEN;
const REALESTATE_API_KEY =
  process.env.REAL_ESTATE_API_KEY || process.env.REALESTATE_API_KEY || "";
const SKIP_TRACE_URL = "https://api.realestateapi.com/v1/SkipTrace";
const SKIP_TRACE_BATCH_URL =
  "https://api.realestateapi.com/v1/SkipTraceBatchAwait";

// Daily limits
const DAILY_LIMIT = 2000;
const dailyUsage = { date: "", count: 0 };

function checkDailyLimit(requested: number): {
  allowed: boolean;
  remaining: number;
} {
  const today = new Date().toISOString().split("T")[0];
  if (dailyUsage.date !== today) {
    dailyUsage.date = today;
    dailyUsage.count = 0;
  }
  const remaining = DAILY_LIMIT - dailyUsage.count;
  return { allowed: remaining >= requested, remaining };
}

function incrementUsage(count: number) {
  dailyUsage.count += count;
}

// Input validation - STRICT
interface USBizSkipInput {
  full_name: string; // REQUIRED - owner full name from USBizData
  address: string; // REQUIRED - business property address
  city: string; // REQUIRED
  state: string; // REQUIRED - 2 letter
  zip: string; // REQUIRED - 5 digits
  record_id?: string; // Optional - for tracking
}

interface SkipTraceResult {
  input: USBizSkipInput;
  success: boolean;
  mobile?: string;
  email?: string;
  all_phones?: Array<{ number: string; type: string }>;
  all_emails?: Array<{ email: string; type: string }>;
  confidence?: number;
  error?: string;
}

// Validate input - reject invalid/ambiguous records
function validateInput(input: USBizSkipInput): {
  valid: boolean;
  error?: string;
} {
  // Must have full name
  if (!input.full_name || input.full_name.trim().length < 3) {
    return { valid: false, error: "full_name required (min 3 chars)" };
  }

  // Name must have first + last (at least 2 parts)
  const nameParts = input.full_name.trim().split(/\s+/);
  if (nameParts.length < 2) {
    return { valid: false, error: "full_name must have first and last name" };
  }

  // Reject corporate/trust names
  const invalidPatterns = [
    /\b(LLC|INC|CORP|LTD|LP|TRUST|ESTATE|COMPANY|CO\.|HOLDINGS|PROPERTIES)\b/i,
    /\b(REVOCABLE|IRREVOCABLE|LIVING|FAMILY)\b/i,
    /\bET\s*AL\b/i,
    /UNKNOWN|N\/A|NONE|TBD|NOT\s+AVAILABLE/i,
  ];
  for (const pattern of invalidPatterns) {
    if (pattern.test(input.full_name)) {
      return {
        valid: false,
        error:
          "full_name appears to be corporate/trust - skip trace requires person",
      };
    }
  }

  // Must have address
  if (!input.address || input.address.trim().length < 5) {
    return { valid: false, error: "address required (min 5 chars)" };
  }

  // Address must have a number
  if (!/\d/.test(input.address)) {
    return { valid: false, error: "address must include street number" };
  }

  // Must have city
  if (!input.city || input.city.trim().length < 2) {
    return { valid: false, error: "city required" };
  }

  // Must have state (2 letters)
  if (!input.state || !/^[A-Za-z]{2}$/.test(input.state.trim())) {
    return { valid: false, error: "state required (2 letter code)" };
  }

  // Must have zip (5+ digits)
  if (!input.zip || !/^\d{5}/.test(input.zip.trim())) {
    return { valid: false, error: "zip required (5 digits)" };
  }

  return { valid: true };
}

// Parse name into first/last
function parseName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

// Single skip trace call
async function skipTracePerson(
  input: USBizSkipInput,
): Promise<SkipTraceResult> {
  const validation = validateInput(input);
  if (!validation.valid) {
    return { input, success: false, error: validation.error };
  }

  const { firstName, lastName } = parseName(input.full_name);

  // Build RealEstateAPI payload - ONLY person + property fields
  // NO business_name, NO company fields
  const payload = {
    first_name: firstName,
    last_name: lastName,
    address: input.address.trim(),
    city: input.city.trim(),
    state: input.state.trim().toUpperCase(),
    zip: input.zip.trim().slice(0, 5),
    match_requirements: { phones: true },
  };

  console.log(
    `[USBiz Skip Trace] ${input.full_name} @ ${input.address}, ${input.city} ${input.state}`,
  );

  try {
    const response = await fetch(SKIP_TRACE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        input,
        success: false,
        error: data.message || `API error: ${response.status}`,
      };
    }

    const identity = data.output?.identity || {};
    const phones = identity.phones || [];
    const emails = identity.emails || [];

    // Find mobile phone (prioritize mobile/cell types)
    const mobilePhone =
      phones.find(
        (p: {
          phoneType?: string;
          isConnected?: boolean;
          doNotCall?: boolean;
        }) =>
          (p.phoneType?.toLowerCase() === "mobile" ||
            p.phoneType?.toLowerCase() === "cell") &&
          p.isConnected !== false &&
          p.doNotCall !== true,
      ) ||
      phones.find(
        (p: { isConnected?: boolean; doNotCall?: boolean }) =>
          p.isConnected !== false && p.doNotCall !== true,
      );

    // Get primary email
    const primaryEmail = emails.find((e: { email?: string }) => e.email);

    const allPhones = phones
      .filter(
        (p: { isConnected?: boolean; doNotCall?: boolean }) =>
          p.isConnected !== false && p.doNotCall !== true,
      )
      .map(
        (p: { phone?: string; phoneDisplay?: string; phoneType?: string }) => ({
          number: p.phone || p.phoneDisplay?.replace(/\D/g, "") || "",
          type: p.phoneType || "unknown",
        }),
      )
      .filter((p: { number: string }) => p.number);

    const allEmails = emails
      .filter((e: { email?: string }) => e.email)
      .map((e: { email: string; emailType?: string }) => ({
        email: e.email,
        type: e.emailType || "personal",
      }));

    return {
      input,
      success:
        data.match === true && (allPhones.length > 0 || allEmails.length > 0),
      mobile:
        mobilePhone?.phone || mobilePhone?.phoneDisplay?.replace(/\D/g, ""),
      email: primaryEmail?.email,
      all_phones: allPhones,
      all_emails: allEmails,
      confidence: data.match === true ? 1 : 0,
    };
  } catch (err) {
    return {
      input,
      success: false,
      error: err instanceof Error ? err.message : "Skip trace failed",
    };
  }
}

// Bulk skip trace
async function bulkSkipTrace(
  inputs: USBizSkipInput[],
): Promise<SkipTraceResult[]> {
  // Validate all inputs first
  const validInputs: USBizSkipInput[] = [];
  const invalidResults: SkipTraceResult[] = [];

  for (const input of inputs) {
    const validation = validateInput(input);
    if (validation.valid) {
      validInputs.push(input);
    } else {
      invalidResults.push({ input, success: false, error: validation.error });
    }
  }

  if (validInputs.length === 0) {
    return invalidResults;
  }

  // Build batch payload
  const skips = validInputs.map((input, idx) => {
    const { firstName, lastName } = parseName(input.full_name);
    return {
      key: input.record_id || `usbiz_${idx}`,
      first_name: firstName,
      last_name: lastName,
      address: input.address.trim(),
      city: input.city.trim(),
      state: input.state.trim().toUpperCase(),
      zip: input.zip.trim().slice(0, 5),
    };
  });

  console.log(`[USBiz Skip Trace] Bulk processing ${skips.length} records`);

  try {
    const response = await fetch(SKIP_TRACE_BATCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify({ skips }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Return all as failed
      return [
        ...invalidResults,
        ...validInputs.map((input) => ({
          input,
          success: false,
          error: data.message || `Batch API error: ${response.status}`,
        })),
      ];
    }

    const results: SkipTraceResult[] = [...invalidResults];
    const batchResults = data.results || data.data || [];

    for (const item of batchResults) {
      const originalInput =
        validInputs.find(
          (_, idx) =>
            item.key === `usbiz_${idx}` ||
            item.key === validInputs[idx]?.record_id,
        ) || validInputs[0];

      const identity = item.output?.identity || {};
      const phones = identity.phones || [];
      const emails = identity.emails || [];

      const mobilePhone =
        phones.find(
          (p: {
            phoneType?: string;
            isConnected?: boolean;
            doNotCall?: boolean;
          }) =>
            (p.phoneType?.toLowerCase() === "mobile" ||
              p.phoneType?.toLowerCase() === "cell") &&
            p.isConnected !== false &&
            p.doNotCall !== true,
        ) ||
        phones.find(
          (p: { isConnected?: boolean; doNotCall?: boolean }) =>
            p.isConnected !== false && p.doNotCall !== true,
        );

      const primaryEmail = emails.find((e: { email?: string }) => e.email);

      const allPhones = phones
        .filter(
          (p: { isConnected?: boolean; doNotCall?: boolean }) =>
            p.isConnected !== false && p.doNotCall !== true,
        )
        .map(
          (p: {
            phone?: string;
            phoneDisplay?: string;
            phoneType?: string;
          }) => ({
            number: p.phone || p.phoneDisplay?.replace(/\D/g, "") || "",
            type: p.phoneType || "unknown",
          }),
        )
        .filter((p: { number: string }) => p.number);

      const allEmails = emails
        .filter((e: { email?: string }) => e.email)
        .map((e: { email: string; emailType?: string }) => ({
          email: e.email,
          type: e.emailType || "personal",
        }));

      results.push({
        input: originalInput,
        success:
          item.match !== false &&
          (allPhones.length > 0 || allEmails.length > 0),
        mobile:
          mobilePhone?.phone || mobilePhone?.phoneDisplay?.replace(/\D/g, ""),
        email: primaryEmail?.email,
        all_phones: allPhones,
        all_emails: allEmails,
      });
    }

    return results;
  } catch (err) {
    return [
      ...invalidResults,
      ...validInputs.map((input) => ({
        input,
        success: false,
        error: err instanceof Error ? err.message : "Bulk skip trace failed",
      })),
    ];
  }
}

/**
 * POST /api/enrichment/usbiz-skip-trace
 *
 * Single: { full_name, address, city, state, zip }
 * Batch: { records: [{ full_name, address, city, state, zip }, ...] }
 */
export async function POST(request: NextRequest) {
  if (!REALESTATE_API_KEY) {
    return NextResponse.json(
      {
        error: "RealEstateAPI not configured",
        message: "Set REAL_ESTATE_API_KEY environment variable",
      },
      { status: 503 },
    );
  }

  const body = await request.json();

  // Determine if single or batch
  const isBatch = Array.isArray(body.records);
  const inputs: USBizSkipInput[] = isBatch ? body.records : [body];

  if (inputs.length === 0) {
    return NextResponse.json(
      {
        error: "No records provided",
        example: {
          single: {
            full_name: "John Smith",
            address: "123 Main St",
            city: "Miami",
            state: "FL",
            zip: "33101",
          },
          batch: {
            records: [
              {
                full_name: "John Smith",
                address: "123 Main St",
                city: "Miami",
                state: "FL",
                zip: "33101",
              },
            ],
          },
        },
      },
      { status: 400 },
    );
  }

  // Check daily limit
  const limit = checkDailyLimit(inputs.length);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: "Daily limit reached",
        limit: DAILY_LIMIT,
        remaining: limit.remaining,
        requested: inputs.length,
      },
      { status: 429 },
    );
  }

  // Process
  let results: SkipTraceResult[];
  if (inputs.length === 1) {
    results = [await skipTracePerson(inputs[0])];
  } else {
    results = await bulkSkipTrace(inputs);
  }

  // Increment usage
  incrementUsage(
    results.filter((r) => !r.error?.includes("validation")).length,
  );

  // Stats
  const successful = results.filter((r) => r.success);
  const withMobile = successful.filter((r) => r.mobile);
  const withEmail = successful.filter((r) => r.email);

  console.log(
    `[USBiz Skip Trace] Complete: ${successful.length}/${results.length} matched, ${withMobile.length} mobile, ${withEmail.length} email`,
  );

  // Single response format
  if (!isBatch) {
    return NextResponse.json({
      ...results[0],
      usage: {
        today: dailyUsage.count,
        limit: DAILY_LIMIT,
        remaining: DAILY_LIMIT - dailyUsage.count,
      },
    });
  }

  // Batch response format
  return NextResponse.json({
    success: true,
    results,
    stats: {
      total: results.length,
      matched: successful.length,
      with_mobile: withMobile.length,
      with_email: withEmail.length,
      failed: results.length - successful.length,
    },
    usage: {
      today: dailyUsage.count,
      limit: DAILY_LIMIT,
      remaining: DAILY_LIMIT - dailyUsage.count,
    },
  });
}

/**
 * GET /api/enrichment/usbiz-skip-trace
 * Check API status and usage
 */
export async function GET() {
  const limit = checkDailyLimit(0);

  return NextResponse.json({
    configured: !!REALESTATE_API_KEY,
    vendor: "RealEstateAPI",
    usage: {
      today: dailyUsage.count,
      limit: DAILY_LIMIT,
      remaining: limit.remaining,
    },
    input_schema: {
      full_name: "Owner full name (required) - PERSON ONLY, no LLC/Trust",
      address: "Business property address (required)",
      city: "City (required)",
      state: "State 2-letter code (required)",
      zip: "ZIP code 5 digits (required)",
      record_id: "Optional tracking ID",
    },
    output: {
      mobile: "Primary mobile phone",
      email: "Primary email",
      all_phones: "All valid phones with types",
      all_emails: "All emails with types",
    },
    rules: [
      "NO business names sent to API",
      "NO company identifiers",
      "PERSON + PROPERTY lookup only",
      "Rejects LLC, Trust, Corporate names",
    ],
  });
}
