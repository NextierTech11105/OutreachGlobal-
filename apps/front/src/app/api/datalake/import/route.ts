/**
 * Direct Datalake Import API
 * Upload USBizData CSV and import directly to database
 */

import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse/sync";
import { db } from "@/lib/db";
import { businesses, contacts } from "@/lib/db/schema";
import { apiAuth } from "@/lib/api-auth";

// Field mappings for USBizData format
const FIELD_MAP: Record<string, string[]> = {
  companyName: ["Company Name", "Company", "COMPANY NAME", "company_name", "Business Name"],
  contactName: ["Contact Name", "Contact", "CONTACT NAME", "contact_name", "Owner Name"],
  firstName: ["First Name", "FirstName", "FIRST NAME", "first_name"],
  lastName: ["Last Name", "LastName", "LAST NAME", "last_name"],
  email: ["Email Address", "Email", "EMAIL", "email", "E-mail"],
  phone: ["Phone Number", "Phone", "PHONE", "phone", "Telephone", "Primary Phone"],
  address: ["Street Address", "Address", "ADDRESS", "address", "Street"],
  city: ["City", "CITY", "city"],
  state: ["State", "STATE", "state", "ST"],
  zip: ["Zip Code", "ZIP", "Zip", "zip", "zipcode", "Postal Code"],
  county: ["County", "COUNTY", "county"],
  website: ["Website URL", "Website", "URL", "website"],
  employees: ["Number of Employees", "Employees", "employees", "EMPLOYEES", "Emp Size"],
  revenue: ["Annual Revenue", "Revenue", "revenue", "REVENUE", "Sales", "Sales Volume"],
  sicCode: ["SIC Code", "SIC", "sic_code", "SIC CODE", "Primary SIC"],
  sicDescription: ["SIC Description", "SIC Desc", "sic_description", "Industry"],
};

function findColumn(headers: string[], fieldName: string): string | null {
  const variations = FIELD_MAP[fieldName] || [];
  for (const v of variations) {
    const found = headers.find(
      (h) => h.toLowerCase().trim() === v.toLowerCase().trim()
    );
    if (found) return found;
  }
  return null;
}

function extractValue(row: Record<string, string>, headers: string[], field: string): string | null {
  const col = findColumn(headers, field);
  return col ? (row[col]?.trim() || null) : null;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const importType = formData.get("type") as string || "business"; // business or contact
    const batchSize = parseInt(formData.get("batchSize") as string || "100");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Parse CSV
    const content = await file.text();
    let records: Record<string, string>[];

    try {
      records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });
    } catch (e) {
      return NextResponse.json(
        { error: "Failed to parse CSV", details: String(e) },
        { status: 400 }
      );
    }

    if (records.length === 0) {
      return NextResponse.json({ error: "CSV is empty" }, { status: 400 });
    }

    const headers = Object.keys(records[0]);
    let insertedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      if (importType === "business") {
        // Insert into businesses table
        const businessRecords = batch.map((row) => {
          const companyName = extractValue(row, headers, "companyName");
          const phone = extractValue(row, headers, "phone");
          const email = extractValue(row, headers, "email");
          const employeesStr = extractValue(row, headers, "employees");
          const revenueStr = extractValue(row, headers, "revenue");

          // Need at least company name
          if (!companyName) return null;

          return {
            userId: userId,
            companyName: companyName,
            phone: phone,
            email: email,
            address: extractValue(row, headers, "address"),
            city: extractValue(row, headers, "city"),
            state: extractValue(row, headers, "state"),
            zip: extractValue(row, headers, "zip"),
            county: extractValue(row, headers, "county"),
            website: extractValue(row, headers, "website"),
            sicCode: extractValue(row, headers, "sicCode"),
            sicDescription: extractValue(row, headers, "sicDescription"),
            employeeCount: employeesStr ? parseInt(employeesStr) : null,
            annualRevenue: revenueStr ? parseInt(revenueStr.replace(/[^0-9]/g, "")) : null,
            ownerName: extractValue(row, headers, "contactName"),
            enrichmentStatus: "pending",
            status: "new",
            rawData: row,
          };
        }).filter(Boolean);

        if (businessRecords.length > 0) {
          try {
            await db.insert(businesses).values(businessRecords as any);
            insertedCount += businessRecords.length;
          } catch (err) {
            errorCount += businessRecords.length;
            errors.push(`Batch ${Math.floor(i / batchSize)}: ${String(err)}`);
          }
        }

      } else {
        // Insert into contacts table
        const contactRecords = batch.map((row) => {
          const firstName = extractValue(row, headers, "firstName");
          const lastName = extractValue(row, headers, "lastName");
          const contactName = extractValue(row, headers, "contactName");
          const phone = extractValue(row, headers, "phone");
          const email = extractValue(row, headers, "email");

          // Need at least name or contact info
          if (!firstName && !lastName && !contactName && !phone && !email) return null;

          const fName = firstName || contactName?.split(" ")[0] || null;
          const lName = lastName || contactName?.split(" ").slice(1).join(" ") || null;

          return {
            userId: userId,
            firstName: fName,
            lastName: lName,
            fullName: contactName || [fName, lName].filter(Boolean).join(" ") || null,
            title: extractValue(row, headers, "title"),
            phone: phone,
            email: email,
            address: extractValue(row, headers, "address"),
            city: extractValue(row, headers, "city"),
            state: extractValue(row, headers, "state"),
            zip: extractValue(row, headers, "zip"),
            sourceType: "csv",
            status: "active",
          };
        }).filter(Boolean);

        if (contactRecords.length > 0) {
          try {
            await db.insert(contacts).values(contactRecords as any);
            insertedCount += contactRecords.length;
          } catch (err) {
            errorCount += contactRecords.length;
            errors.push(`Batch ${Math.floor(i / batchSize)}: ${String(err)}`);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${insertedCount} ${importType} records from ${file.name}`,
      stats: {
        totalRows: records.length,
        inserted: insertedCount,
        errors: errorCount,
        userId: userId,
      },
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
    });

  } catch (error) {
    console.error("[Datalake Import] Error:", error);
    return NextResponse.json(
      {
        error: "Import failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Direct CSV import to database",
    endpoint: "POST /api/datalake/import",
    usage: {
      method: "POST",
      contentType: "multipart/form-data",
      fields: {
        file: "CSV file from USBizData",
        type: "business or contact (default: business)",
        batchSize: "Records per batch (default: 100)",
      },
    },
    example: `
curl -X POST http://localhost:3000/api/datalake/import \\
  -F "file=@ny-businesses.csv" \\
  -F "type=business" \\
  -F "batchSize=500"
    `.trim(),
    supportedFields: Object.keys(FIELD_MAP),
  });
}
