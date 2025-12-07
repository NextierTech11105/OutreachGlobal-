/**
 * Partnership Finder API
 * Find local businesses by SIC code for coupon/offer partnerships
 * Use with valuation reports to include local business offers
 */

import { NextRequest, NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { PARTNERSHIP_CATEGORIES } from "../schemas/route";

// DO Spaces configuration
const SPACES_ENDPOINT = process.env.SPACES_ENDPOINT || "https://nyc3.digitaloceanspaces.com";
const SPACES_REGION = process.env.SPACES_REGION || "nyc3";
const SPACES_KEY = process.env.SPACES_KEY || process.env.DO_SPACES_KEY || "";
const SPACES_SECRET = process.env.SPACES_SECRET || process.env.DO_SPACES_SECRET || "";
const SPACES_BUCKET = process.env.SPACES_BUCKET || process.env.DO_SPACES_BUCKET || "nextier";

const s3Client = new S3Client({
  endpoint: SPACES_ENDPOINT,
  region: SPACES_REGION,
  credentials: {
    accessKeyId: SPACES_KEY,
    secretAccessKey: SPACES_SECRET,
  },
  forcePathStyle: false,
});

const BUSINESS_DATALAKE_PATH = "datalake/business/ny/";

interface BusinessRecord {
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  website?: string;
  sicCode?: string;
  sicDescription?: string;
  employeeCount?: number;
  annualRevenue?: number;
}

// POST - Find partnership businesses
export async function POST(request: NextRequest) {
  try {
    if (!SPACES_KEY || !SPACES_SECRET) {
      return NextResponse.json({
        error: "DigitalOcean Spaces credentials not configured",
      }, { status: 503 });
    }

    const body = await request.json();
    const {
      categories, // Array of category IDs: ["home_services", "moving_storage", etc.]
      sicCodes, // Direct SIC codes if not using categories
      zipCode, // Filter by ZIP (optional)
      city, // Filter by city (optional)
      county, // Filter by county (optional)
      limit = 50, // Max results per category
      includeContact = true, // Include contact info
    } = body;

    // Resolve SIC codes from categories
    let targetSicCodes: string[] = [];

    if (sicCodes && Array.isArray(sicCodes)) {
      targetSicCodes = sicCodes;
    } else if (categories && Array.isArray(categories)) {
      for (const catId of categories) {
        const cat = PARTNERSHIP_CATEGORIES[catId as keyof typeof PARTNERSHIP_CATEGORIES];
        if (cat) {
          targetSicCodes.push(...cat.sicCodes);
        }
      }
    } else {
      return NextResponse.json({
        error: "Either categories or sicCodes array is required",
        availableCategories: Object.entries(PARTNERSHIP_CATEGORIES).map(([id, cat]) => ({
          id,
          name: cat.name,
          description: cat.description,
          sicCodes: cat.sicCodes,
        })),
      }, { status: 400 });
    }

    // Remove duplicates
    targetSicCodes = [...new Set(targetSicCodes)];

    // Load business data
    const businesses = await loadBusinessRecords(BUSINESS_DATALAKE_PATH);

    if (businesses.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No business data found in datalake. Upload USBizData business CSV first.",
        uploadEndpoint: "/api/datalake/upload",
        schemaId: "ny_business",
        sicCodes: targetSicCodes,
      });
    }

    // Filter businesses
    const results: Record<string, BusinessRecord[]> = {};
    const categoryCounts: Record<string, number> = {};

    for (const biz of businesses) {
      const bizSic = String(biz["SIC Code"] || biz["sicCode"] || "").trim();

      // Check if matches any target SIC
      const matchingSic = targetSicCodes.find(sic => bizSic.startsWith(sic));
      if (!matchingSic) continue;

      // Apply location filters
      if (zipCode) {
        const bizZip = String(biz["Zip Code"] || biz["zipCode"] || biz["Zip"] || "").trim();
        if (!bizZip.startsWith(zipCode)) continue;
      }

      if (city) {
        const bizCity = String(biz["City"] || biz["city"] || "").toLowerCase();
        if (!bizCity.includes(city.toLowerCase())) continue;
      }

      if (county) {
        const bizCounty = String(biz["County"] || biz["county"] || "").toLowerCase();
        if (!bizCounty.includes(county.toLowerCase())) continue;
      }

      // Find which category this belongs to
      let categoryId = "other";
      for (const [catId, cat] of Object.entries(PARTNERSHIP_CATEGORIES)) {
        if (cat.sicCodes.some(sic => bizSic.startsWith(sic))) {
          categoryId = catId;
          break;
        }
      }

      // Initialize category array
      if (!results[categoryId]) {
        results[categoryId] = [];
        categoryCounts[categoryId] = 0;
      }

      // Check limit per category
      if (results[categoryId].length >= limit) continue;

      // Build business record
      const record: BusinessRecord = {
        companyName: String(biz["Company Name"] || biz["companyName"] || ""),
        sicCode: bizSic,
        sicDescription: String(biz["SIC Description"] || biz["sicDescription"] || ""),
        city: String(biz["City"] || biz["city"] || ""),
        state: String(biz["State"] || biz["state"] || "NY"),
        zip: String(biz["Zip Code"] || biz["zipCode"] || ""),
      };

      if (includeContact) {
        record.contactName = String(biz["Contact Name"] || biz["contactName"] || "");
        record.email = String(biz["Email Address"] || biz["email"] || "");
        record.phone = String(biz["Phone Number"] || biz["phone"] || "");
        record.address = String(biz["Street Address"] || biz["address"] || "");
        record.website = String(biz["Website URL"] || biz["website"] || "");
        record.employeeCount = parseInt(String(biz["Number of Employees"] || "0")) || undefined;
        record.annualRevenue = parseFloat(String(biz["Annual Revenue"] || "0")) || undefined;
      }

      results[categoryId].push(record);
      categoryCounts[categoryId]++;
    }

    // Calculate totals
    const totalFound = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);

    return NextResponse.json({
      success: true,
      summary: {
        totalBusinessesSearched: businesses.length,
        totalMatches: totalFound,
        categoriesMatched: Object.keys(results).length,
        sicCodesSearched: targetSicCodes.length,
      },
      filters: {
        categories: categories || [],
        sicCodes: targetSicCodes,
        zipCode,
        city,
        county,
      },
      categoryCounts,
      results,
      useCases: [
        "Include partner coupons in valuation reports",
        "B2B outreach for referral partnerships",
        "Local service provider recommendations",
      ],
    });
  } catch (error) {
    console.error("[Partnership Finder] Error:", error);
    return NextResponse.json({
      error: "Search failed",
      details: String(error),
    }, { status: 500 });
  }
}

// GET - List available partnership categories
export async function GET() {
  const categories = Object.entries(PARTNERSHIP_CATEGORIES).map(([id, cat]) => ({
    id,
    name: cat.name,
    description: cat.description,
    sicCodes: cat.sicCodes,
    useCases: getCategoryUseCases(id),
  }));

  return NextResponse.json({
    success: true,
    message: "Find local businesses for partnership coupons",
    endpoint: "POST /api/datalake/partnerships",
    params: {
      required: "Either categories OR sicCodes array",
      categories: "Array of category IDs",
      sicCodes: "Direct SIC code array",
      optional: {
        zipCode: "Filter by ZIP code prefix",
        city: "Filter by city name",
        county: "Filter by county name",
        limit: "Max results per category (default: 50)",
        includeContact: "Include contact details (default: true)",
      },
    },
    availableCategories: categories,
    workflow: [
      "1. User generates valuation report for property",
      "2. Query partnerships API with property ZIP/city",
      "3. Get local home services, movers, inspectors, etc.",
      "4. Include partnership coupons in report PDF",
      "5. Business partners pay for leads/referrals",
    ],
    configured: {
      hasCredentials: !!(SPACES_KEY && SPACES_SECRET),
      bucket: SPACES_BUCKET,
    },
  });
}

// Load business records from datalake
async function loadBusinessRecords(basePath: string): Promise<Record<string, unknown>[]> {
  const records: Record<string, unknown>[] = [];

  try {
    for (const subfolder of ["processed/", "raw/", "partnerships/"]) {
      const path = basePath + subfolder;

      const listResponse = await s3Client.send(new ListObjectsV2Command({
        Bucket: SPACES_BUCKET,
        Prefix: path,
        MaxKeys: 10,
      }));

      const csvFiles = (listResponse.Contents || []).filter(f => f.Key?.endsWith(".csv"));

      for (const file of csvFiles) {
        try {
          const getResponse = await s3Client.send(new GetObjectCommand({
            Bucket: SPACES_BUCKET,
            Key: file.Key,
          }));

          const content = await getResponse.Body?.transformToString();
          if (!content) continue;

          const parsed = parseCsv(content);
          records.push(...parsed);

          if (records.length >= 50000) break; // Memory limit
        } catch {
          continue;
        }
      }

      if (records.length > 0) break;
    }
  } catch (err) {
    console.warn("[Partnership Finder] Error loading records:", err);
  }

  return records;
}

// Parse CSV
function parseCsv(content: string): Record<string, unknown>[] {
  const lines = content.split("\n");
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const records: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCsvLine(line);
    const record: Record<string, unknown> = {};

    headers.forEach((header, idx) => {
      record[header] = values[idx] || "";
    });

    records.push(record);
  }

  return records;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
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

// Get use cases for each category
function getCategoryUseCases(categoryId: string): string[] {
  const useCases: Record<string, string[]> = {
    home_services: ["Post-sale referrals", "Pre-listing repairs", "Maintenance contracts"],
    moving_storage: ["Closing gifts", "Relocation packages", "Storage discounts"],
    home_inspection: ["Pre-listing inspections", "Buyer inspections", "Investment analysis"],
    mortgage_lending: ["Pre-approval referrals", "Refinance leads", "Investment loans"],
    insurance: ["Homeowner policies", "Landlord coverage", "Builder's risk"],
    landscaping: ["Curb appeal upgrades", "Maintenance contracts", "Seasonal services"],
    cleaning: ["Move-out cleaning", "Deep cleaning", "Regular service"],
    pest_control: ["Pre-sale inspections", "Treatment contracts", "Preventive service"],
    legal: ["Closing attorneys", "Contract review", "Title issues"],
    title_escrow: ["Title searches", "Escrow services", "Insurance policies"],
  };

  return useCases[categoryId] || ["Business partnership", "Referral revenue"];
}
