import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.REALESTATE_API_KEY || process.env.REAL_ESTATE_API_KEY || "";
const API_BASE = "https://api.realestateapi.com/v2";

interface CSVRecord {
  [key: string]: string;
}

interface EnrichmentResult {
  original: CSVRecord;
  enriched: Record<string, unknown> | null;
  status: "success" | "not_found" | "error";
  error?: string;
}

// Helper to build address from CSV record
function buildAddress(record: CSVRecord, mapping: Record<string, string>): string | null {
  // Try full address field first
  if (mapping.address && record[mapping.address]) {
    return record[mapping.address];
  }

  // Build from parts
  const parts: string[] = [];

  if (mapping.street && record[mapping.street]) {
    parts.push(record[mapping.street]);
  }
  if (mapping.city && record[mapping.city]) {
    parts.push(record[mapping.city]);
  }
  if (mapping.state && record[mapping.state]) {
    parts.push(record[mapping.state]);
  }
  if (mapping.zip && record[mapping.zip]) {
    parts.push(record[mapping.zip]);
  }

  return parts.length >= 2 ? parts.join(", ") : null;
}

// Parse address into components for PropertySearch
function parseAddress(fullAddress: string): { street?: string; city?: string; state?: string; zip?: string } {
  const parts = fullAddress.split(",").map(p => p.trim());
  if (parts.length >= 3) {
    // Format: "123 Main St, Miami, FL 33101" or "123 Main St, Miami, FL"
    const street = parts[0];
    const city = parts[1];
    const stateZip = parts[2].split(/\s+/);
    const state = stateZip[0];
    const zip = stateZip[1] || parts[3]?.trim();
    return { street, city, state, zip };
  } else if (parts.length === 2) {
    // Format: "123 Main St, Miami FL 33101"
    const street = parts[0];
    const rest = parts[1].split(/\s+/);
    const city = rest.slice(0, -2).join(" ");
    const state = rest[rest.length - 2];
    const zip = rest[rest.length - 1];
    return { street, city, state, zip };
  }
  return { street: fullAddress };
}

// Enrich a single address using PropertySearch then PropertyDetail
async function enrichAddress(address: string): Promise<{ data: Record<string, unknown> | null; error?: string }> {
  try {
    // Step 1: Search for property by address
    const parsed = parseAddress(address);
    const searchBody: Record<string, unknown> = { size: 1 };

    if (parsed.street) searchBody.address = parsed.street;
    if (parsed.city) searchBody.city = parsed.city;
    if (parsed.state) searchBody.state = parsed.state;
    if (parsed.zip) searchBody.zip = parsed.zip;

    const searchResponse = await fetch(`${API_BASE}/PropertySearch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "Accept": "application/json",
      },
      body: JSON.stringify(searchBody),
    });

    const searchData = await searchResponse.json();

    if (!searchResponse.ok || !searchData.data?.[0]?.id) {
      return { data: null, error: "Property not found" };
    }

    const propertyId = searchData.data[0].id;

    // Step 2: Get full property details
    const detailResponse = await fetch(`${API_BASE}/PropertyDetail`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "Accept": "application/json",
      },
      body: JSON.stringify({ id: propertyId }),
    });

    const detailData = await detailResponse.json();

    if (!detailResponse.ok) {
      return { data: null, error: detailData.message || "Failed to get property details" };
    }

    return { data: detailData.data || detailData };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Enrichment failed";
    return { data: null, error: message };
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json(
        { error: "RealEstateAPI key not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { records, mapping, batchSize = 10 } = body as {
      records: CSVRecord[];
      mapping: Record<string, string>;
      batchSize?: number;
    };

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: "No records provided" },
        { status: 400 }
      );
    }

    if (!mapping) {
      return NextResponse.json(
        { error: "Column mapping required" },
        { status: 400 }
      );
    }

    // Limit batch size to prevent API rate limits
    const maxBatch = Math.min(batchSize, 50);
    const results: EnrichmentResult[] = [];
    let enriched = 0;
    let notFound = 0;
    let errors = 0;

    // Process records in batches
    for (let i = 0; i < records.length; i += maxBatch) {
      const batch = records.slice(i, i + maxBatch);

      // Process batch in parallel
      const batchPromises = batch.map(async (record) => {
        const address = buildAddress(record, mapping);

        if (!address) {
          return {
            original: record,
            enriched: null,
            status: "error" as const,
            error: "Could not build address from record",
          };
        }

        const result = await enrichAddress(address);

        if (result.data) {
          return {
            original: record,
            enriched: result.data,
            status: "success" as const,
          };
        } else {
          return {
            original: record,
            enriched: null,
            status: result.error?.includes("not found") ? "not_found" as const : "error" as const,
            error: result.error,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      for (const result of batchResults) {
        results.push(result);
        if (result.status === "success") enriched++;
        else if (result.status === "not_found") notFound++;
        else errors++;
      }

      // Add small delay between batches to avoid rate limiting
      if (i + maxBatch < records.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: records.length,
        enriched,
        notFound,
        errors,
      },
    });
  } catch (error: unknown) {
    console.error("CSV enrichment error:", error);
    const message = error instanceof Error ? error.message : "Enrichment failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
