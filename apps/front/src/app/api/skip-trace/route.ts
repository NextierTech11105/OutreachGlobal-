import { NextRequest, NextResponse } from "next/server";

const REALESTATE_API_KEY = process.env.REAL_ESTATE_API_KEY || process.env.REALESTATE_API_KEY || "";
const SKIP_TRACE_URL = "https://api.realestateapi.com/v1/SkipTrace";
const PROPERTY_DETAIL_URL = "https://api.realestateapi.com/v2/PropertyDetail";

// Daily limit: 5,000 skip traces per day
const DAILY_LIMIT = 5000;
const BATCH_SIZE = 250;

// In-memory daily tracker (would be Redis/DB in production)
const dailyUsage: { date: string; count: number } = {
  date: new Date().toISOString().split("T")[0],
  count: 0,
};

function getDailyUsage(): { date: string; count: number; remaining: number } {
  const today = new Date().toISOString().split("T")[0];
  if (dailyUsage.date !== today) {
    dailyUsage.date = today;
    dailyUsage.count = 0;
  }
  return {
    date: dailyUsage.date,
    count: dailyUsage.count,
    remaining: DAILY_LIMIT - dailyUsage.count,
  };
}

function incrementUsage(amount: number): boolean {
  const usage = getDailyUsage();
  if (usage.remaining < amount) {
    return false;
  }
  dailyUsage.count += amount;
  return true;
}

export interface SkipTraceInput {
  // Person info for skip tracing
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  // OR property ID to get owner info first
  propertyId?: string;
  id?: string;
}

export interface SkipTraceResult {
  input: SkipTraceInput;
  ownerName: string;
  firstName?: string;
  lastName?: string;
  phones: Array<{
    number: string;
    type?: string;
    score?: number;
  }>;
  emails: Array<{
    email: string;
    type?: string;
  }>;
  addresses: Array<{
    street: string;
    city: string;
    state: string;
    zip: string;
    type?: string;
  }>;
  relatives?: string[];
  associates?: string[];
  success: boolean;
  error?: string;
  rawData?: Record<string, unknown>;
}

// Skip trace a person using RealEstateAPI SkipTrace endpoint
async function skipTracePerson(input: SkipTraceInput): Promise<SkipTraceResult> {
  try {
    // If property ID provided, first get owner info
    let personData = {
      firstName: input.firstName,
      lastName: input.lastName,
      address: input.address,
      city: input.city,
      state: input.state,
      zip: input.zip,
    };

    if ((input.propertyId || input.id) && !input.firstName) {
      // Get property details to find owner
      const propResponse = await fetch(PROPERTY_DETAIL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": REALESTATE_API_KEY,
        },
        body: JSON.stringify({ id: input.propertyId || input.id }),
      });

      if (!propResponse.ok) {
        return {
          input,
          ownerName: "",
          phones: [],
          emails: [],
          addresses: [],
          success: false,
          error: `Property not found: ${propResponse.status}`,
        };
      }

      const propData = await propResponse.json();
      const prop = propData.data || propData;

      // Extract owner info from property
      personData = {
        firstName: prop.owner1FirstName || prop.ownerFirstName || "",
        lastName: prop.owner1LastName || prop.ownerLastName || "",
        address: prop.mailingAddress?.street || prop.address?.street || "",
        city: prop.mailingAddress?.city || prop.address?.city || "",
        state: prop.mailingAddress?.state || prop.address?.state || "",
        zip: prop.mailingAddress?.zip || prop.address?.zip || "",
      };
    }

    if (!personData.firstName && !personData.lastName && !personData.address) {
      return {
        input,
        ownerName: "",
        phones: [],
        emails: [],
        addresses: [],
        success: false,
        error: "Need firstName/lastName or address for skip trace",
      };
    }

    // Call SkipTrace API - v1 format per RealEstateAPI docs
    const skipTraceBody: Record<string, unknown> = {};
    if (personData.firstName) skipTraceBody.first_name = personData.firstName;
    if (personData.lastName) skipTraceBody.last_name = personData.lastName;
    if (personData.address) skipTraceBody.address = personData.address;
    if (personData.city) skipTraceBody.city = personData.city;
    if (personData.state) skipTraceBody.state = personData.state;
    if (personData.zip) skipTraceBody.zip = personData.zip;

    const response = await fetch(SKIP_TRACE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
        "Accept": "application/json",
      },
      body: JSON.stringify(skipTraceBody),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        input,
        ownerName: [personData.firstName, personData.lastName].filter(Boolean).join(" "),
        phones: [],
        emails: [],
        addresses: [],
        success: false,
        error: data.message || `Skip trace failed: ${response.status}`,
      };
    }

    const result = data.data || data;

    // Parse phones
    const phones: SkipTraceResult["phones"] = [];
    if (result.phones && Array.isArray(result.phones)) {
      phones.push(...result.phones.map((p: { number?: string; phoneNumber?: string; type?: string; score?: number }) => ({
        number: p.number || p.phoneNumber || "",
        type: p.type,
        score: p.score,
      })));
    }
    // Also check for flat phone fields
    if (result.phone) phones.push({ number: result.phone, type: "primary" });
    if (result.mobilePhone) phones.push({ number: result.mobilePhone, type: "mobile" });
    if (result.homePhone) phones.push({ number: result.homePhone, type: "home" });
    if (result.workPhone) phones.push({ number: result.workPhone, type: "work" });

    // Parse emails
    const emails: SkipTraceResult["emails"] = [];
    if (result.emails && Array.isArray(result.emails)) {
      emails.push(...result.emails.map((e: { email?: string; address?: string; type?: string }) => ({
        email: e.email || e.address || "",
        type: e.type,
      })));
    }
    if (result.email) emails.push({ email: result.email, type: "primary" });

    // Parse addresses
    const addresses: SkipTraceResult["addresses"] = [];
    if (result.addresses && Array.isArray(result.addresses)) {
      addresses.push(...result.addresses.map((a: { street?: string; address?: string; city?: string; state?: string; zip?: string; type?: string }) => ({
        street: a.street || a.address || "",
        city: a.city || "",
        state: a.state || "",
        zip: a.zip || "",
        type: a.type,
      })));
    }
    if (result.currentAddress) {
      addresses.push({
        street: result.currentAddress.street || result.currentAddress.address || "",
        city: result.currentAddress.city || "",
        state: result.currentAddress.state || "",
        zip: result.currentAddress.zip || "",
        type: "current",
      });
    }

    return {
      input,
      ownerName: result.name || [result.firstName, result.lastName].filter(Boolean).join(" ") ||
                 [personData.firstName, personData.lastName].filter(Boolean).join(" "),
      firstName: result.firstName || personData.firstName,
      lastName: result.lastName || personData.lastName,
      phones: phones.filter(p => p.number),
      emails: emails.filter(e => e.email),
      addresses: addresses.filter(a => a.street),
      relatives: result.relatives || result.relativeNames,
      associates: result.associates || result.associateNames,
      success: true,
      rawData: result,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Skip trace failed";
    return {
      input,
      ownerName: "",
      phones: [],
      emails: [],
      addresses: [],
      success: false,
      error: message,
    };
  }
}

// POST - Skip trace people (by name/address or property ID)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Support multiple input formats:
    // 1. Single: { firstName, lastName, address, city, state, zip }
    // 2. Single by property: { id } or { propertyId }
    // 3. Batch: { people: [...] } or { ids: [...] }

    let inputs: SkipTraceInput[] = [];

    if (body.people && Array.isArray(body.people)) {
      inputs = body.people;
    } else if (body.ids && Array.isArray(body.ids)) {
      inputs = body.ids.map((id: string) => ({ propertyId: String(id) }));
    } else if (body.id || body.propertyId || body.firstName || body.lastName || body.address) {
      inputs = [body];
    }

    if (inputs.length === 0) {
      return NextResponse.json({
        error: "Provide person info (firstName, lastName, address) or property ID",
        example: {
          single: { firstName: "John", lastName: "Smith", address: "123 Main St", city: "Miami", state: "FL", zip: "33101" },
          byProperty: { id: "property-id-here" },
          batch: { people: [{ firstName: "John", lastName: "Smith" }] },
          batchByIds: { ids: ["property-id-1", "property-id-2"] },
        }
      }, { status: 400 });
    }

    // Check daily limit
    const usage = getDailyUsage();
    const requestedCount = Math.min(inputs.length, BATCH_SIZE);

    if (usage.remaining < requestedCount) {
      return NextResponse.json({
        error: "Daily skip trace limit reached",
        dailyLimit: DAILY_LIMIT,
        used: usage.count,
        remaining: usage.remaining,
      }, { status: 429 });
    }

    // Limit batch size
    const batchInputs = inputs.slice(0, BATCH_SIZE);
    const results: SkipTraceResult[] = [];

    console.log(`[Skip Trace] Processing ${batchInputs.length} people (${usage.count}/${DAILY_LIMIT} used today)`);

    // Process in parallel with concurrency limit
    const concurrency = 5;
    for (let i = 0; i < batchInputs.length; i += concurrency) {
      const batch = batchInputs.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map(skipTracePerson));
      results.push(...batchResults);

      if (i + concurrency < batchInputs.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    // Increment usage
    incrementUsage(batchInputs.length);

    // Stats
    const successful = results.filter(r => r.success);
    const withPhones = successful.filter(r => r.phones.length > 0);
    const withEmails = successful.filter(r => r.emails.length > 0);

    console.log(`[Skip Trace] Complete: ${successful.length}/${batchInputs.length} success, ${withPhones.length} with phones, ${withEmails.length} with emails`);

    // Return single result if single input
    if (inputs.length === 1) {
      return NextResponse.json({
        success: results[0]?.success || false,
        ...results[0],
        usage: {
          today: dailyUsage.count,
          limit: DAILY_LIMIT,
          remaining: DAILY_LIMIT - dailyUsage.count,
        },
      });
    }

    // Add the property ID to each result for client-side matching
    const resultsWithIds = results.map((r, idx) => ({
      ...r,
      id: batchInputs[idx]?.propertyId || batchInputs[idx]?.id || r.input?.propertyId || r.input?.id,
    }));

    return NextResponse.json({
      success: true,
      results: resultsWithIds,
      stats: {
        requested: batchInputs.length,
        successful: successful.length,
        withPhones: withPhones.length,
        withEmails: withEmails.length,
        failed: batchInputs.length - successful.length,
      },
      usage: {
        today: dailyUsage.count,
        limit: DAILY_LIMIT,
        remaining: DAILY_LIMIT - dailyUsage.count,
      },
    });
  } catch (error: unknown) {
    console.error("[Skip Trace] Error:", error);
    const message = error instanceof Error ? error.message : "Skip trace failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - Check daily usage
export async function GET() {
  const usage = getDailyUsage();
  return NextResponse.json({
    date: usage.date,
    used: usage.count,
    limit: DAILY_LIMIT,
    remaining: usage.remaining,
    batchSize: BATCH_SIZE,
  });
}
