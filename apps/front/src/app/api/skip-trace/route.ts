import { NextRequest, NextResponse } from "next/server";
import { smsQueueService } from "@/lib/services/sms-queue-service";

const REALESTATE_API_KEY = process.env.REAL_ESTATE_API_KEY || process.env.REALESTATE_API_KEY || "";
const SKIP_TRACE_URL = "https://api.realestateapi.com/v1/SkipTrace";
const SKIP_TRACE_BATCH_AWAIT_URL = "https://api.realestateapi.com/v1/SkipTraceBatchAwait";
const PROPERTY_DETAIL_URL = "https://api.realestateapi.com/v2/PropertyDetail";

// Daily limit: 2,000 skip traces per day (matching SMS queue limit)
const DAILY_LIMIT = 2000;
const BATCH_SIZE = 250;
const BULK_BATCH_SIZE = 1000; // RealEstateAPI allows up to 1,000 per bulk call

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

    if (input.propertyId || input.id) {
      // CRITICAL: Get property details to get owner name AND property address
      // Skip trace works best with BOTH owner name + property address
      console.log("[Skip Trace] Getting property detail for ID:", input.propertyId || input.id);

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
      const propInfo = prop.propertyInfo || {};
      const propAddress = propInfo.address || prop.address || {};
      const ownerInfo = prop.ownerInfo || {};

      console.log("[Skip Trace] Property owner info:", {
        owner1FirstName: ownerInfo.owner1FirstName || prop.owner1FirstName,
        owner1LastName: ownerInfo.owner1LastName || prop.owner1LastName,
        ownerOccupied: prop.ownerOccupied,
        address: propAddress,
      });

      // Use BOTH owner name AND property address for best skip trace results
      personData = {
        firstName: input.firstName || ownerInfo.owner1FirstName || prop.owner1FirstName || prop.ownerFirstName || "",
        lastName: input.lastName || ownerInfo.owner1LastName || prop.owner1LastName || prop.ownerLastName || "",
        // IMPORTANT: Use property address (not mailing) for skip trace
        address: input.address || propAddress.address || propAddress.street || propAddress.label || "",
        city: input.city || propAddress.city || "",
        state: input.state || propAddress.state || "",
        zip: input.zip || propAddress.zip || "",
      };

      console.log("[Skip Trace] Will skip trace with:", personData);
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
    // Uses FLAT address fields (address, city, state, zip)
    const skipTraceBody: Record<string, unknown> = {};
    if (personData.firstName) skipTraceBody.first_name = personData.firstName;
    if (personData.lastName) skipTraceBody.last_name = personData.lastName;
    if (personData.address) skipTraceBody.address = personData.address;
    if (personData.city) skipTraceBody.city = personData.city;
    if (personData.state) skipTraceBody.state = personData.state;
    if (personData.zip) skipTraceBody.zip = personData.zip;

    // Add match_requirements to only get results with phones
    skipTraceBody.match_requirements = { phones: true };

    console.log("[Skip Trace] Calling API with body:", JSON.stringify(skipTraceBody, null, 2));

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
        error: data.message || data.responseMessage || `Skip trace failed: ${response.status}`,
      };
    }

    // RealEstateAPI response format: { output: { identity: { phones, emails, address, names } } }
    const identity = data.output?.identity || {};
    const demographics = data.output?.demographics || {};
    const isMatch = data.match === true;

    console.log("[Skip Trace] Response match:", isMatch, "phones:", identity.phones?.length || 0);

    // Parse phones from identity.phones array
    // Format: { phone: "7032371234", phoneDisplay: "(703) 237-1234", phoneType: "landline", isConnected: true, doNotCall: false }
    const phones: SkipTraceResult["phones"] = [];
    if (identity.phones && Array.isArray(identity.phones)) {
      for (const p of identity.phones) {
        // Skip Do Not Call numbers and disconnected numbers
        if (p.doNotCall === true || p.isConnected === false) continue;
        phones.push({
          number: p.phone || p.phoneDisplay?.replace(/\D/g, "") || "",
          type: p.phoneType || "unknown",
          score: undefined,
        });
      }
    }

    // Parse emails from identity.emails array
    // Format: { email: "john@email.com", emailType: "personal" }
    const emails: SkipTraceResult["emails"] = [];
    if (identity.emails && Array.isArray(identity.emails)) {
      for (const e of identity.emails) {
        if (e.email) {
          emails.push({
            email: e.email,
            type: e.emailType || "personal",
          });
        }
      }
    }

    // Parse current address from identity.address
    // Format: { house, street, city, state, zip, formattedAddress }
    const addresses: SkipTraceResult["addresses"] = [];
    if (identity.address) {
      const a = identity.address;
      addresses.push({
        street: a.formattedAddress || [a.house, a.preDir, a.street, a.strType].filter(Boolean).join(" "),
        city: a.city || "",
        state: a.state || "",
        zip: a.zip || "",
        type: "current",
      });
    }
    // Also add address history
    if (identity.addressHistory && Array.isArray(identity.addressHistory)) {
      for (const a of identity.addressHistory) {
        addresses.push({
          street: a.formattedAddress || [a.house, a.preDir, a.street, a.strType].filter(Boolean).join(" "),
          city: a.city || "",
          state: a.state || "",
          zip: a.zip || "",
          type: "previous",
        });
      }
    }

    // Get owner name from identity.names or demographics.names
    const names = identity.names || demographics.names || [];
    const primaryName = names[0];
    const ownerName = primaryName?.fullName ||
      [primaryName?.firstName, primaryName?.lastName].filter(Boolean).join(" ") ||
      [personData.firstName, personData.lastName].filter(Boolean).join(" ");

    return {
      input,
      ownerName,
      firstName: primaryName?.firstName || personData.firstName,
      lastName: primaryName?.lastName || personData.lastName,
      phones: phones.filter(p => p.number),
      emails: emails.filter(e => e.email),
      addresses: addresses.filter(a => a.street),
      relatives: data.output?.relationships?.map((r: { name?: string }) => r.name).filter(Boolean),
      associates: undefined,
      success: isMatch && phones.length > 0,
      rawData: data,
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

// ============ BULK SKIP TRACE USING SkipTraceBatchAwait ============
// RealEstateAPI allows up to 1,000 skip traces in one API call using the Await endpoint
// This is much faster than calling single skip trace endpoint in a loop

interface BulkSkipInput {
  key: string; // Unique identifier (property ID)
  first_name: string;
  last_name: string;
  // SkipTraceBatchAwait uses FLAT address fields per official docs
  address: string;  // Street address
  city: string;
  state: string;
  zip: string;
}

interface BulkSkipResponse {
  key: string;
  input: BulkSkipInput;
  // Response format: { output: { identity: { phones, emails, address, names }, demographics: {...} } }
  output?: {
    identity?: {
      names?: Array<{ firstName: string; lastName: string; fullName: string }>;
      phones?: Array<{ phone: string; phoneDisplay: string; phoneType: string; isConnected: boolean; doNotCall: boolean }>;
      emails?: Array<{ email: string; emailType: string }>;
      address?: { formattedAddress: string; city: string; state: string; zip: string };
      addressHistory?: Array<{ formattedAddress: string; city: string; state: string; zip: string }>;
    };
    demographics?: {
      age?: number;
      gender?: string;
      names?: Array<{ firstName: string; lastName: string; fullName: string }>;
    };
    relationships?: Array<{ name: string }>;
  };
  error?: string;
  match?: boolean;
}

// Bulk skip trace using the Await endpoint (no webhooks needed)
async function bulkSkipTrace(propertyIds: string[]): Promise<{
  results: SkipTraceResult[];
  stats: { total: number; matched: number; withPhones: number; withEmails: number; errors: number };
}> {
  console.log(`[Bulk Skip Trace] Starting batch of ${propertyIds.length} properties`);

  // Step 1: Get property details to extract owner info for each
  const skipInputs: BulkSkipInput[] = [];
  const propertyDataMap: Map<string, Record<string, unknown>> = new Map();

  // Fetch property details in parallel (batches of 20)
  const detailConcurrency = 20;
  for (let i = 0; i < propertyIds.length; i += detailConcurrency) {
    const batch = propertyIds.slice(i, i + detailConcurrency);

    const detailPromises = batch.map(async (propId) => {
      try {
        const response = await fetch(PROPERTY_DETAIL_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": REALESTATE_API_KEY,
          },
          body: JSON.stringify({ id: propId }),
        });

        if (!response.ok) {
          console.warn(`[Bulk Skip Trace] Failed to get detail for ${propId}: ${response.status}`);
          return null;
        }

        const data = await response.json();
        return { propId, data: data.data || data };
      } catch (err) {
        console.error(`[Bulk Skip Trace] Error fetching detail for ${propId}:`, err);
        return null;
      }
    });

    const results = await Promise.all(detailPromises);

    for (const result of results) {
      if (!result) continue;

      const { propId, data } = result;
      propertyDataMap.set(propId, data);

      const ownerInfo = data.ownerInfo || {};
      const propInfo = data.propertyInfo || {};
      const propAddress = propInfo.address || data.address || {};

      // Extract owner name components
      const firstName = ownerInfo.owner1FirstName || data.owner1FirstName || data.ownerFirstName || "";
      const lastName = ownerInfo.owner1LastName || data.owner1LastName || data.ownerLastName || "";

      // Extract address components
      const addressStr = propAddress.address || propAddress.street || propAddress.label || "";
      const city = propAddress.city || "";
      const state = propAddress.state || "";
      const zip = propAddress.zip || "";

      // Need at least some name or address info
      if ((firstName || lastName) && addressStr) {
        skipInputs.push({
          key: propId,
          first_name: firstName,
          last_name: lastName,
          // SkipTraceBatchAwait uses FLAT address fields
          address: addressStr,
          city,
          state,
          zip,
        });
      } else {
        console.warn(`[Bulk Skip Trace] Skipping ${propId} - insufficient data: name="${firstName} ${lastName}", address="${addressStr}"`);
      }
    }

    // Brief delay between detail batches
    if (i + detailConcurrency < propertyIds.length) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  console.log(`[Bulk Skip Trace] Got owner info for ${skipInputs.length}/${propertyIds.length} properties`);

  if (skipInputs.length === 0) {
    return {
      results: [],
      stats: { total: 0, matched: 0, withPhones: 0, withEmails: 0, errors: propertyIds.length },
    };
  }

  // Step 2: Call SkipTraceBatchAwait API
  // Max 1,000 per call, we'll chunk if needed
  const allResults: SkipTraceResult[] = [];
  const chunkSize = BULK_BATCH_SIZE;

  for (let i = 0; i < skipInputs.length; i += chunkSize) {
    const chunk = skipInputs.slice(i, i + chunkSize);

    console.log(`[Bulk Skip Trace] Calling SkipTraceBatchAwait with ${chunk.length} records (chunk ${Math.floor(i / chunkSize) + 1})`);

    try {
      const response = await fetch(SKIP_TRACE_BATCH_AWAIT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": REALESTATE_API_KEY,
          "Accept": "application/json",
        },
        body: JSON.stringify({ skips: chunk }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[Bulk Skip Trace] Batch API error: ${response.status}`, errorData);
        // Mark all as failed
        for (const input of chunk) {
          allResults.push({
            input: { propertyId: input.key, firstName: input.first_name, lastName: input.last_name },
            ownerName: [input.first_name, input.last_name].filter(Boolean).join(" "),
            phones: [],
            emails: [],
            addresses: [],
            success: false,
            error: `Batch API error: ${response.status}`,
          });
        }
        continue;
      }

      const batchData = await response.json();
      const batchResults: BulkSkipResponse[] = batchData.results || batchData.data || batchData || [];

      console.log(`[Bulk Skip Trace] Batch returned ${batchResults.length} results`);

      // Parse each result - format: { output: { identity: { phones, emails, address }, demographics: {...} } }
      for (const item of batchResults) {
        const propertyData = propertyDataMap.get(item.key) || {};
        const identity = item.output?.identity || {};
        const demographics = item.output?.demographics || {};

        // Parse phones from identity.phones
        // Format: { phone: "7032371234", phoneDisplay: "(703) 237-1234", phoneType: "mobile", isConnected: true, doNotCall: false }
        const phones: SkipTraceResult["phones"] = [];
        if (identity.phones && Array.isArray(identity.phones)) {
          for (const p of identity.phones) {
            // Skip Do Not Call and disconnected numbers
            if (p.doNotCall === true || p.isConnected === false) continue;
            phones.push({
              number: p.phone || p.phoneDisplay?.replace(/\D/g, "") || "",
              type: p.phoneType || "unknown",
              score: undefined,
            });
          }
        }

        // Parse emails from identity.emails
        // Format: { email: "john@email.com", emailType: "personal" }
        const emails: SkipTraceResult["emails"] = [];
        if (identity.emails && Array.isArray(identity.emails)) {
          for (const e of identity.emails) {
            if (e.email) {
              emails.push({
                email: e.email,
                type: e.emailType || "personal",
              });
            }
          }
        }

        // Parse addresses from identity.address and addressHistory
        const addresses: SkipTraceResult["addresses"] = [];
        if (identity.address) {
          addresses.push({
            street: identity.address.formattedAddress || "",
            city: identity.address.city || "",
            state: identity.address.state || "",
            zip: identity.address.zip || "",
            type: "current",
          });
        }
        if (identity.addressHistory && Array.isArray(identity.addressHistory)) {
          for (const a of identity.addressHistory) {
            addresses.push({
              street: a.formattedAddress || "",
              city: a.city || "",
              state: a.state || "",
              zip: a.zip || "",
              type: "previous",
            });
          }
        }

        const inputData = item.input || chunk.find(c => c.key === item.key);
        const names = identity.names || demographics.names || [];
        const primaryName = names[0];
        const ownerName = primaryName?.fullName ||
          [primaryName?.firstName, primaryName?.lastName].filter(Boolean).join(" ") ||
          [inputData?.first_name, inputData?.last_name].filter(Boolean).join(" ");

        allResults.push({
          input: {
            propertyId: item.key,
            firstName: inputData?.first_name,
            lastName: inputData?.last_name,
            address: inputData?.address,
            city: inputData?.city,
            state: inputData?.state,
            zip: inputData?.zip,
          },
          ownerName,
          firstName: primaryName?.firstName || inputData?.first_name,
          lastName: primaryName?.lastName || inputData?.last_name,
          phones,
          emails,
          addresses,
          relatives: item.output?.relationships?.map((r: { name?: string }) => r.name).filter(Boolean),
          associates: undefined,
          success: item.match !== false && !item.error && phones.length > 0,
          error: item.error,
          rawData: { ...item.output, propertyData },
        });
      }
    } catch (err) {
      console.error(`[Bulk Skip Trace] Chunk error:`, err);
      // Mark chunk as failed
      for (const input of chunk) {
        allResults.push({
          input: { propertyId: input.key, firstName: input.first_name, lastName: input.last_name },
          ownerName: [input.first_name, input.last_name].filter(Boolean).join(" "),
          phones: [],
          emails: [],
          addresses: [],
          success: false,
          error: err instanceof Error ? err.message : "Bulk skip trace failed",
        });
      }
    }

    // Brief delay between chunks
    if (i + chunkSize < skipInputs.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Calculate stats
  const matched = allResults.filter(r => r.success).length;
  const withPhones = allResults.filter(r => r.phones.length > 0).length;
  const withEmails = allResults.filter(r => r.emails.length > 0).length;
  const errors = allResults.filter(r => !r.success).length;

  console.log(`[Bulk Skip Trace] Complete: ${matched}/${allResults.length} matched, ${withPhones} with phones, ${withEmails} with emails`);

  return {
    results: allResults,
    stats: { total: allResults.length, matched, withPhones, withEmails, errors },
  };
}

// POST - Skip trace people (by name/address or property ID)
// Supports: single, batch (sequential), and bulk (SkipTraceBatchAwait)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check for bulk mode flag
    const useBulkApi = body.bulk === true || body.useBulkApi === true;

    // Support multiple input formats:
    // 1. Single: { firstName, lastName, address, city, state, zip }
    // 2. Single by property: { id } or { propertyId }
    // 3. Batch: { people: [...] } or { ids: [...] }
    // 4. Bulk: { ids: [...], bulk: true } - uses SkipTraceBatchAwait API

    let inputs: SkipTraceInput[] = [];
    let propertyIds: string[] = [];

    if (body.people && Array.isArray(body.people)) {
      inputs = body.people;
    } else if (body.ids && Array.isArray(body.ids)) {
      propertyIds = body.ids.map((id: string | number) => String(id));
      inputs = propertyIds.map((id: string) => ({ propertyId: id }));
    } else if (body.id || body.propertyId || body.firstName || body.lastName || body.address) {
      inputs = [body];
      if (body.id || body.propertyId) {
        propertyIds = [String(body.id || body.propertyId)];
      }
    }

    if (inputs.length === 0) {
      return NextResponse.json({
        error: "Provide person info (firstName, lastName, address) or property ID",
        example: {
          single: { firstName: "John", lastName: "Smith", address: "123 Main St", city: "Miami", state: "FL", zip: "33101" },
          byProperty: { id: "property-id-here" },
          batch: { people: [{ firstName: "John", lastName: "Smith" }] },
          batchByIds: { ids: ["property-id-1", "property-id-2"] },
          bulkByIds: { ids: ["id1", "id2", "...up to 1000"], bulk: true },
        }
      }, { status: 400 });
    }

    // Check daily limit
    const usage = getDailyUsage();
    const requestedCount = useBulkApi
      ? Math.min(propertyIds.length, BULK_BATCH_SIZE)
      : Math.min(inputs.length, BATCH_SIZE);

    // ============ BULK MODE: Use SkipTraceBatchAwait API ============
    if (useBulkApi && propertyIds.length > 0) {
      console.log(`[Skip Trace] BULK MODE: Processing ${propertyIds.length} properties via SkipTraceBatchAwait`);

      if (usage.remaining < requestedCount) {
        return NextResponse.json({
          error: "Daily skip trace limit reached",
          dailyLimit: DAILY_LIMIT,
          used: usage.count,
          remaining: usage.remaining,
          requestedCount,
        }, { status: 429 });
      }

      // Limit to daily remaining
      const idsToProcess = propertyIds.slice(0, Math.min(requestedCount, usage.remaining));

      const bulkResult = await bulkSkipTrace(idsToProcess);

      // Increment usage
      incrementUsage(bulkResult.stats.total);

      // Auto-add to SMS queue if requested
      let smsQueueResult = null;
      if (body.addToSmsQueue && body.smsTemplate) {
        const leadsWithMobile = bulkResult.results
          .filter(r => r.success && r.phones.some(p =>
            p.type?.toLowerCase() === "mobile" || p.type?.toLowerCase() === "cell"
          ))
          .map(r => {
            const mobilePhone = r.phones.find(p =>
              p.type?.toLowerCase() === "mobile" || p.type?.toLowerCase() === "cell"
            ) || r.phones[0];

            return {
              leadId: r.input?.propertyId || `lead_${Math.random().toString(36).slice(2)}`,
              phone: mobilePhone?.number || "",
              firstName: r.firstName || r.ownerName?.split(" ")[0] || "",
              lastName: r.lastName || r.ownerName?.split(" ").slice(1).join(" ") || "",
              companyName: body.companyName || "",
              industry: body.industry || "",
            };
          })
          .filter(lead => lead.phone);

        if (leadsWithMobile.length > 0) {
          smsQueueResult = smsQueueService.addBatchToQueue(leadsWithMobile, {
            templateCategory: body.templateCategory || "sms_initial",
            templateMessage: body.smsTemplate,
            personality: body.personality || "brooklyn_bestie",
            campaignId: body.campaignId,
            priority: body.priority || 5,
            scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
          });

          console.log(`[Bulk Skip Trace] Added ${smsQueueResult.added} leads to SMS queue`);
        }
      }

      // Add property ID to each result for client matching
      const resultsWithIds = bulkResult.results.map(r => ({
        ...r,
        id: r.input?.propertyId,
      }));

      return NextResponse.json({
        success: true,
        mode: "bulk",
        apiUsed: "SkipTraceBatchAwait",
        results: resultsWithIds,
        stats: {
          ...bulkResult.stats,
          withMobiles: bulkResult.results.filter(r =>
            r.phones.some(p => p.type?.toLowerCase() === "mobile" || p.type?.toLowerCase() === "cell")
          ).length,
        },
        usage: {
          today: dailyUsage.count,
          limit: DAILY_LIMIT,
          remaining: DAILY_LIMIT - dailyUsage.count,
        },
        remaining: propertyIds.length - idsToProcess.length,
        nextBatchIds: propertyIds.slice(idsToProcess.length, idsToProcess.length + BULK_BATCH_SIZE),
        ...(smsQueueResult && {
          smsQueue: {
            added: smsQueueResult.added,
            skipped: smsQueueResult.skipped,
            queueIds: smsQueueResult.queueIds,
          },
        }),
      });
    }

    // ============ STANDARD MODE: Sequential skip traces ============

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
    const withMobiles = successful.filter(r =>
      r.phones.some(p => p.type?.toLowerCase() === "mobile" || p.type?.toLowerCase() === "cell")
    );
    const withEmails = successful.filter(r => r.emails.length > 0);

    console.log(`[Skip Trace] Complete: ${successful.length}/${batchInputs.length} success, ${withPhones.length} with phones (${withMobiles.length} mobile), ${withEmails.length} with emails`);

    // Auto-add to SMS queue if requested
    let smsQueueResult = null;
    if (body.addToSmsQueue && body.smsTemplate) {
      const leadsWithMobile = successful
        .filter(r => r.phones.some(p =>
          p.type?.toLowerCase() === "mobile" || p.type?.toLowerCase() === "cell"
        ))
        .map((r, idx) => {
          const mobilePhone = r.phones.find(p =>
            p.type?.toLowerCase() === "mobile" || p.type?.toLowerCase() === "cell"
          ) || r.phones[0];

          return {
            leadId: batchInputs[idx]?.propertyId || batchInputs[idx]?.id || `lead_${idx}`,
            phone: mobilePhone?.number || "",
            firstName: r.firstName || r.ownerName?.split(" ")[0] || "",
            lastName: r.lastName || r.ownerName?.split(" ").slice(1).join(" ") || "",
            companyName: body.companyName || "",
            industry: body.industry || "",
          };
        })
        .filter(lead => lead.phone);

      if (leadsWithMobile.length > 0) {
        smsQueueResult = smsQueueService.addBatchToQueue(leadsWithMobile, {
          templateCategory: body.templateCategory || "sms_initial",
          templateMessage: body.smsTemplate,
          personality: body.personality || "brooklyn_bestie",
          campaignId: body.campaignId,
          priority: body.priority || 5,
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        });

        console.log(`[Skip Trace] Added ${smsQueueResult.added} leads to SMS queue (${smsQueueResult.skipped} skipped/opted-out)`);
      }
    }

    // Return single result if single input
    if (inputs.length === 1) {
      const result = results[0];
      return NextResponse.json({
        ...result,
        success: result?.success || false,
        usage: {
          today: dailyUsage.count,
          limit: DAILY_LIMIT,
          remaining: DAILY_LIMIT - dailyUsage.count,
        },
        ...(smsQueueResult && {
          smsQueue: {
            added: smsQueueResult.added,
            skipped: smsQueueResult.skipped,
            queueIds: smsQueueResult.queueIds,
          },
        }),
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
        withMobiles: withMobiles.length,
        withEmails: withEmails.length,
        failed: batchInputs.length - successful.length,
      },
      usage: {
        today: dailyUsage.count,
        limit: DAILY_LIMIT,
        remaining: DAILY_LIMIT - dailyUsage.count,
      },
      ...(smsQueueResult && {
        smsQueue: {
          added: smsQueueResult.added,
          skipped: smsQueueResult.skipped,
          queueIds: smsQueueResult.queueIds,
        },
      }),
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
    bulkBatchSize: BULK_BATCH_SIZE,
    endpoints: {
      single: "POST /api/skip-trace { id: 'property-id' }",
      batch: "POST /api/skip-trace { ids: ['id1', 'id2', ...] } - max 250",
      bulk: "POST /api/skip-trace { ids: ['id1', 'id2', ...], bulk: true } - max 1000, uses SkipTraceBatchAwait",
    },
  });
}
