/**
 * DIRECT CSV IMPORT - Bypasses DO Spaces, writes straight to database
 *
 * POST /api/leads/import-direct
 * - Accepts CSV file + teamId
 * - Parses CSV
 * - Inserts directly to leads table
 * - Returns count immediately
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";

const BATCH_SIZE = 500;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const teamId = formData.get("teamId") as string;
    const source = (formData.get("source") as string) || "csv-import";
    const bucketName = formData.get("bucketName") as string;

    if (!file) {
      return NextResponse.json({ error: "CSV file is required" }, { status: 400 });
    }

    if (!teamId) {
      return NextResponse.json({ error: "teamId is required" }, { status: 400 });
    }

    // Check if database is available
    if (!db) {
      return NextResponse.json(
        { error: "Database not configured. Check DATABASE_URL environment variable." },
        { status: 500 }
      );
    }

    // Parse CSV
    const csvText = await file.text();
    const parsedLeads = parseCSV(csvText);

    if (parsedLeads.length === 0) {
      return NextResponse.json(
        { error: "No valid leads found in CSV. Rows must have phone or email." },
        { status: 400 }
      );
    }

    console.log(`[Direct Import] Importing ${parsedLeads.length} leads for team ${teamId}`);

    // Process in batches
    const results = {
      total: parsedLeads.length,
      imported: 0,
      failed: 0,
      withPhone: 0,
      withEmail: 0,
      withMobile: 0,
    };

    for (let i = 0; i < parsedLeads.length; i += BATCH_SIZE) {
      const batch = parsedLeads.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

      try {
        const insertData = batch.map((lead) => {
          const phone = cleanPhone(lead.phone || lead.mobile || lead.cell || "");
          const mobilePhone = cleanPhone(lead.mobile || lead.cell || lead.mobilePhone || "");
          const email = lead.email || lead.emailAddress || null;

          if (phone) results.withPhone++;
          if (mobilePhone) results.withMobile++;
          if (email) results.withEmail++;

          return {
            id: uuid(),
            firstName: lead.firstName || lead.first_name || lead.first || "",
            lastName: lead.lastName || lead.last_name || lead.last || "",
            phone: phone,
            mobilePhone: mobilePhone || null,
            email: email,
            company: lead.company || lead.companyName || lead.business || null,
            title: lead.title || lead.jobTitle || lead.position || null,
            address: lead.address || lead.streetAddress || lead.address1 || null,
            city: lead.city || null,
            state: lead.state || null,
            zipCode: lead.zip || lead.zipCode || lead.postalCode || null,
            source: source,
            pipelineStatus: "raw",
            enrichmentStatus: "pending",
            teamId: teamId,
            customFields: {
              importedAt: new Date().toISOString(),
              bucketName: bucketName || file.name,
              batchNumber,
              originalRow: lead,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        });

        await db.insert(leads).values(insertData);
        results.imported += batch.length;
        console.log(`[Direct Import] Batch ${batchNumber}: ${batch.length} leads inserted`);
      } catch (error) {
        console.error(`[Direct Import] Batch ${batchNumber} failed:`, error);
        results.failed += batch.length;
      }
    }

    console.log(`[Direct Import] Complete: ${results.imported} imported, ${results.failed} failed`);

    return NextResponse.json({
      success: true,
      message: `Imported ${results.imported} leads directly to database`,
      results,
      stats: {
        total: results.total,
        withPhone: results.withPhone,
        withEmail: results.withEmail,
        withMobile: results.withMobile,
        withAddress: parsedLeads.filter(l => l.address || l.city || l.state).length,
      }
    });
  } catch (error) {
    console.error("[Direct Import] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}

function cleanPhone(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith("1")) return `+${cleaned}`;
  return cleaned ? `+${cleaned}` : "";
}

function parseCSV(csvText: string): Array<Record<string, string>> {
  const lines = csvText.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];

  // Parse header
  const headers = parseCSVLine(lines[0]).map((h) => normalizeHeader(h));

  // Parse data rows
  const data: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    // Only include rows with at least phone or email
    if (row.phone || row.email || row.mobile || row.cell || row.mobilePhone) {
      data.push(row);
    }
  }

  return data;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function normalizeHeader(header: string): string {
  const normalized = header
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "_");

  const mappings: Record<string, string> = {
    first_name: "firstName",
    firstname: "firstName",
    first: "firstName",
    last_name: "lastName",
    lastname: "lastName",
    last: "lastName",
    phone_number: "phone",
    phonenumber: "phone",
    telephone: "phone",
    mobile: "mobile",
    mobile_phone: "mobilePhone",
    mobilephone: "mobilePhone",
    cell: "cell",
    cell_phone: "cell",
    cellphone: "cell",
    email_address: "email",
    emailaddress: "email",
    e_mail: "email",
    company_name: "company",
    companyname: "company",
    business: "company",
    business_name: "company",
    organization: "company",
    job_title: "title",
    jobtitle: "title",
    position: "title",
    street_address: "address",
    streetaddress: "address",
    address_1: "address",
    address1: "address",
    zip_code: "zip",
    zipcode: "zip",
    postal_code: "zip",
    postalcode: "zip",
  };

  return mappings[normalized] || normalized;
}
