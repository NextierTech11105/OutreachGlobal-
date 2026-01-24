/**
 * Direct import to leads table
 * Inserts CSV data directly into the leads table using the correct schema
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";

// USBizData CSV Column Mapping
const USBIZDATA_COLUMNS: Record<string, string> = {
  "Company Name": "company",
  "Address": "address",
  "City": "city",
  "State": "state",
  "Zip": "zipCode",
  "County": "county",
  "Phone": "phone",
  "Contact First": "firstName",
  "Contact Last": "lastName",
  "Title": "title",
  "Direct Phone": "primaryPhone",
  "Email": "email",
  "Website": "website",
  "Employee Range": "employees",
  "Annual Sales": "annualSales",
  "SIC Code": "sicCode",
  "Industry": "sicDescription",
};

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split("\n").filter(line => line.trim());
  if (lines.length < 2) return [];

  // Parse header
  const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));

  // Parse rows
  const records: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim().replace(/"/g, ""));
    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx] || "";
    });
    records.push(record);
  }
  return records;
}

function mapRecordToLead(record: Record<string, string>, teamId: string, vertical?: string) {
  // Map CSV columns to lead fields
  const getValue = (csvColumn: string) => {
    const value = record[csvColumn];
    return value && value.trim() ? value.trim() : null;
  };

  // Generate a unique ID
  const id = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    id,
    teamId,
    firstName: getValue("Contact First"),
    lastName: getValue("Contact Last"),
    email: getValue("Email"),
    phone: getValue("Direct Phone") || getValue("Phone"),
    title: getValue("Title"),
    company: getValue("Company Name"),
    status: "new",
    pipelineStatus: "raw",
    score: 0,
    address: getValue("Address"),
    city: getValue("City"),
    state: getValue("State"),
    zipCode: getValue("Zip"),
    source: vertical || "csv_import",
    metadata: {
      sicCode: getValue("SIC Code"),
      sicDescription: getValue("Industry"),
      employeeRange: getValue("Employee Range"),
      annualSales: getValue("Annual Sales"),
      website: getValue("Website"),
      county: getValue("County"),
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { csvContent, vertical, fileName } = body;

    if (!csvContent) {
      return NextResponse.json({ error: "No CSV content provided" }, { status: 400 });
    }

    // Use a default team ID - in production this should come from auth
    const teamId = "team_default";

    // Parse CSV
    const records = parseCSV(csvContent);
    if (records.length === 0) {
      return NextResponse.json({ error: "CSV is empty or invalid" }, { status: 400 });
    }

    console.log(`[Import] Processing ${records.length} records from ${fileName || "upload"}`);

    // Process in batches
    const BATCH_SIZE = 100;
    let imported = 0;
    let errors = 0;
    const sampleCompanies: string[] = [];

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const leadInserts = batch.map(record => {
        const lead = mapRecordToLead(record, teamId, vertical);
        if (sampleCompanies.length < 5 && lead.company) {
          sampleCompanies.push(lead.company);
        }
        return lead;
      }).filter(lead => lead.company || lead.firstName || lead.phone);

      try {
        if (leadInserts.length > 0) {
          await db.insert(leads).values(leadInserts as any);
          imported += leadInserts.length;
        }
      } catch (err: any) {
        console.error(`[Import] Batch error:`, err.message);
        errors += batch.length;
      }
    }

    console.log(`[Import] Complete: ${imported} imported, ${errors} errors`);

    return NextResponse.json({
      success: true,
      message: `Imported ${imported} leads from ${fileName || "CSV"}`,
      stats: {
        imported,
        errors,
        total: records.length,
        skipped: records.length - imported - errors,
        sampleCompanies,
      },
    });
  } catch (error) {
    console.error("[Import] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}
