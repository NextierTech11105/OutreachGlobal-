/**
 * USBizData CSV Import API - WITH DEDUPE
 *
 * Imports B2B business data into the businesses table for B2B search.
 * Deduplicates by: phone OR (companyName + city + state)
 * Updates existing records, inserts new ones.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { requireTenantContext } from "@/lib/api-auth";
import { eq, and, or, sql } from "drizzle-orm";

// =============================================================================
// NORMALIZATION HELPERS
// =============================================================================

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  // Return last 10 digits (strip country code)
  return digits.slice(-10);
}

function normalizeCompanyName(name: string | null | undefined): string | null {
  if (!name) return null;
  return name
    .toLowerCase()
    .replace(/[^\w\s&-]/g, "")
    .replace(/\s+(inc|llc|ltd|corp|corporation|company|co)\.?$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

// =============================================================================
// CSV PARSING
// =============================================================================

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());

  return values;
}

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map((h) =>
    h.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
  );

  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length >= headers.length - 2) {
      const record: Record<string, string> = {};
      headers.forEach((header, idx) => {
        record[header] = values[idx] || "";
      });
      records.push(record);
    }
  }

  return records;
}

// =============================================================================
// RECORD MAPPING
// =============================================================================

function mapRecord(record: Record<string, string>, userId: string, sectorId: string) {
  const phone = record.phone || record.phone_number || "";
  const companyName = record.company_name || record.company || "";

  return {
    userId,
    companyName,
    normalizedPhone: normalizePhone(phone),
    normalizedName: normalizeCompanyName(companyName),
    address: record.address || record.street || "",
    city: record.city || "",
    state: record.state || "",
    zip: record.zip || record.zip_code || "",
    county: record.county || "",
    phone,
    ownerFirstName: record.contact_first || record.first_name || record.firstname || "",
    ownerLastName: record.contact_last || record.last_name || record.lastname || "",
    ownerName: [
      record.contact_first || record.first_name || "",
      record.contact_last || record.last_name || ""
    ].filter(Boolean).join(" ") || null,
    ownerTitle: record.title || record.job_title || "",
    ownerPhone: record.direct_phone || "",
    email: record.email || "",
    website: record.website || "",
    employeeRange: record.employee_range || record.employees || "",
    revenueRange: record.annual_sales || record.revenue || "",
    sicCode: record.sic_code || "",
    sicDescription: record.industry || "",
    primarySectorId: sectorId,
    enrichmentStatus: "pending",
  };
}

// =============================================================================
// SECTOR DETECTION
// =============================================================================

function detectSector(filename: string, firstRecord?: Record<string, string>): string {
  const lower = filename.toLowerCase();

  if (lower.includes("plumb")) return "plumbing";
  if (lower.includes("hvac")) return "hvac";
  if (lower.includes("electric")) return "electrical";
  if (lower.includes("roofing") || lower.includes("roof")) return "roofing";
  if (lower.includes("consult")) return "consulting";
  if (lower.includes("realtor") || lower.includes("real_estate")) return "real_estate";
  if (lower.includes("solar")) return "solar";
  if (lower.includes("landscap")) return "landscaping";
  if (lower.includes("pest")) return "pest_control";
  if (lower.includes("auto") || lower.includes("mechanic")) return "automotive";

  if (firstRecord?.sic_code) {
    const sic = firstRecord.sic_code;
    if (sic.startsWith("1711")) return "plumbing";
    if (sic.startsWith("1731")) return "electrical";
    if (sic.startsWith("1761")) return "roofing";
    if (sic.startsWith("8742")) return "consulting";
    if (sic.startsWith("6531")) return "real_estate";
  }

  return "general";
}

// =============================================================================
// DEDUPE: Find existing business
// =============================================================================

async function findExistingBusiness(
  userId: string,
  normalizedPhone: string | null,
  normalizedName: string | null,
  city: string | null,
  state: string | null
): Promise<{ id: string } | null> {
  // Build conditions for matching
  const conditions: any[] = [];

  // Match by normalized phone (strongest signal)
  if (normalizedPhone) {
    conditions.push(
      sql`regexp_replace(${businesses.phone}, '[^0-9]', '', 'g') LIKE ${'%' + normalizedPhone}`
    );
  }

  // Match by company name + location
  if (normalizedName && city && state) {
    conditions.push(
      and(
        sql`LOWER(REGEXP_REPLACE(${businesses.companyName}, '[^\\w\\s&-]', '', 'g')) = ${normalizedName}`,
        sql`LOWER(${businesses.city}) = ${city.toLowerCase()}`,
        sql`LOWER(${businesses.state}) = ${state.toLowerCase()}`
      )
    );
  }

  if (conditions.length === 0) return null;

  const existing = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(and(eq(businesses.userId, userId), or(...conditions)))
    .limit(1);

  return existing[0] || null;
}

// =============================================================================
// MAIN IMPORT HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireTenantContext();

    const contentType = request.headers.get("content-type") || "";

    let records: Record<string, string>[] = [];
    let filename = "import";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File;
      const sectorOverride = formData.get("sector") as string | null;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      filename = file.name;
      const content = await file.text();
      records = parseCSV(content);

      if (sectorOverride) {
        filename = sectorOverride;
      }
    } else {
      const body = await request.json();

      if (body.csv) {
        records = parseCSV(body.csv);
        filename = body.filename || "import";
      } else if (body.records && Array.isArray(body.records)) {
        records = body.records;
        filename = body.filename || "import";
      } else {
        return NextResponse.json(
          { error: "Provide 'csv' string or 'records' array" },
          { status: 400 }
        );
      }
    }

    if (records.length === 0) {
      return NextResponse.json({ error: "No valid records found in CSV" }, { status: 400 });
    }

    const sectorId = detectSector(filename, records[0]);

    // Stats tracking
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let errors: string[] = [];

    // Process records with dedupe
    const BATCH_SIZE = 100; // Smaller batches for dedupe checking

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);

      for (const record of batch) {
        try {
          const mapped = mapRecord(record, userId, sectorId);

          if (!mapped.companyName) {
            skipped++;
            continue;
          }

          // Check for existing business
          const existing = await findExistingBusiness(
            userId,
            mapped.normalizedPhone,
            mapped.normalizedName,
            mapped.city,
            mapped.state
          );

          if (existing) {
            // UPDATE existing record - merge data
            await db
              .update(businesses)
              .set({
                // Only update fields if new data is better
                phone: mapped.phone || undefined,
                email: mapped.email || undefined,
                ownerFirstName: mapped.ownerFirstName || undefined,
                ownerLastName: mapped.ownerLastName || undefined,
                ownerName: mapped.ownerName || undefined,
                ownerTitle: mapped.ownerTitle || undefined,
                ownerPhone: mapped.ownerPhone || undefined,
                website: mapped.website || undefined,
                sicCode: mapped.sicCode || undefined,
                sicDescription: mapped.sicDescription || undefined,
                updatedAt: new Date(),
              })
              .where(eq(businesses.id, existing.id));
            updated++;
          } else {
            // INSERT new record
            await db.insert(businesses).values(mapped);
            inserted++;
          }
        } catch (e) {
          errors.push(`Row ${i}: ${e instanceof Error ? e.message : "Unknown error"}`);
        }
      }

      // Progress log every 500 records
      if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= records.length) {
        console.log(`[B2B Import] Progress: ${Math.min(i + BATCH_SIZE, records.length)}/${records.length} (${inserted} new, ${updated} updated, ${skipped} skipped)`);
      }
    }

    console.log(`[B2B Import] Complete: ${inserted} inserted, ${updated} updated, ${skipped} skipped from ${filename} (sector: ${sectorId})`);

    return NextResponse.json({
      success: true,
      message: `Processed ${records.length} records: ${inserted} new, ${updated} updated`,
      stats: {
        total: records.length,
        inserted,
        updated,
        duplicates: updated, // Updated records were duplicates
        skipped,
        errors: errors.length,
        sector: sectorId,
      },
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    console.error("[B2B Import] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}

// GET - Info about import endpoint
export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/businesses/import",
    description: "Import USBizData CSV files with automatic deduplication",
    features: [
      "Deduplicates by phone number OR (company name + city + state)",
      "Updates existing records with new data",
      "Inserts only truly new businesses",
      "Auto-detects sector from filename or SIC code"
    ],
    formats: [
      {
        type: "multipart/form-data",
        fields: {
          file: "CSV file (required)",
          sector: "Sector override (optional)"
        }
      },
      {
        type: "application/json",
        body: {
          csv: "Raw CSV content as string",
          filename: "Filename for sector detection",
          records: "OR array of record objects"
        }
      }
    ],
    expectedColumns: [
      "Company Name", "Address", "City", "State", "Zip", "County",
      "Phone", "Contact First", "Contact Last", "Title", "Direct Phone",
      "Email", "Website", "Employee Range", "Annual Sales", "SIC Code", "Industry"
    ],
    sectors: [
      "plumbing", "hvac", "electrical", "roofing", "consulting",
      "real_estate", "solar", "landscaping", "pest_control", "automotive", "general"
    ]
  });
}
