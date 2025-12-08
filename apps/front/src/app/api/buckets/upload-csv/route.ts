import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { parse } from "csv-parse/sync";

// DO Spaces configuration
const SPACES_ENDPOINT = "https://nyc3.digitaloceanspaces.com";
const SPACES_BUCKET = "nextier";
const SPACES_KEY = process.env.DO_SPACES_KEY || "";
const SPACES_SECRET = process.env.DO_SPACES_SECRET || "";

function getS3Client(): S3Client | null {
  if (!SPACES_KEY || !SPACES_SECRET) {
    return null;
  }
  return new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: "nyc3",
    credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
  });
}

// USBizData source type detection based on columns
type DataLakeType = "business" | "residential" | "cell_phone" | "opt_in_email" | "property" | "unknown";

function detectSourceType(headers: string[]): DataLakeType {
  const headerSet = new Set(headers.map(h => h.toLowerCase().trim()));

  // Business DB: has Company Name, SIC Code, Revenue
  if (headerSet.has("company name") || headerSet.has("sic code") || headerSet.has("annual revenue")) {
    return "business";
  }
  // Cell Phone DB: has Cell Phone but no Company
  if ((headerSet.has("cell phone") || headerSet.has("cell") || headerSet.has("mobile")) &&
      !headerSet.has("company name")) {
    return "cell_phone";
  }
  // Opt-in Email DB: has Opt-in Date or IP Address
  if (headerSet.has("opt-in date") || headerSet.has("opt_in_date") || headerSet.has("ip address")) {
    return "opt_in_email";
  }
  // Residential DB: has Home Value, Income, Age
  if (headerSet.has("home value") || headerSet.has("income") || headerSet.has("age") ||
      headerSet.has("home owner") || headerSet.has("length of residence")) {
    return "residential";
  }
  // Property DB: has APN, property type
  if (headerSet.has("apn") || headerSet.has("property type") || headerSet.has("parcel")) {
    return "property";
  }
  return "unknown";
}

const SOURCE_TYPE_LABELS: Record<DataLakeType, string> = {
  business: "USBizData Business",
  residential: "USBizData Residential",
  cell_phone: "USBizData Cell Phone",
  opt_in_email: "USBizData Opt-in Email",
  property: "Property Records",
  unknown: "CSV Import",
};

// Standard field mappings for USBizData and similar CSV formats
const FIELD_MAPPINGS: Record<string, string[]> = {
  companyName: ["Company Name", "company_name", "Business Name", "business_name", "Name", "name", "COMPANY NAME"],
  contactName: ["Contact Name", "contact_name", "Owner Name", "owner_name", "Full Name", "CONTACT NAME"],
  firstName: ["First Name", "first_name", "FirstName", "FIRST NAME"],
  lastName: ["Last Name", "last_name", "LastName", "LAST NAME"],
  email: ["Email", "email", "Email Address", "email_address", "EMAIL", "E-mail"],
  phone: ["Phone", "phone", "Phone Number", "phone_number", "PHONE", "Telephone", "Tel"],
  cellPhone: ["Cell Phone", "cell_phone", "Cell", "cell", "Mobile", "mobile", "Mobile Phone", "CELL PHONE"],
  address: ["Street Address", "street_address", "Address", "address", "ADDRESS", "Street"],
  city: ["City", "city", "CITY"],
  state: ["State", "state", "STATE", "ST"],
  zip: ["Zip", "zip", "Zip Code", "zip_code", "ZIP", "Postal Code", "zipcode"],
  website: ["Website", "website", "Website URL", "website_url", "URL", "Web"],
  industry: ["Industry", "industry", "INDUSTRY", "Business Type"],
  sicCode: ["SIC Code", "sic_code", "SIC", "SIC_CODE"],
  sicDescription: ["SIC Description", "sic_description", "SIC_DESCRIPTION"],
  employees: ["Employees", "employees", "Number of Employees", "num_employees", "EMPLOYEES"],
  revenue: ["Revenue", "revenue", "Annual Revenue", "annual_revenue", "REVENUE"],
  county: ["County", "county", "COUNTY"],
  areaCode: ["Area Code", "area_code", "AREA CODE"],
  // Residential-specific
  homeValue: ["Home Value", "home_value", "Property Value", "property_value", "HOME VALUE"],
  income: ["Income", "income", "Estimated Income", "INCOME"],
  age: ["Age", "age", "AGE"],
  homeOwner: ["Home Owner", "home_owner", "Homeowner", "homeowner", "Owner", "HOME OWNER"],
  lengthOfResidence: ["Length of Residence", "length_of_residence", "Years at Address", "years_owned"],
  // Opt-in specific
  optInDate: ["Opt-in Date", "opt_in_date", "Optin Date", "signup_date", "OPT-IN DATE"],
  optInSource: ["Opt-in Source", "opt_in_source", "Source", "signup_source"],
  ipAddress: ["IP Address", "ip_address", "IP", "ip"],
};

// Find the actual column name from possible variations
function findColumn(headers: string[], fieldName: string): string | null {
  const variations = FIELD_MAPPINGS[fieldName] || [];
  for (const variation of variations) {
    const found = headers.find(h => h.toLowerCase().trim() === variation.toLowerCase().trim());
    if (found) return found;
  }
  return null;
}

// Normalize a row to standard format
function normalizeRow(row: Record<string, string>, headers: string[]): Record<string, string | null> {
  const normalized: Record<string, string | null> = {};

  for (const [standardField, _] of Object.entries(FIELD_MAPPINGS)) {
    const columnName = findColumn(headers, standardField);
    normalized[standardField] = columnName ? (row[columnName]?.trim() || null) : null;
  }

  // Combine first + last name if no contact name
  if (!normalized.contactName && (normalized.firstName || normalized.lastName)) {
    normalized.contactName = [normalized.firstName, normalized.lastName].filter(Boolean).join(" ");
  }

  return normalized;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const tags = formData.get("tags") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Read file content
    const content = await file.text();

    // Parse CSV
    let records: Record<string, string>[];
    try {
      records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });
    } catch (parseError) {
      return NextResponse.json({
        error: "Failed to parse CSV. Make sure it's a valid CSV file.",
        details: parseError instanceof Error ? parseError.message : "Unknown error"
      }, { status: 400 });
    }

    if (records.length === 0) {
      return NextResponse.json({ error: "CSV file is empty" }, { status: 400 });
    }

    // Get headers from first record
    const headers = Object.keys(records[0]);

    // Auto-detect USBizData source type
    const sourceType = detectSourceType(headers);
    const sourceLabel = SOURCE_TYPE_LABELS[sourceType];
    console.log(`[CSV Upload] Detected source type: ${sourceType} (${sourceLabel})`);

    // Normalize all records
    const normalizedRecords = records.map(row => normalizeRow(row, headers));

    // Count records with key fields
    const withPhone = normalizedRecords.filter(r => r.phone).length;
    const withEmail = normalizedRecords.filter(r => r.email).length;
    const withAddress = normalizedRecords.filter(r => r.address && r.city && r.state).length;

    // Create bucket metadata
    const bucketId = `csv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    // Count cell phones specifically
    const withCellPhone = normalizedRecords.filter(r => r.cellPhone).length;

    const bucket = {
      id: bucketId,
      name: name,
      description: description || `Uploaded CSV: ${file.name}`,
      source: sourceLabel, // Auto-detected: "USBizData Business", "USBizData Residential", etc.
      sourceType: sourceType, // "business", "residential", "cell_phone", "opt_in_email"
      filters: {
        originalFileName: file.name,
        uploadedAt: now,
        columnMappings: headers.reduce((acc, h) => {
          for (const [field, variations] of Object.entries(FIELD_MAPPINGS)) {
            if (variations.some(v => v.toLowerCase() === h.toLowerCase())) {
              acc[h] = field;
              break;
            }
          }
          return acc;
        }, {} as Record<string, string>),
      },
      tags: tags ? tags.split(",").map(t => t.trim()) : [],
      createdAt: now,
      updatedAt: now,
      totalLeads: records.length,
      enrichedLeads: 0,
      queuedLeads: 0,
      contactedLeads: 0,
      enrichmentStatus: "pending",
      // Store the actual data
      properties: normalizedRecords.map((record, index) => ({
        id: `${bucketId}-${index}`,
        ...record,
        // Keep original row data too
        _original: records[index],
      })),
      metadata: {
        id: bucketId,
        name: name,
        description: description,
        savedCount: records.length,
        searchParams: {},
        tags: tags ? tags.split(",").map(t => t.trim()) : [],
        createdAt: now,
        stats: {
          total: records.length,
          withPhone,
          withCellPhone,
          withEmail,
          withAddress,
          enrichable: withAddress, // Records that can be skip-traced
          needsSkipTrace: withAddress - withCellPhone, // Have address but no cell
        },
      },
    };

    // Save to DO Spaces
    const client = getS3Client();
    if (client) {
      await client.send(
        new PutObjectCommand({
          Bucket: SPACES_BUCKET,
          Key: `buckets/${bucketId}.json`,
          Body: JSON.stringify(bucket, null, 2),
          ContentType: "application/json",
        })
      );
    } else {
      console.warn("[CSV Upload] DO Spaces not configured, data not persisted");
    }

    return NextResponse.json({
      success: true,
      bucket: {
        id: bucket.id,
        name: bucket.name,
        totalLeads: bucket.totalLeads,
        stats: bucket.metadata.stats,
      },
      message: `Uploaded ${records.length} records. ${withPhone} with phones, ${withEmail} with emails, ${withAddress} enrichable addresses.`,
    });
  } catch (error) {
    console.error("[CSV Upload] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
