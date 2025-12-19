/**
 * Airflow Datalake API Routes
 * Called by datalake_etl_dag.py for batch upserts and manifest tracking
 *
 * CONNECTED TO: DigitalOcean Managed PostgreSQL
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  businesses,
  contacts,
  leads,
  properties,
  dataSources,
} from "@/lib/db/schema";
import { eq, ilike, or, sql, count, desc, and } from "drizzle-orm";

// USBizData exact column structure (NY 5.5M, Hotel-Motel 433K, etc.)
interface DatalakeRecord {
  source_file: string;
  company_name: string;
  contact_name: string;
  title: string;
  phone: string;
  email: string;
  street_address: string;
  city: string;
  state: string;
  zip: string;
  county: string; // USBizData field
  area_code: string; // USBizData field
  website: string; // USBizData field (Website URL)
  sic_code: string;
  sic_description: string; // USBizData field
  employee_count: string; // Number of Employees
  revenue_range: string; // Annual Revenue
  normalized_address: string;
}

// Datalake sector labels for categorization
const DATALAKE_SECTORS = {
  // Hospitality & Recreation
  "hotel-motel": { sic: ["7011"], label: "Hotel & Motel" },
  "campgrounds-rv": { sic: ["7033"], label: "Campgrounds & RV Parks" },
  restaurants: { sic: ["5812", "5813"], label: "Restaurants & Bars" },

  // Transportation
  trucking: { sic: ["4213", "4214", "4215"], label: "Trucking & Freight" },
  logistics: { sic: ["4731", "4783"], label: "Logistics & Warehousing" },

  // Aviation
  "aircraft-parts": {
    sic: ["3721", "3724", "3728"],
    label: "Aircraft Parts & Services",
  },

  // Automotive
  "auto-parts": {
    sic: ["5013", "5531", "5571"],
    label: "Auto Parts & Accessories",
  },
  "auto-dealers": { sic: ["5511", "5521"], label: "Auto Dealers" },
  "auto-repair": {
    sic: ["7538", "7539", "7549", "7537"],
    label: "Auto Repair & Service",
  },

  // Healthcare
  medical: {
    sic: ["8011", "8021", "8031", "8041", "8042", "8049"],
    label: "Medical Practices",
  },
  dental: { sic: ["8021"], label: "Dental Offices" },
  "nursing-homes": {
    sic: ["8051", "8052"],
    label: "Nursing & Care Facilities",
  },

  // Construction & Trades
  construction: {
    sic: ["1521", "1522", "1531", "1541", "1542"],
    label: "Construction",
  },
  "plumbing-hvac": { sic: ["1711"], label: "Plumbing & HVAC" },
  electrical: { sic: ["1731"], label: "Electrical Contractors" },
  roofing: { sic: ["1761"], label: "Roofing & Siding" },

  // Professional Services
  legal: { sic: ["8111"], label: "Law Firms" },
  accounting: { sic: ["8721"], label: "Accounting & Tax" },
  insurance: { sic: ["6411"], label: "Insurance Agencies" },

  // Real Estate
  "real-estate": { sic: ["6531", "6512", "6519"], label: "Real Estate" },
  "property-mgmt": { sic: ["6531"], label: "Property Management" },

  // Retail
  "retail-general": { sic: ["5311", "5331"], label: "General Retail" },
  convenience: { sic: ["5411", "5412"], label: "Convenience & Grocery" },

  // NY Business (general)
  "ny-business": { sic: [], label: "New York Businesses" },
} as const;

type DatalakeSector = keyof typeof DATALAKE_SECTORS;

// Map to your existing Companies schema + USBizData extensions
interface CompanySchemaRecord {
  name: string; // Company Name (Required, Searchable)
  website: string; // Website (URL, Searchable)
  industry: string; // Industry (Dropdown, Searchable)
  size: string; // Company Size (Dropdown, Searchable)
  address: string; // Address (Address, Searchable)
  // Extended fields for cross-referencing
  contact_name?: string;
  contact_title?: string;
  phone?: string;
  email?: string;
  source_file?: string;
  normalized_address?: string;
  // USBizData specific fields
  county?: string;
  area_code?: string;
  sic_description?: string;
  revenue_range?: string;
  // Sector labeling
  sector?: string; // e.g., "hotel-motel", "trucking", "auto-parts"
  sector_label?: string; // e.g., "Hotel & Motel", "Trucking & Freight"
}

// Auto-detect sector from SIC code
function detectSectorFromSic(sicCode: string): {
  sector: string;
  label: string;
} {
  if (!sicCode) return { sector: "other", label: "Other" };

  for (const [sectorKey, config] of Object.entries(DATALAKE_SECTORS)) {
    if (config.sic.some((sic) => sicCode.startsWith(sic))) {
      return { sector: sectorKey, label: config.label };
    }
  }

  return { sector: "other", label: "Other" };
}

// SIC code to industry mapping
const SIC_TO_INDUSTRY: Record<string, string> = {
  // Technology
  "35": "technology",
  "36": "technology",
  "37": "technology",
  "48": "technology",
  "73": "technology",
  "87": "technology",
  // Healthcare
  "80": "healthcare",
  "83": "healthcare",
  // Finance
  "60": "finance",
  "61": "finance",
  "62": "finance",
  "63": "finance",
  "64": "finance",
  "65": "finance",
  "67": "finance",
  // Education
  "82": "education",
  // Retail
  "52": "retail",
  "53": "retail",
  "54": "retail",
  "55": "retail",
  "56": "retail",
  "57": "retail",
  "58": "retail",
  "59": "retail",
  // Manufacturing
  "20": "manufacturing",
  "21": "manufacturing",
  "22": "manufacturing",
  "23": "manufacturing",
  "24": "manufacturing",
  "25": "manufacturing",
  "26": "manufacturing",
  "27": "manufacturing",
  "28": "manufacturing",
  "29": "manufacturing",
  "30": "manufacturing",
  "31": "manufacturing",
  "32": "manufacturing",
  "33": "manufacturing",
  "34": "manufacturing",
  "38": "manufacturing",
  "39": "manufacturing",
};

function mapSicToIndustry(sicCode: string): string {
  if (!sicCode) return "other";
  const prefix = sicCode.substring(0, 2);
  return SIC_TO_INDUSTRY[prefix] || "other";
}

function mapEmployeeCountToSize(count: string): string {
  const num = parseInt(count) || 0;
  if (num <= 10) return "1-10";
  if (num <= 50) return "11-50";
  if (num <= 200) return "51-200";
  if (num <= 500) return "201-500";
  if (num <= 1000) return "501-1000";
  return "1000+";
}

function transformToCompanySchema(
  record: DatalakeRecord,
  overrideSector?: DatalakeSector,
): CompanySchemaRecord {
  const fullAddress = [
    record.street_address,
    record.city,
    record.state,
    record.zip,
  ]
    .filter(Boolean)
    .join(", ");

  // Auto-detect sector from SIC or use override
  const { sector, label } = overrideSector
    ? {
        sector: overrideSector,
        label: DATALAKE_SECTORS[overrideSector]?.label || overrideSector,
      }
    : detectSectorFromSic(record.sic_code);

  return {
    name: record.company_name,
    website: record.website || "",
    industry: mapSicToIndustry(record.sic_code),
    size: mapEmployeeCountToSize(record.employee_count),
    address: fullAddress,
    contact_name: record.contact_name,
    contact_title: record.title,
    phone: record.phone,
    email: record.email,
    source_file: record.source_file,
    normalized_address: record.normalized_address,
    // USBizData fields
    county: record.county,
    area_code: record.area_code,
    sic_description: record.sic_description,
    revenue_range: record.revenue_range,
    // Sector tagging
    sector,
    sector_label: label,
  };
}

// POST /api/airflow/datalake - Main router
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "upsert";
    const body = await request.json();

    switch (action) {
      case "upsert":
        return handleUpsert(body);
      case "complete":
        return handleComplete(body);
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[Airflow Datalake] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// GET /api/airflow/datalake - Search and manifest queries
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "search";

    switch (action) {
      case "search":
        return handleSearch(url.searchParams);
      case "manifest":
        return handleManifest();
      case "sectors":
        return handleSectors();
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[Airflow Datalake] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function handleUpsert(body: {
  records: DatalakeRecord[];
  sector?: DatalakeSector;
  userId?: string;
}) {
  const { records, sector, userId = "system" } = body;

  if (!records || !Array.isArray(records)) {
    return NextResponse.json(
      { error: "Records array required" },
      { status: 400 },
    );
  }

  const sectorLabel = sector
    ? DATALAKE_SECTORS[sector]?.label || sector
    : "auto-detect";
  console.log(
    `[Airflow Datalake] Upserting ${records.length} records to PostgreSQL | Sector: ${sectorLabel}`,
  );

  let inserted = 0;
  let updated = 0;
  const sectorCounts: Record<string, number> = {};

  // Batch insert to PostgreSQL
  for (const record of records) {
    const schemaRecord = transformToCompanySchema(record, sector);
    const s = schemaRecord.sector || "other";
    sectorCounts[s] = (sectorCounts[s] || 0) + 1;

    try {
      // Check for existing record by company name + address
      const existing = await db
        .select()
        .from(businesses)
        .where(
          and(
            eq(businesses.companyName, schemaRecord.name),
            eq(businesses.address, schemaRecord.address || ""),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing business
        await db
          .update(businesses)
          .set({
            phone: schemaRecord.phone || existing[0].phone,
            email: schemaRecord.email || existing[0].email,
            website: schemaRecord.website || existing[0].website,
            sicCode: record.sic_code || existing[0].sicCode,
            sicDescription:
              record.sic_description || existing[0].sicDescription,
            employeeCount:
              parseInt(record.employee_count) || existing[0].employeeCount,
            revenueRange: record.revenue_range || existing[0].revenueRange,
            primarySectorId: schemaRecord.sector,
            updatedAt: new Date(),
          })
          .where(eq(businesses.id, existing[0].id));
        updated++;
      } else {
        // Insert new business record
        await db.insert(businesses).values({
          userId,
          companyName: schemaRecord.name,
          address: schemaRecord.address,
          city: record.city,
          state: record.state,
          zip: record.zip,
          county: record.county,
          phone: schemaRecord.phone,
          email: schemaRecord.email,
          website: schemaRecord.website,
          sicCode: record.sic_code,
          sicDescription: record.sic_description,
          employeeCount: parseInt(record.employee_count) || null,
          revenueRange: record.revenue_range,
          primarySectorId: schemaRecord.sector,
          ownerName: schemaRecord.contact_name,
          ownerTitle: schemaRecord.contact_title,
          status: "new",
        });
        inserted++;
      }
    } catch (err) {
      console.error(`[Airflow Datalake] Error upserting record:`, err);
    }
  }

  // Get total count from database
  const totalResult = await db.select({ count: count() }).from(businesses);
  const total = totalResult[0]?.count || 0;

  console.log(
    `[Airflow Datalake] PostgreSQL - Inserted: ${inserted}, Updated: ${updated}, Total: ${total}`,
  );

  return NextResponse.json({
    success: true,
    inserted,
    updated,
    total,
    schema: "businesses",
    database: "postgresql",
    sectors: sectorCounts,
  });
}

async function handleComplete(body: {
  processed_files: string[];
  total_records: number;
  run_date: string;
  userId?: string;
}) {
  const { processed_files, total_records, run_date, userId = "system" } = body;

  // Create data source records for processed files
  for (const file of processed_files || []) {
    try {
      await db.insert(dataSources).values({
        userId,
        name: file,
        slug: file.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        sourceType: "csv",
        sourceProvider: "usbizdata",
        fileName: file,
        status: "completed",
        totalRows: Math.floor(total_records / (processed_files?.length || 1)),
        processedRows: Math.floor(
          total_records / (processed_files?.length || 1),
        ),
        processedAt: new Date(run_date),
      });
    } catch (err) {
      console.error(`[Airflow Datalake] Error creating data source:`, err);
    }
  }

  // Get actual counts from database
  const dataSourceCount = await db.select({ count: count() }).from(dataSources);
  const businessCount = await db.select({ count: count() }).from(businesses);

  console.log(
    `[Airflow Datalake] ETL Complete - ${total_records} records from ${processed_files?.length} files`,
  );

  return NextResponse.json({
    success: true,
    manifest_size: dataSourceCount[0]?.count || 0,
    total_records: businessCount[0]?.count || 0,
    database: "postgresql",
  });
}

async function handleSectors() {
  // Return available sectors for datalake categorization
  const sectors = Object.entries(DATALAKE_SECTORS).map(([key, config]) => ({
    id: key,
    label: config.label,
    sic_codes: config.sic,
  }));

  // Get sector stats from database
  const sectorStats: Record<string, number> = {};

  try {
    // Query businesses grouped by sector
    const sectorCounts = await db
      .select({
        sector: businesses.primarySectorId,
        count: count(),
      })
      .from(businesses)
      .groupBy(businesses.primarySectorId);

    for (const row of sectorCounts) {
      const s = row.sector || "other";
      sectorStats[s] = Number(row.count);
    }
  } catch (err) {
    console.error("[Airflow Datalake] Error fetching sector stats:", err);
  }

  // Get total records from database
  const totalResult = await db.select({ count: count() }).from(businesses);
  const total = totalResult[0]?.count || 0;

  return NextResponse.json({
    sectors,
    stats: sectorStats,
    total_records: total,
    database: "postgresql",
  });
}

async function handleSearch(params: URLSearchParams) {
  const address = params.get("address");
  const name = params.get("name");
  const sector = params.get("sector");
  const query = params.get("q"); // Natural language search
  const limitParam = parseInt(params.get("limit") || "50");

  // Build query conditions
  const conditions = [];

  if (sector) {
    conditions.push(eq(businesses.primarySectorId, sector));
  }

  if (address) {
    conditions.push(ilike(businesses.address, `%${address}%`));
  }

  if (name) {
    conditions.push(
      or(
        ilike(businesses.companyName, `%${name}%`),
        ilike(businesses.ownerName, `%${name}%`),
      ),
    );
  }

  if (query) {
    // Natural language search across multiple fields
    conditions.push(
      or(
        ilike(businesses.companyName, `%${query}%`),
        ilike(businesses.ownerName, `%${query}%`),
        ilike(businesses.city, `%${query}%`),
        ilike(businesses.sicDescription, `%${query}%`),
      ),
    );
  }

  try {
    // Query PostgreSQL database
    let dbQuery = db
      .select({
        id: businesses.id,
        name: businesses.companyName,
        address: businesses.address,
        city: businesses.city,
        state: businesses.state,
        zip: businesses.zip,
        phone: businesses.phone,
        email: businesses.email,
        website: businesses.website,
        contact_name: businesses.ownerName,
        contact_title: businesses.ownerTitle,
        sector: businesses.primarySectorId,
        sic_code: businesses.sicCode,
        sic_description: businesses.sicDescription,
        employee_count: businesses.employeeCount,
        revenue_range: businesses.revenueRange,
        status: businesses.status,
        score: businesses.score,
        created_at: businesses.createdAt,
      })
      .from(businesses)
      .orderBy(desc(businesses.createdAt))
      .limit(limitParam);

    // Apply conditions if any
    if (conditions.length > 0) {
      dbQuery = dbQuery.where(and(...conditions)) as typeof dbQuery;
    }

    const results = await dbQuery;

    // Get total count for the query
    let countQuery = db.select({ count: count() }).from(businesses);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions)) as typeof countQuery;
    }
    const totalResult = await countQuery;

    return NextResponse.json({
      businesses: results,
      count: results.length,
      total: totalResult[0]?.count || 0,
      sector_filter: sector || null,
      database: "postgresql",
    });
  } catch (err) {
    console.error("[Airflow Datalake] Search error:", err);
    return NextResponse.json(
      { error: "Database query failed", details: String(err) },
      { status: 500 },
    );
  }
}

async function handleManifest() {
  try {
    // Get data sources from database
    const sources = await db
      .select({
        file: dataSources.fileName,
        processedAt: dataSources.processedAt,
        recordCount: dataSources.totalRows,
        status: dataSources.status,
        sourceProvider: dataSources.sourceProvider,
      })
      .from(dataSources)
      .orderBy(desc(dataSources.processedAt))
      .limit(100);

    const files = sources.map((s) => ({
      file: s.file,
      processedAt: s.processedAt?.toISOString(),
      recordCount: s.recordCount,
      status: s.status,
      provider: s.sourceProvider,
    }));

    return NextResponse.json({
      processed_files: files,
      total_files: files.length,
      database: "postgresql",
    });
  } catch (err) {
    console.error("[Airflow Datalake] Manifest error:", err);
    return NextResponse.json(
      { processed_files: [], total_files: 0, error: String(err) },
      { status: 500 },
    );
  }
}

// Simple address similarity calculation
function calculateAddressSimilarity(addr1: string, addr2: string): number {
  if (!addr1 || !addr2) return 0;

  const tokens1 = new Set(addr1.split(/\s+/));
  const tokens2 = new Set(addr2.split(/\s+/));

  const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);

  return intersection.size / union.size;
}
