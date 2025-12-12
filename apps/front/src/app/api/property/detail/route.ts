import { NextRequest, NextResponse } from "next/server";

const REALESTATE_API_KEY =
  process.env.REAL_ESTATE_API_KEY || process.env.REALESTATE_API_KEY || "";
const REALESTATE_API_URL = "https://api.realestateapi.com/v2/PropertyDetail";
const SKIP_TRACE_URL = "https://api.realestateapi.com/v2/SkipTrace";

// Daily usage tracking for batch limits (5,000/day)
const dailyUsage = new Map<string, { detail: number; skipTrace: number }>();
const DAILY_LIMIT = 5000;

function getTodayUsage(): {
  detail: number;
  skipTrace: number;
  date: string;
  remaining: number;
} {
  const today = new Date().toISOString().split("T")[0];
  const usage = dailyUsage.get(today) || { detail: 0, skipTrace: 0 };
  return { ...usage, date: today, remaining: DAILY_LIMIT - usage.detail };
}

function incrementUsage(type: "detail" | "skipTrace", count: number = 1) {
  const today = new Date().toISOString().split("T")[0];
  const usage = dailyUsage.get(today) || { detail: 0, skipTrace: 0 };
  usage[type] += count;
  dailyUsage.set(today, usage);
}

// Skip trace a property owner using owner name + property address
// RealEstateAPI SkipTrace requires: first_name, last_name, address, city, state, zip
interface PropertyOwnerInfo {
  owner1FirstName?: string;
  owner1LastName?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  address?:
    | string
    | {
        address?: string;
        street?: string;
        label?: string;
        city?: string;
        state?: string;
        zip?: string;
      };
  propertyInfo?: {
    address?: {
      address?: string;
      street?: string;
      label?: string;
      city?: string;
      state?: string;
      zip?: string;
    };
  };
}

async function performSkipTrace(
  propertyId: string,
  ownerInfo?: PropertyOwnerInfo,
): Promise<{
  phones: string[];
  emails: string[];
  ownerName?: string;
  mailingAddress?: string;
} | null> {
  try {
    // Extract owner name - try multiple field names
    const firstName =
      ownerInfo?.owner1FirstName || ownerInfo?.ownerFirstName || "";
    const lastName =
      ownerInfo?.owner1LastName || ownerInfo?.ownerLastName || "";

    // Extract address - handle nested structure
    const propAddress = ownerInfo?.propertyInfo?.address || ownerInfo?.address;
    let addressStr = "";
    let city = "";
    let state = "";
    let zip = "";

    if (typeof propAddress === "string") {
      addressStr = propAddress;
    } else if (propAddress) {
      addressStr =
        propAddress.address || propAddress.street || propAddress.label || "";
      city = propAddress.city || "";
      state = propAddress.state || "";
      zip = propAddress.zip || "";
    }

    console.log("[Skip Trace] Input:", {
      firstName,
      lastName,
      addressStr,
      city,
      state,
      zip,
      propertyId,
    });

    // Need at least name OR address for skip trace
    if (!firstName && !lastName && !addressStr) {
      console.error("[Skip Trace] No owner info available for skip trace");
      return null;
    }

    // Build skip trace request body per RealEstateAPI docs
    // Uses FLAT address fields (address, city, state, zip)
    const skipTraceBody: Record<string, unknown> = {};
    if (firstName) skipTraceBody.first_name = firstName;
    if (lastName) skipTraceBody.last_name = lastName;
    if (addressStr) skipTraceBody.address = addressStr;
    if (city) skipTraceBody.city = city;
    if (state) skipTraceBody.state = state;
    if (zip) skipTraceBody.zip = zip;

    // Only want matches with phones
    skipTraceBody.match_requirements = { phones: true };

    console.log(
      "[Skip Trace] Calling API with:",
      JSON.stringify(skipTraceBody, null, 2),
    );

    const response = await fetch(SKIP_TRACE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
        Accept: "application/json",
      },
      body: JSON.stringify(skipTraceBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Skip Trace] API error:", response.status, data);
      return null;
    }

    // RealEstateAPI response format: { output: { identity: { phones, emails, address, names } } }
    const identity = data.output?.identity || {};
    const isMatch = data.match === true;

    console.log("[Skip Trace] Result:", {
      match: isMatch,
      phones: identity.phones?.length || 0,
      emails: identity.emails?.length || 0,
    });

    incrementUsage("skipTrace");

    // Parse phones from identity.phones
    // Format: { phone: "7032371234", phoneDisplay: "(703) 237-1234", phoneType: "landline", isConnected: true, doNotCall: false }
    const phones: string[] = [];
    if (identity.phones && Array.isArray(identity.phones)) {
      for (const p of identity.phones) {
        // Skip Do Not Call and disconnected numbers
        if (p.doNotCall === true || p.isConnected === false) continue;
        const num = p.phone || p.phoneDisplay?.replace(/\D/g, "") || "";
        if (num) phones.push(num);
      }
    }

    // Parse emails from identity.emails
    // Format: { email: "john@email.com", emailType: "personal" }
    const emails: string[] = [];
    if (identity.emails && Array.isArray(identity.emails)) {
      for (const e of identity.emails) {
        if (e.email) emails.push(e.email);
      }
    }

    // Get owner name from identity.names
    const names = identity.names || [];
    const primaryName = names[0];
    const ownerName =
      primaryName?.fullName ||
      [primaryName?.firstName, primaryName?.lastName]
        .filter(Boolean)
        .join(" ") ||
      [firstName, lastName].filter(Boolean).join(" ");

    // Get mailing address from identity.address
    const mailingAddress = identity.address?.formattedAddress;

    return {
      phones: [...new Set(phones)], // Dedupe
      emails: [...new Set(emails)], // Dedupe
      ownerName,
      mailingAddress,
    };
  } catch (error) {
    console.error("[Skip Trace] Error:", error);
    return null;
  }
}

// GET single property detail with optional auto skip trace
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const autoSkipTrace = searchParams.get("skipTrace") !== "false";
    const checkUsage = searchParams.get("usage") === "true";

    // Check usage only
    if (checkUsage) {
      return NextResponse.json({ success: true, usage: getTodayUsage() });
    }

    if (!id) {
      return NextResponse.json(
        { error: "Property ID required" },
        { status: 400 },
      );
    }

    const usage = getTodayUsage();
    if (usage.remaining <= 0) {
      return NextResponse.json(
        { error: "Daily limit reached", usage },
        { status: 429 },
      );
    }

    const response = await fetch(REALESTATE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify({ id }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "Failed to get property detail" },
        { status: response.status },
      );
    }

    incrementUsage("detail");
    const property = data.data || data;

    // Auto skip trace the OWNER using owner info + property address
    if (autoSkipTrace) {
      // Extract owner info from property detail response
      const ownerInfo = property.ownerInfo || {};
      const propInfo = property.propertyInfo || {};
      const propAddress = propInfo.address || property.address;

      console.log("[Property Detail] Owner info found:", {
        owner1FirstName: ownerInfo.owner1FirstName || property.owner1FirstName,
        owner1LastName: ownerInfo.owner1LastName || property.owner1LastName,
        address: propAddress,
      });

      const skipTraceData = await performSkipTrace(property.id, {
        owner1FirstName:
          ownerInfo.owner1FirstName ||
          property.owner1FirstName ||
          property.ownerFirstName,
        owner1LastName:
          ownerInfo.owner1LastName ||
          property.owner1LastName ||
          property.ownerLastName,
        propertyInfo: { address: propAddress },
      });

      if (skipTraceData) {
        property.phones = skipTraceData.phones;
        property.emails = skipTraceData.emails;
        property.ownerName = skipTraceData.ownerName || property.ownerName;
        property.mailingAddress = skipTraceData.mailingAddress;
        property.skipTracedAt = new Date().toISOString();
      }
    }

    return NextResponse.json({
      success: true,
      property,
      usage: getTodayUsage(),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Property detail failed";
    console.error("Property detail error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST property details - batch processing with auto skip trace
// Limits: 250 per batch, 2K micro-campaign block, 5K per phone number per day
const BATCH_SIZE = 250;
const MICRO_CAMPAIGN_LIMIT = 2000;
const PER_NUMBER_DAILY_LIMIT = 5000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ids, autoSkipTrace = true, phoneNumberId } = body;

    // Support single id or array of ids
    let idList: string[] = [];
    if (id) {
      idList = [String(id)];
    } else if (ids && Array.isArray(ids)) {
      idList = ids.map(String);
    }

    if (idList.length === 0) {
      return NextResponse.json(
        { error: "id or ids required" },
        { status: 400 },
      );
    }

    const usage = getTodayUsage();

    // If single ID, return single result with skip trace
    if (idList.length === 1) {
      if (usage.remaining <= 0) {
        return NextResponse.json(
          { error: "Daily limit reached", usage },
          { status: 429 },
        );
      }

      const response = await fetch(REALESTATE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": REALESTATE_API_KEY,
        },
        body: JSON.stringify({ id: idList[0] }),
      });

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { error: data.message || "Failed to get property detail" },
          { status: response.status },
        );
      }

      incrementUsage("detail");
      const property = data.data || data;

      // Auto skip trace the OWNER after detail fetch
      if (autoSkipTrace) {
        const ownerInfo = property.ownerInfo || {};
        const propInfo = property.propertyInfo || {};
        const propAddress = propInfo.address || property.address;

        const skipTraceData = await performSkipTrace(property.id, {
          owner1FirstName:
            ownerInfo.owner1FirstName ||
            property.owner1FirstName ||
            property.ownerFirstName,
          owner1LastName:
            ownerInfo.owner1LastName ||
            property.owner1LastName ||
            property.ownerLastName,
          propertyInfo: { address: propAddress },
        });

        if (skipTraceData) {
          property.phones = skipTraceData.phones;
          property.emails = skipTraceData.emails;
          property.ownerName = skipTraceData.ownerName || property.ownerName;
          property.mailingAddress = skipTraceData.mailingAddress;
          property.skipTracedAt = new Date().toISOString();
          property.skipTraceCost = skipTraceData.phones.length > 0 ? 0.05 : 0;
        }
      }

      return NextResponse.json({
        success: true,
        property,
        usage: getTodayUsage(),
      });
    }

    // BATCH PROCESSING: 250 per batch, stop at 2K micro-campaign block
    const maxToProcess = Math.min(
      idList.length,
      MICRO_CAMPAIGN_LIMIT,
      usage.remaining,
    );
    const batchIds = idList.slice(0, Math.min(BATCH_SIZE, maxToProcess));

    console.log(
      `[Property Detail] Processing batch: ${batchIds.length} of ${idList.length} (max ${maxToProcess})`,
    );

    const results: any[] = [];
    const errors: string[] = [];
    let totalSkipTraceCost = 0;

    // Fetch details in parallel with concurrency limit
    const concurrency = 10;
    for (let i = 0; i < batchIds.length; i += concurrency) {
      const batch = batchIds.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(async (propId: string) => {
          try {
            const response = await fetch(REALESTATE_API_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": REALESTATE_API_KEY,
              },
              body: JSON.stringify({ id: String(propId) }),
            });

            if (!response.ok) {
              errors.push(`${propId}: ${response.status}`);
              return null;
            }

            const data = await response.json();
            incrementUsage("detail");
            const property = data.data || data;

            // Auto skip trace the OWNER after each detail fetch
            if (autoSkipTrace) {
              const ownerInfo = property.ownerInfo || {};
              const propInfo = property.propertyInfo || {};
              const propAddress = propInfo.address || property.address;

              const skipTraceData = await performSkipTrace(property.id, {
                owner1FirstName:
                  ownerInfo.owner1FirstName ||
                  property.owner1FirstName ||
                  property.ownerFirstName,
                owner1LastName:
                  ownerInfo.owner1LastName ||
                  property.owner1LastName ||
                  property.ownerLastName,
                propertyInfo: { address: propAddress },
              });

              if (skipTraceData) {
                property.phones = skipTraceData.phones;
                property.emails = skipTraceData.emails;
                property.ownerName =
                  skipTraceData.ownerName || property.ownerName;
                property.mailingAddress = skipTraceData.mailingAddress;
                property.skipTracedAt = new Date().toISOString();
                property.skipTraceCost =
                  skipTraceData.phones.length > 0 ? 0.05 : 0;
                totalSkipTraceCost += property.skipTraceCost;
              }
            }

            return property;
          } catch (err: any) {
            errors.push(`${propId}: ${err.message}`);
            return null;
          }
        }),
      );

      results.push(...batchResults.filter(Boolean));

      // Small delay between batches to avoid rate limits
      if (i + concurrency < batchIds.length) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    const updatedUsage = getTodayUsage();
    const remainingIds = idList.slice(batchIds.length);
    const hitMicroCampaignLimit = results.length >= MICRO_CAMPAIGN_LIMIT;

    return NextResponse.json({
      success: true,
      results,
      stats: {
        processed: results.length,
        withPhones: results.filter((r) => r.phones && r.phones.length > 0)
          .length,
        withEmails: results.filter((r) => r.emails && r.emails.length > 0)
          .length,
        errors: errors.length,
        skipTraceCost: totalSkipTraceCost,
      },
      batch: {
        size: BATCH_SIZE,
        microCampaignLimit: MICRO_CAMPAIGN_LIMIT,
        perNumberDailyLimit: PER_NUMBER_DAILY_LIMIT,
        hitLimit: hitMicroCampaignLimit,
      },
      remaining: remainingIds.length,
      nextBatchIds: remainingIds.slice(0, BATCH_SIZE),
      usage: updatedUsage,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Batch property detail error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
