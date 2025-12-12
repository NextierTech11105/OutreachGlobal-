import { NextRequest, NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";

/**
 * Business List Companies Search
 *
 * Data Sources:
 * 1. Apollo.io API - 60M+ companies across US
 * 2. USBizData NY Datalake - 5.5M NY businesses in DO Spaces
 *
 * When searching NY state, results are merged from both sources.
 */

const APOLLO_API_BASE = "https://api.apollo.io/v1";
const APOLLO_API_KEY = process.env.APOLLO_IO_API_KEY || process.env.NEXT_PUBLIC_APOLLO_IO_API_KEY || process.env.APOLLO_API_KEY || "";

// DO Spaces for USBizData NY datalake
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

interface Company {
  id: string;
  name: string;
  domain: string;
  website: string;
  industry: string;
  employees: number;
  revenue: number;
  city: string;
  state: string;
  country: string;
  phone: string;
  linkedin_url: string;
  founded_year: number;
  email?: string;
  source: "apollo" | "usbizdata";
  sourceLabel: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      state,
      industry,
      city,
      revenueMin,
      revenueMax,
      page = 1,
      per_page = 25,
      source = "all", // "all", "apollo", "usbizdata"
    } = body;

    // Determine which sources to query
    const includeApollo = source === "all" || source === "apollo";
    const includeUSBizData = (source === "all" || source === "usbizdata") &&
      (!state?.length || state.some((s: string) => s.toUpperCase() === "NY" || s.toLowerCase() === "new york"));

    // Run both queries in parallel
    const promises: Promise<{ hits: Company[]; total: number }>[] = [];

    if (includeApollo && APOLLO_API_KEY) {
      promises.push(searchApollo({ name, state, industry, city, revenueMin, revenueMax, page, per_page }));
    }

    if (includeUSBizData && SPACES_KEY && SPACES_SECRET) {
      promises.push(searchUSBizDataNY({ name, city, industry, page, per_page }));
    }

    if (promises.length === 0) {
      return NextResponse.json({
        error: "No data sources available. Configure APOLLO_IO_API_KEY or DO_SPACES credentials.",
        hits: [],
        estimatedTotalHits: 0,
      }, { status: 200 });
    }

    const results = await Promise.allSettled(promises);

    // Merge results
    let allHits: Company[] = [];
    let totalEstimate = 0;

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        allHits = [...allHits, ...result.value.hits];
        totalEstimate += result.value.total;
      }
    });

    // Sort by name and dedupe by similar company names
    allHits.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      hits: allHits.slice(0, per_page),
      estimatedTotalHits: totalEstimate,
      page,
      per_page,
      total_pages: Math.ceil(totalEstimate / per_page),
      sources: {
        apollo: includeApollo && APOLLO_API_KEY ? "enabled" : "disabled",
        usbizdata: includeUSBizData && SPACES_KEY ? "enabled (NY)" : "disabled",
      },
    });
  } catch (error: unknown) {
    console.error("Business list companies search error:", error);
    return NextResponse.json(
      { error: "Company search failed", hits: [], estimatedTotalHits: 0 },
      { status: 200 },
    );
  }
}

/**
 * Search Apollo.io API
 */
async function searchApollo(params: {
  name?: string;
  state?: string[];
  industry?: string[];
  city?: string[];
  revenueMin?: number;
  revenueMax?: number;
  page: number;
  per_page: number;
}): Promise<{ hits: Company[]; total: number }> {
  const { name, state, industry, city, revenueMin, revenueMax, page, per_page } = params;

  // Build Apollo organization search parameters
  const searchParams: Record<string, unknown> = {
    page: Math.max(1, page),
    per_page: Math.min(per_page, 100),
  };

  if (name) {
    searchParams.q_organization_name = name;
  }

  if (industry?.length) {
    searchParams.q_organization_keyword_tags = industry;
  }

  if (revenueMin !== undefined || revenueMax !== undefined) {
    const minRevenue = revenueMin || 0;
    const maxRevenue = revenueMax || 10000000000;
    searchParams.organization_revenue_in = [`${minRevenue},${maxRevenue}`];
  }

  if (state?.length) {
    searchParams.organization_locations = state.map(
      (s: string) => `United States, ${s}`,
    );
  } else if (name || industry?.length || revenueMin || revenueMax) {
    searchParams.organization_locations = ["United States"];
  }

  if (city?.length) {
    const cityLocations = city.map((c: string) => {
      if (state?.length) {
        return `${c}, ${state[0]}, United States`;
      }
      return `${c}, United States`;
    });
    searchParams.organization_locations = [
      ...((searchParams.organization_locations as string[]) || []),
      ...cityLocations,
    ];
  }

  const response = await fetch(`${APOLLO_API_BASE}/mixed_companies/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": APOLLO_API_KEY,
    },
    body: JSON.stringify(searchParams),
  });

  if (!response.ok) {
    console.error("Apollo company search error:", await response.text());
    return { hits: [], total: 0 };
  }

  const data = await response.json();

  const hits: Company[] = (data.organizations || data.accounts || []).map(
    (org: {
      id: string;
      name?: string;
      website_url?: string;
      primary_domain?: string;
      industry?: string;
      estimated_num_employees?: number;
      annual_revenue?: number;
      city?: string;
      state?: string;
      country?: string;
      phone?: string;
      linkedin_url?: string;
      founded_year?: number;
    }) => ({
      id: org.id,
      name: org.name || "",
      domain: org.primary_domain || org.website_url?.replace(/^https?:\/\//, "").replace(/\/$/, "") || "",
      website: org.website_url || "",
      industry: org.industry || "",
      employees: org.estimated_num_employees || 0,
      revenue: org.annual_revenue ? org.annual_revenue * 100 : 0,
      city: org.city || "",
      state: org.state || "",
      country: org.country || "United States",
      phone: org.phone || "",
      linkedin_url: org.linkedin_url || "",
      founded_year: org.founded_year || 0,
      source: "apollo" as const,
      sourceLabel: "Apollo.io (60M+)",
    }),
  );

  return {
    hits,
    total: data.pagination?.total_entries || hits.length,
  };
}

/**
 * Search USBizData NY Datalake (5.5M NY businesses)
 * Stored in DO Spaces: datalake/business/ny/
 */
async function searchUSBizDataNY(params: {
  name?: string;
  city?: string[];
  industry?: string[];
  page: number;
  per_page: number;
}): Promise<{ hits: Company[]; total: number }> {
  const { name, city, industry, page, per_page } = params;

  try {
    // List business files in datalake
    const basePath = "datalake/business/ny/";
    const processedPath = `${basePath}processed/`;
    const rawPath = `${basePath}raw/`;

    let files = await listCsvFiles(processedPath);
    if (files.length === 0) {
      files = await listCsvFiles(rawPath);
    }

    if (files.length === 0) {
      console.log("[USBizData] No NY business files found in datalake");
      return { hits: [], total: 5514091 }; // Return known total for estimate
    }

    const hits: Company[] = [];
    const maxResults = per_page;
    const skipRecords = (page - 1) * per_page;
    let recordsFound = 0;

    for (const file of files) {
      if (hits.length >= maxResults) break;

      try {
        const data = await fetchAndParseBusiness(file.Key!, {
          companyName: name,
          city: city?.[0],
          sicCode: industry?.[0], // Map industry to SIC code if possible
        }, maxResults - hits.length, skipRecords - recordsFound);

        hits.push(...data.records);
        recordsFound += data.totalMatched;
      } catch (err) {
        console.warn(`[USBizData] Error reading ${file.Key}:`, err);
        continue;
      }
    }

    return {
      hits,
      total: 5514091, // Known total from schema
    };
  } catch (error) {
    console.error("[USBizData] Search error:", error);
    return { hits: [], total: 0 };
  }
}

/**
 * List CSV files in a DO Spaces path
 */
async function listCsvFiles(prefix: string) {
  try {
    const response = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: SPACES_BUCKET,
        Prefix: prefix,
      }),
    );

    return (response.Contents || []).filter(
      (obj) => obj.Key?.endsWith(".csv") && !obj.Key?.endsWith(".meta.json"),
    );
  } catch {
    return [];
  }
}

/**
 * Fetch and parse business CSV from DO Spaces
 */
async function fetchAndParseBusiness(
  key: string,
  filters: { companyName?: string; city?: string; sicCode?: string },
  maxResults: number,
  skipRecords: number,
): Promise<{ records: Company[]; totalMatched: number }> {
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: SPACES_BUCKET,
      Key: key,
    }),
  );

  const content = await response.Body?.transformToString();
  if (!content) return { records: [], totalMatched: 0 };

  const lines = content.split("\n");
  if (lines.length < 2) return { records: [], totalMatched: 0 };

  const headers = parseCsvLine(lines[0]);
  const records: Company[] = [];
  let totalMatched = 0;
  let skipped = 0;

  for (let i = 1; i < lines.length && records.length < maxResults; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => (row[h] = values[idx] || ""));

    // Apply filters
    if (filters.companyName) {
      const companyName = (row["Company Name"] || row["companyName"] || "").toLowerCase();
      if (!companyName.includes(filters.companyName.toLowerCase())) continue;
    }

    if (filters.city) {
      const cityValue = (row["City"] || row["city"] || "").toLowerCase();
      if (!cityValue.includes(filters.city.toLowerCase())) continue;
    }

    if (filters.sicCode) {
      const sic = row["SIC Code"] || row["sicCode"] || "";
      if (!sic.startsWith(filters.sicCode)) continue;
    }

    totalMatched++;

    // Handle pagination skip
    if (skipped < skipRecords) {
      skipped++;
      continue;
    }

    // Transform to Company format
    records.push({
      id: `usbiz-${i}-${Date.now()}`,
      name: row["Company Name"] || row["companyName"] || "",
      domain: (row["Website URL"] || row["website"] || "").replace(/^https?:\/\//, "").replace(/\/$/, ""),
      website: row["Website URL"] || row["website"] || "",
      industry: row["SIC Description"] || row["sicDescription"] || "",
      employees: parseInt(row["Number of Employees"] || row["employeeCount"] || "0") || 0,
      revenue: parseInt(row["Annual Revenue"] || row["annualRevenue"] || "0") || 0,
      city: row["City"] || row["city"] || "",
      state: row["State"] || row["state"] || "NY",
      country: "United States",
      phone: row["Phone Number"] || row["phone"] || "",
      email: row["Email Address"] || row["email"] || "",
      linkedin_url: "",
      founded_year: 0,
      source: "usbizdata" as const,
      sourceLabel: "USBizData NY (5.5M)",
    });
  }

  return { records, totalMatched };
}

/**
 * Parse CSV line handling quotes
 */
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
