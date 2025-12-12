import { NextRequest, NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";

/**
 * Business List Search - CONTACTS with Company Data
 *
 * Data Sources:
 * 1. Apollo.io People API - 275M+ contacts with titles (Owner, CEO, etc.)
 * 2. USBizData NY Datalake - 5.5M NY business contacts in DO Spaces
 *
 * Returns PEOPLE/CONTACTS (not just companies) - includes name, title, email, phone
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

// Decision maker titles to filter by (priority order)
const DECISION_MAKER_TITLES = [
  "Owner",
  "CEO",
  "Chief Executive Officer",
  "Partner",
  "Sales Manager",
  "President",
  "Founder",
  "Co-Founder",
  "Managing Director",
  "Principal",
  "VP",
  "Vice President",
  "Director",
  "General Manager",
];

interface Contact {
  id: string;
  // Contact info
  firstName: string;
  lastName: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  mobile: string; // Mobile/cell phone
  linkedin_url: string;
  // Company info
  company: string;
  domain: string;
  website: string;
  industry: string;
  employees: number;
  revenue: number;
  city: string;
  state: string;
  country: string;
  // Source tracking
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
      title, // Filter by title (Owner, CEO, etc.)
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
    const promises: Promise<{ hits: Contact[]; total: number }>[] = [];

    if (includeApollo && APOLLO_API_KEY) {
      promises.push(searchApolloPeople({ name, state, industry, city, title, revenueMin, revenueMax, page, per_page }));
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
    let allHits: Contact[] = [];
    let totalEstimate = 0;

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        allHits = [...allHits, ...result.value.hits];
        totalEstimate += result.value.total;
      }
    });

    // Sort by title priority (Owner first, then CEO, etc.)
    allHits.sort((a, b) => {
      const aScore = getTitlePriority(a.title);
      const bScore = getTitlePriority(b.title);
      if (aScore !== bScore) return aScore - bScore;
      return a.company.localeCompare(b.company);
    });

    return NextResponse.json({
      hits: allHits.slice(0, per_page),
      estimatedTotalHits: totalEstimate,
      page,
      per_page,
      total_pages: Math.ceil(totalEstimate / per_page),
      sources: {
        apollo: includeApollo && APOLLO_API_KEY ? "enabled (275M+ contacts)" : "disabled",
        usbizdata: includeUSBizData && SPACES_KEY ? "enabled (NY)" : "disabled",
      },
    });
  } catch (error: unknown) {
    console.error("Business list search error:", error);
    return NextResponse.json(
      { error: "Contact search failed", hits: [], estimatedTotalHits: 0 },
      { status: 200 },
    );
  }
}

// Get title priority (lower = higher priority)
function getTitlePriority(title: string): number {
  const t = (title || "").toLowerCase();
  for (let i = 0; i < DECISION_MAKER_TITLES.length; i++) {
    if (t.includes(DECISION_MAKER_TITLES[i].toLowerCase())) {
      return i;
    }
  }
  return 100;
}

/**
 * Search Apollo.io People API - Returns CONTACTS with titles, emails, phones
 */
async function searchApolloPeople(params: {
  name?: string;
  state?: string[];
  industry?: string[];
  city?: string[];
  title?: string[];
  revenueMin?: number;
  revenueMax?: number;
  page: number;
  per_page: number;
}): Promise<{ hits: Contact[]; total: number }> {
  const { name, state, industry, city, title, revenueMin, revenueMax, page, per_page } = params;

  // Build Apollo PEOPLE search parameters
  // Include reveal flags to get actual emails/phones (costs credits but returns real data)
  const searchParams: Record<string, unknown> = {
    page: Math.max(1, page),
    per_page: Math.min(per_page, 100),
    reveal_personal_emails: true,
    reveal_phone_number: true,
  };

  // Search by name or company
  if (name) {
    searchParams.q_organization_name = name;
  }

  // Filter by titles - default to decision makers
  if (title?.length) {
    searchParams.person_titles = title;
  } else {
    // Default: search for owners, CEOs, partners, sales managers
    searchParams.person_titles = DECISION_MAKER_TITLES;
  }

  if (industry?.length) {
    searchParams.q_organization_keyword_tags = industry;
  }

  if (revenueMin !== undefined || revenueMax !== undefined) {
    const minRevenue = revenueMin || 0;
    const maxRevenue = revenueMax || 10000000000;
    searchParams.organization_revenue_in = [`${minRevenue},${maxRevenue}`];
  }

  // Location filter
  if (state?.length) {
    searchParams.person_locations = state.map(
      (s: string) => `United States, ${s}`,
    );
  } else if (name || industry?.length || revenueMin || revenueMax) {
    searchParams.person_locations = ["United States"];
  }

  if (city?.length) {
    const cityLocations = city.map((c: string) => {
      if (state?.length) {
        return `${c}, ${state[0]}, United States`;
      }
      return `${c}, United States`;
    });
    searchParams.person_locations = [
      ...((searchParams.person_locations as string[]) || []),
      ...cityLocations,
    ];
  }

  // Use mixed_people/search to get CONTACTS with emails, phones, titles
  const response = await fetch(`${APOLLO_API_BASE}/mixed_people/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": APOLLO_API_KEY,
    },
    body: JSON.stringify(searchParams),
  });

  if (!response.ok) {
    console.error("Apollo people search error:", await response.text());
    return { hits: [], total: 0 };
  }

  const data = await response.json();

  // Transform Apollo people results to Contact format
  const hits: Contact[] = (data.people || []).map(
    (person: {
      id: string;
      first_name?: string;
      last_name?: string;
      name?: string;
      title?: string;
      email?: string;
      phone_numbers?: Array<{ sanitized_number?: string; type?: string }>;
      city?: string;
      state?: string;
      country?: string;
      linkedin_url?: string;
      organization?: {
        name?: string;
        website_url?: string;
        primary_domain?: string;
        industry?: string;
        estimated_num_employees?: number;
        annual_revenue?: number;
      };
    }) => {
      // Extract phones - separate direct and mobile
      const phones = person.phone_numbers || [];
      const directPhone = phones.find(p => p.type === "work" || p.type === "direct")?.sanitized_number || phones[0]?.sanitized_number || "";
      const mobilePhone = phones.find(p => p.type === "mobile" || p.type === "cell")?.sanitized_number || "";

      return {
        id: person.id,
        firstName: person.first_name || "",
        lastName: person.last_name || "",
        name: person.name || `${person.first_name || ""} ${person.last_name || ""}`.trim(),
        title: person.title || "",
        email: person.email || "",
        phone: directPhone,
        mobile: mobilePhone,
        linkedin_url: person.linkedin_url || "",
        company: person.organization?.name || "",
        domain: person.organization?.primary_domain || person.organization?.website_url?.replace(/^https?:\/\//, "").replace(/\/$/, "") || "",
        website: person.organization?.website_url || "",
        industry: person.organization?.industry || "",
        employees: person.organization?.estimated_num_employees || 0,
        revenue: person.organization?.annual_revenue ? person.organization.annual_revenue * 100 : 0,
        city: person.city || "",
        state: person.state || "",
        country: person.country || "United States",
        source: "apollo" as const,
        sourceLabel: "Apollo.io (275M+)",
      };
    },
  );

  return {
    hits,
    total: data.pagination?.total_entries || hits.length,
  };
}

/**
 * Search USBizData NY Datalake (5.5M NY business contacts)
 * Returns CONTACTS (not just companies) with names, titles, phones
 * Stored in DO Spaces: datalake/business/ny/
 */
async function searchUSBizDataNY(params: {
  name?: string;
  city?: string[];
  industry?: string[];
  page: number;
  per_page: number;
}): Promise<{ hits: Contact[]; total: number }> {
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
      return { hits: [], total: 5514091 };
    }

    const hits: Contact[] = [];
    const maxResults = per_page;
    const skipRecords = (page - 1) * per_page;
    let recordsFound = 0;

    for (const file of files) {
      if (hits.length >= maxResults) break;

      try {
        const data = await fetchAndParseContacts(file.Key!, {
          companyName: name,
          city: city?.[0],
          sicCode: industry?.[0],
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
      total: 5514091,
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
 * Fetch and parse business contacts from DO Spaces CSV
 * Returns Contact format with firstName, lastName, title, etc.
 */
async function fetchAndParseContacts(
  key: string,
  filters: { companyName?: string; city?: string; sicCode?: string },
  maxResults: number,
  skipRecords: number,
): Promise<{ records: Contact[]; totalMatched: number }> {
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
  const records: Contact[] = [];
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

    if (skipped < skipRecords) {
      skipped++;
      continue;
    }

    // Extract contact name parts
    const fullName = row["Contact Name"] || row["Owner Name"] || row["contactName"] || "";
    const nameParts = fullName.split(" ");
    const firstName = row["First Name"] || row["firstName"] || nameParts[0] || "";
    const lastName = row["Last Name"] || row["lastName"] || nameParts.slice(1).join(" ") || "";

    // Transform to Contact format
    records.push({
      id: `usbiz-${i}-${Date.now()}`,
      firstName,
      lastName,
      name: fullName || `${firstName} ${lastName}`.trim(),
      title: row["Title"] || row["title"] || row["Job Title"] || "Owner",
      email: row["Email Address"] || row["email"] || row["Email"] || "",
      phone: row["Phone Number"] || row["phone"] || row["Direct Phone"] || "",
      mobile: row["Mobile"] || row["Cell Phone"] || row["cell"] || "",
      linkedin_url: row["LinkedIn URL"] || row["linkedin"] || "",
      company: row["Company Name"] || row["companyName"] || "",
      domain: (row["Website URL"] || row["website"] || "").replace(/^https?:\/\//, "").replace(/\/$/, ""),
      website: row["Website URL"] || row["website"] || "",
      industry: row["SIC Description"] || row["sicDescription"] || row["Industry"] || "",
      employees: parseInt(row["Number of Employees"] || row["employeeCount"] || "0") || 0,
      revenue: parseInt(row["Annual Revenue"] || row["annualRevenue"] || "0") || 0,
      city: row["City"] || row["city"] || "",
      state: row["State"] || row["state"] || "NY",
      country: "United States",
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
