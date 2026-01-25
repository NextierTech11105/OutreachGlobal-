/**
 * USBizData CSV Import API
 *
 * Imports B2B business data into the businesses table for B2B search.
 * Accepts CSV files with USBizData format:
 * Company Name, Address, City, State, Zip, County, Phone, Contact First,
 * Contact Last, Title, Direct Phone, Email, Website, Employee Range,
 * Annual Sales, SIC Code, Industry
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { requireTenantContext } from "@/lib/api-auth";

// Parse CSV line handling quoted values
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

// Parse CSV content
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];

  // Normalize headers
  const headers = parseCSVLine(lines[0]).map((h) =>
    h.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
  );

  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length >= headers.length - 2) { // Allow some missing columns
      const record: Record<string, string> = {};
      headers.forEach((header, idx) => {
        record[header] = values[idx] || "";
      });
      records.push(record);
    }
  }

  return records;
}

// Map USBizData columns to our schema
function mapRecord(record: Record<string, string>, userId: string, sectorId: string) {
  return {
    userId,
    companyName: record.company_name || record.company || "",
    address: record.address || record.street || "",
    city: record.city || "",
    state: record.state || "",
    zip: record.zip || record.zip_code || "",
    county: record.county || "",
    phone: record.phone || record.phone_number || "",
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

// Detect sector from filename or content
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

  // Try to detect from SIC code
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

// POST - Import CSV data
export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireTenantContext();

    const contentType = request.headers.get("content-type") || "";

    let records: Record<string, string>[] = [];
    let filename = "import";

    if (contentType.includes("multipart/form-data")) {
      // File upload
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
        filename = sectorOverride; // Use sector for detection
      }
    } else {
      // JSON body with CSV content or records array
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

    // Detect sector
    const sectorId = detectSector(filename, records[0]);

    // Process in batches
    const BATCH_SIZE = 500;
    let imported = 0;
    let skipped = 0;
    let errors: string[] = [];

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);

      const insertData = batch
        .map((record) => {
          try {
            const mapped = mapRecord(record, userId, sectorId);
            if (!mapped.companyName) {
              skipped++;
              return null;
            }
            return mapped;
          } catch (e) {
            errors.push(`Row ${i}: ${e instanceof Error ? e.message : "Unknown error"}`);
            return null;
          }
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      if (insertData.length > 0) {
        try {
          await db.insert(businesses).values(insertData);
          imported += insertData.length;
        } catch (e) {
          errors.push(`Batch ${Math.floor(i / BATCH_SIZE)}: ${e instanceof Error ? e.message : "DB error"}`);
        }
      }
    }

    console.log(`[B2B Import] Imported ${imported} businesses from ${filename} (sector: ${sectorId})`);

    return NextResponse.json({
      success: true,
      message: `Imported ${imported} businesses`,
      stats: {
        total: records.length,
        imported,
        skipped,
        errors: errors.length,
        sector: sectorId,
      },
      errors: errors.slice(0, 10), // Only return first 10 errors
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
    description: "Import USBizData CSV files into businesses table for B2B search",
    formats: [
      {
        type: "multipart/form-data",
        fields: {
          file: "CSV file (required)",
          sector: "Sector override (optional): plumbing, electrical, consulting, real_estate, etc."
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
