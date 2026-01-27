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
import { ulid } from "ulidx";

// Generate lead ID in the format the API expects: lead_ULID
function generateLeadId(): string {
  return `lead_${ulid()}`;
}

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
    };

    for (let i = 0; i < parsedLeads.length; i += BATCH_SIZE) {
      const batch = parsedLeads.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

      try {
        const insertData = batch.map((lead) => {
          // Use any phone field available
          const phone = cleanPhone(lead.phone || lead.mobile || lead.cell || lead.mobilePhone || "");
          const email = lead.email || lead.emailAddress || null;

          if (phone) results.withPhone++;
          if (email) results.withEmail++;

          // Extract street address from various fields
          const streetAddr = lead.streetAddress || lead.address || lead.address1 || null;

          // Get full name from various USBizData fields for splitting
          const fullName = lead.contactName || lead.keyPerson || lead.ownerName || lead.principalName || "";
          const nameParts = fullName.split(" ");

          return {
            id: generateLeadId(),
            // Names - check direct fields first, then split full name
            firstName: lead.firstName || nameParts[0] || "",
            lastName: lead.lastName || nameParts.slice(1).join(" ") || "",
            phone: phone || null,
            email: email,
            company: lead.company || lead.companyName || lead.business || null,
            title: lead.title || lead.jobTitle || lead.position || null,
            // ADDRESS - store street in address column
            address: streetAddr,
            city: lead.city || null,
            state: lead.state || null,
            zipCode: lead.zipCode || lead.zip || lead.postalCode || null,
            source: source,
            pipelineStatus: "raw",
            status: "new",
            teamId: teamId,
            // Store ALL business data in metadata for API retrieval
            metadata: {
              // USBizData fields
              county: lead.county || null,
              areaCode: lead.areaCode || null,
              annualRevenue: lead.annualRevenue || lead.revenue || lead.salesVolume || null,
              employees: lead.employees || lead.employeeCount || null,
              sicCode: lead.sicCode || null,
              sicDescription: lead.sicDescription || null,
              naicsCode: lead.naicsCode || null,
              website: lead.website || lead.websiteUrl || lead.webAddress || null,
              yearEstablished: lead.yearEstablished || lead.yearFounded || null,
              industry: lead.industry || lead.sicDescription || null,
            },
            customFields: {
              importedAt: new Date().toISOString(),
              bucketName: bucketName || file.name,
              batchNumber,
              mobilePhone: lead.mobile || lead.cell || lead.mobilePhone || null,
              // IMPORTANT: Store ALL original fields for fallback
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

  // COMPREHENSIVE MAPPINGS - includes USBizData exact column names
  const mappings: Record<string, string> = {
    // Names - ALL USBIZDATA VARIATIONS
    first_name: "firstName",
    firstname: "firstName",
    first: "firstName",
    key_person_first_name: "firstName",
    keypersonfirstname: "firstName",
    owner_first_name: "firstName",
    ownerfirstname: "firstName",
    contact_first_name: "firstName",
    contactfirstname: "firstName",
    principal_first_name: "firstName",
    contact_name: "contactName",
    contactname: "contactName",
    key_person: "contactName",
    keyperson: "contactName",
    owner_name: "contactName",
    ownername: "contactName",
    principal_name: "contactName",
    last_name: "lastName",
    lastname: "lastName",
    last: "lastName",
    key_person_last_name: "lastName",
    keypersonlastname: "lastName",
    owner_last_name: "lastName",
    ownerlastname: "lastName",
    contact_last_name: "lastName",
    contactlastname: "lastName",
    principal_last_name: "lastName",

    // Phone
    phone_number: "phone",
    phonenumber: "phone",
    telephone: "phone",
    mobile: "mobile",
    mobile_phone: "mobilePhone",
    mobilephone: "mobilePhone",
    cell: "cell",
    cell_phone: "cell",
    cellphone: "cell",
    area_code: "areaCode",
    areacode: "areaCode",

    // Email
    email_address: "email",
    emailaddress: "email",
    e_mail: "email",

    // Company
    company_name: "company",
    companyname: "company",
    business: "company",
    business_name: "company",
    organization: "company",

    // Title/Position
    job_title: "title",
    jobtitle: "title",
    position: "title",

    // Address - USBIZDATA EXACT
    street_address: "streetAddress",
    streetaddress: "streetAddress",
    address_1: "address",
    address1: "address",

    // Location
    zip_code: "zipCode",
    zipcode: "zipCode",
    postal_code: "zipCode",
    postalcode: "zipCode",

    // USBizData Business Data
    annual_revenue: "annualRevenue",
    annualrevenue: "annualRevenue",
    revenue: "revenue",
    sales_volume: "salesVolume",
    salesvolume: "salesVolume",
    number_of_employees: "employees",
    numberofemployees: "employees",
    employee_count: "employeeCount",
    employeecount: "employeeCount",

    // SIC/NAICS
    sic_code: "sicCode",
    siccode: "sicCode",
    primary_sic_code: "sicCode",
    sic_description: "sicDescription",
    sicdescription: "sicDescription",
    primary_sic_description: "sicDescription",
    naics_code: "naicsCode",
    naicscode: "naicsCode",

    // Website
    website_url: "website",
    websiteurl: "website",
    web_address: "website",
    webaddress: "website",
    url: "website",

    // Year/Established
    year_established: "yearEstablished",
    yearestablished: "yearEstablished",
    year_founded: "yearEstablished",
    yearfounded: "yearEstablished",
  };

  return mappings[normalized] || normalized;
}
