import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

/**
 * FDAILY Export for Zoho CRM CSV Import
 *
 * Exports enriched FDAILY leads as a CSV file ready for Zoho Leads import.
 * Includes all property details, skip trace data, and unique IDs for tracking.
 *
 * Usage:
 *   GET /api/fdaily/export-zoho?batch=fdaily-import-2024-12-11
 *   GET /api/fdaily/export-zoho?batch=fdaily-import-2024-12-11-skip-traced-1234567890
 *
 * Zoho Import Mapping:
 *   - First_Name, Last_Name → Owner name
 *   - Mobile, Phone → Skip traced phones
 *   - Email → Skip traced email
 *   - Street, City, State, Zip_Code → Property address
 *   - Custom fields for property data, case info, IDs
 */

const SPACES_ENDPOINT = "https://nyc3.digitaloceanspaces.com";
const SPACES_BUCKET = process.env.DO_SPACES_BUCKET || "nextier";
const SPACES_KEY = process.env.DO_SPACES_KEY || "";
const SPACES_SECRET = process.env.DO_SPACES_SECRET || "";

function getS3Client(): S3Client | null {
  if (!SPACES_KEY || !SPACES_SECRET) return null;
  return new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: "nyc3",
    credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
  });
}

// Zoho Leads module field mapping
const ZOHO_FIELDS = [
  // Standard Zoho fields
  { csv: "First_Name", path: "ownerFirstName", fallback: "" },
  { csv: "Last_Name", path: "ownerLastName", fallback: "Unknown" },
  { csv: "Email", path: "emails[0]", fallback: "" },
  { csv: "Mobile", path: "mobilePhone", fallback: "" },
  { csv: "Phone", path: "landlinePhone", fallback: "" },
  { csv: "Street", path: "propertyAddress", fallback: "" },
  { csv: "City", path: "city", fallback: "" },
  { csv: "State", path: "state", fallback: "" },
  { csv: "Zip_Code", path: "zip", fallback: "" },
  { csv: "Lead_Source", path: "source", fallback: "FDAILY" },

  // Custom fields (create these in Zoho first)
  { csv: "FDAILY_Lead_ID", path: "id", fallback: "" },
  { csv: "Property_ID", path: "propertyId", fallback: "" },
  { csv: "Folio_Number", path: "folio", fallback: "" },
  { csv: "Case_Number", path: "caseNumber", fallback: "" },
  { csv: "Filing_Date", path: "filedDate", fallback: "" },
  { csv: "Estimated_Value", path: "estimatedValue", fallback: "" },
  { csv: "Estimated_Equity", path: "estimatedEquity", fallback: "" },
  { csv: "Equity_Percent", path: "equityPercent", fallback: "" },
  { csv: "Property_Type", path: "propertyType", fallback: "" },
  { csv: "Bedrooms", path: "bedrooms", fallback: "" },
  { csv: "Bathrooms", path: "bathrooms", fallback: "" },
  { csv: "Square_Feet", path: "sqft", fallback: "" },
  { csv: "Year_Built", path: "yearBuilt", fallback: "" },
  { csv: "Pre_Foreclosure", path: "preForeclosure", fallback: "true" },
  { csv: "Skip_Traced", path: "skipTraced", fallback: "false" },
  { csv: "Skip_Trace_Date", path: "skipTracedAt", fallback: "" },
  { csv: "Has_Mobile", path: "hasMobile", fallback: "false" },
  { csv: "Has_Landline", path: "hasLandline", fallback: "false" },
  { csv: "Campaign_Ready", path: "campaignReady", fallback: "false" },
  { csv: "Priority", path: "priority", fallback: "warm" },
  { csv: "Tags", path: "tags", fallback: "" },
  { csv: "Plaintiff", path: "plaintiff", fallback: "" },
  { csv: "Defendant", path: "defendant", fallback: "" },
  { csv: "Loan_Balance", path: "loanBalance", fallback: "" },
  { csv: "Mailing_Address", path: "mailingAddress", fallback: "" },
  { csv: "Import_Date", path: "importedAt", fallback: "" },
];

function getValue(obj: any, path: string, fallback: string): string {
  // Handle array notation like "emails[0]"
  const arrayMatch = path.match(/^(\w+)\[(\d+)\]$/);
  if (arrayMatch) {
    const [, key, index] = arrayMatch;
    const arr = obj[key];
    if (Array.isArray(arr) && arr[parseInt(index)] !== undefined) {
      return String(arr[parseInt(index)]);
    }
    return fallback;
  }

  // Simple path
  const value = obj[path];
  if (value === undefined || value === null) return fallback;
  if (Array.isArray(value)) return value.join("; ");
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function extractPhoneByType(lead: any, type: "mobile" | "landline"): string {
  if (!lead.phones || !Array.isArray(lead.phones)) return "";
  const phone = lead.phones.find((p: any) => p.type === type);
  return phone?.number || "";
}

function leadToZohoRow(lead: any): Record<string, string> {
  const row: Record<string, string> = {};

  // Extract phones by type
  const mobilePhone = extractPhoneByType(lead, "mobile");
  const landlinePhone = extractPhoneByType(lead, "landline");

  // Add extracted phones to lead object for mapping
  const enrichedLead = {
    ...lead,
    mobilePhone,
    landlinePhone,
    // Parse owner name if not already split
    ownerFirstName: lead.ownerFirstName || (lead.ownerName?.split(" ")[0] || ""),
    ownerLastName: lead.ownerLastName || (lead.ownerName?.split(" ").slice(1).join(" ") || ""),
  };

  for (const field of ZOHO_FIELDS) {
    row[field.csv] = getValue(enrichedLead, field.path, field.fallback);
  }

  return row;
}

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function leadsToCSV(leads: any[]): string {
  const headers = ZOHO_FIELDS.map(f => f.csv);
  const rows = leads.map(lead => {
    const row = leadToZohoRow(lead);
    return headers.map(h => escapeCSV(row[h] || "")).join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

// GET /api/fdaily/export-zoho - Export leads as Zoho-ready CSV
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchName = searchParams.get("batch");
    const format = searchParams.get("format") || "csv";

    if (!batchName) {
      return NextResponse.json({
        message: "Export FDAILY leads as Zoho-ready CSV",
        usage: "GET /api/fdaily/export-zoho?batch=<batch-name>",
        examples: [
          "/api/fdaily/export-zoho?batch=fdaily-import-2024-12-11",
          "/api/fdaily/export-zoho?batch=fdaily-import-2024-12-11-skip-traced-1734000000000",
        ],
        zohoFields: ZOHO_FIELDS.map(f => f.csv),
        note: "Create custom fields in Zoho Leads module before importing",
      });
    }

    const client = getS3Client();
    if (!client) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    // Try to find the batch file
    let key = `fdaily/${batchName}.json`;
    let response;

    try {
      response = await client.send(new GetObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: key,
      }));
    } catch (e) {
      // Try without .json extension
      if (!batchName.endsWith(".json")) {
        try {
          key = `fdaily/${batchName}`;
          response = await client.send(new GetObjectCommand({
            Bucket: SPACES_BUCKET,
            Key: key,
          }));
        } catch (e2) {
          return NextResponse.json({ error: `Batch not found: ${batchName}` }, { status: 404 });
        }
      } else {
        return NextResponse.json({ error: `Batch not found: ${batchName}` }, { status: 404 });
      }
    }

    const content = await response.Body?.transformToString();
    if (!content) {
      return NextResponse.json({ error: "Empty batch file" }, { status: 404 });
    }

    const data = JSON.parse(content);
    const leads = data.leads || [];

    if (leads.length === 0) {
      return NextResponse.json({ error: "No leads in batch" }, { status: 404 });
    }

    // Generate CSV
    const csv = leadsToCSV(leads);

    if (format === "json") {
      // Return JSON preview
      return NextResponse.json({
        batchName,
        totalLeads: leads.length,
        zohoFields: ZOHO_FIELDS.map(f => f.csv),
        preview: leads.slice(0, 3).map(leadToZohoRow),
        downloadUrl: `/api/fdaily/export-zoho?batch=${batchName}&format=csv`,
      });
    }

    // Return CSV file
    const filename = `zoho-import-${batchName}-${Date.now()}.csv`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });

  } catch (error: any) {
    console.error("[FDAILY Export Zoho] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
