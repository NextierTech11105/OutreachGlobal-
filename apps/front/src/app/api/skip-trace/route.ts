import { NextRequest, NextResponse } from "next/server";

const REALESTATE_API_KEY = process.env.REAL_ESTATE_API_KEY || process.env.REALESTATE_API_KEY || "NEXTIER-2906-74a1-8684-d2f63f473b7b";
const REALESTATE_API_URL = "https://api.realestateapi.com/v2/PropertyDetail";

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

export interface SkipTraceResult {
  id: string;
  propertyId: string;
  address: string;
  ownerName: string;
  phones: string[];
  emails: string[];
  mailingAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  demographics?: {
    age?: number;
    income?: string;
    homeowner?: boolean;
  };
  success: boolean;
  error?: string;
}

// POST - Skip trace batch of property IDs (max 250 per call, 5K/day)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, includePhones = true, includeEmails = true, includeMailingAddress = true } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids array required" }, { status: 400 });
    }

    // Check daily limit
    const usage = getDailyUsage();
    const requestedCount = Math.min(ids.length, BATCH_SIZE);

    if (usage.remaining < requestedCount) {
      return NextResponse.json({
        error: "Daily skip trace limit reached",
        dailyLimit: DAILY_LIMIT,
        used: usage.count,
        remaining: usage.remaining,
        resetsAt: `${usage.date}T00:00:00Z (next day)`,
      }, { status: 429 });
    }

    // Limit to 250 per batch
    const batchIds = ids.slice(0, BATCH_SIZE);
    const results: SkipTraceResult[] = [];
    const errors: string[] = [];

    console.log(`[Skip Trace] Processing ${batchIds.length} IDs (${usage.count}/${DAILY_LIMIT} used today)`);

    // Fetch details in parallel with concurrency limit
    const concurrency = 10;
    for (let i = 0; i < batchIds.length; i += concurrency) {
      const batch = batchIds.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(async (id: string): Promise<SkipTraceResult | null> => {
          try {
            const response = await fetch(REALESTATE_API_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": REALESTATE_API_KEY,
              },
              body: JSON.stringify({ id: String(id) }),
            });

            if (!response.ok) {
              errors.push(`${id}: ${response.status}`);
              return {
                id: String(id),
                propertyId: String(id),
                address: "",
                ownerName: "",
                phones: [],
                emails: [],
                success: false,
                error: `API error: ${response.status}`,
              };
            }

            const data = await response.json();
            const prop = data.data || data;

            // Extract contact info from PropertyDetail response
            const phones: string[] = [];
            const emails: string[] = [];

            // Phone fields from RealEstateAPI
            if (prop.ownerPhone) phones.push(prop.ownerPhone);
            if (prop.owner1Phone) phones.push(prop.owner1Phone);
            if (prop.owner2Phone) phones.push(prop.owner2Phone);
            if (prop.phones && Array.isArray(prop.phones)) {
              phones.push(...prop.phones);
            }
            // Skip trace enhanced fields
            if (prop.skipTrace?.phones) {
              phones.push(...prop.skipTrace.phones);
            }

            // Email fields
            if (prop.ownerEmail) emails.push(prop.ownerEmail);
            if (prop.owner1Email) emails.push(prop.owner1Email);
            if (prop.owner2Email) emails.push(prop.owner2Email);
            if (prop.emails && Array.isArray(prop.emails)) {
              emails.push(...prop.emails);
            }
            if (prop.skipTrace?.emails) {
              emails.push(...prop.skipTrace.emails);
            }

            // Build owner name
            const ownerName = [prop.owner1FirstName, prop.owner1LastName]
              .filter(Boolean)
              .join(" ") || prop.ownerName || prop.owner || "Unknown";

            // Build address
            const address = prop.address?.street || prop.address?.address ||
              [prop.address?.houseNumber, prop.address?.street, prop.address?.streetSuffix]
                .filter(Boolean)
                .join(" ") || "";

            return {
              id: String(id),
              propertyId: prop.id || prop.propertyId || String(id),
              address,
              ownerName,
              phones: [...new Set(phones.filter(Boolean))], // Dedupe
              emails: [...new Set(emails.filter(Boolean))], // Dedupe
              mailingAddress: prop.mailingAddress ? {
                street: prop.mailingAddress.street || prop.mailingAddress.address || "",
                city: prop.mailingAddress.city || "",
                state: prop.mailingAddress.state || "",
                zip: prop.mailingAddress.zip || "",
              } : undefined,
              demographics: prop.demographics || undefined,
              success: true,
            };
          } catch (err: any) {
            errors.push(`${id}: ${err.message}`);
            return {
              id: String(id),
              propertyId: String(id),
              address: "",
              ownerName: "",
              phones: [],
              emails: [],
              success: false,
              error: err.message,
            };
          }
        })
      );

      results.push(...batchResults.filter((r): r is SkipTraceResult => r !== null));

      // Small delay between batches to avoid rate limits
      if (i + concurrency < batchIds.length) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    // Increment daily usage
    incrementUsage(batchIds.length);

    // Calculate stats
    const successful = results.filter((r) => r.success);
    const withPhones = successful.filter((r) => r.phones.length > 0);
    const withEmails = successful.filter((r) => r.emails.length > 0);

    console.log(`[Skip Trace] Complete: ${successful.length}/${batchIds.length} success, ${withPhones.length} phones, ${withEmails.length} emails`);

    return NextResponse.json({
      success: true,
      results,
      stats: {
        requested: batchIds.length,
        successful: successful.length,
        withPhones: withPhones.length,
        withEmails: withEmails.length,
        failed: batchIds.length - successful.length,
      },
      usage: {
        today: dailyUsage.count,
        limit: DAILY_LIMIT,
        remaining: DAILY_LIMIT - dailyUsage.count,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("[Skip Trace] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
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
