/**
 * B2B Search API
 *
 * Data Sources:
 * 1. PostgreSQL businesses table (USBizData - primary)
 * 2. DO Spaces bucket files (legacy fallback)
 * 3. Apollo API (external search)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { eq, ilike, or, and, count, desc } from "drizzle-orm";
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

// Pushbutton Business List API (Primary - 34M companies)
const BUSINESS_LIST_API_URL =
  process.env.BUSINESS_LIST_API_URL || "https://api.pushbuttonbusinesslist.com";
const BUSINESS_LIST_API_KEY = process.env.BUSINESS_LIST_API_KEY || "";

// DO Spaces (Secondary - USBizData NY)
const SPACES_ENDPOINT =
  process.env.SPACES_ENDPOINT || "https://nyc3.digitaloceanspaces.com";
const SPACES_REGION = process.env.SPACES_REGION || "nyc3";
const SPACES_KEY = process.env.SPACES_KEY || process.env.DO_SPACES_KEY || "";
const SPACES_SECRET =
  process.env.SPACES_SECRET || process.env.DO_SPACES_SECRET || "";
const SPACES_BUCKET =
  process.env.SPACES_BUCKET || process.env.DO_SPACES_BUCKET || "nextier";

// Apollo API (Fallback)
const APOLLO_API_KEY = process.env.APOLLO_IO_API_KEY || "";

const s3Client = new S3Client({
  endpoint: SPACES_ENDPOINT,
  region: SPACES_REGION,
  credentials: {
    accessKeyId: SPACES_KEY,
    secretAccessKey: SPACES_SECRET,
  },
  forcePathStyle: true,
});

// Decision maker titles to filter for
const DECISION_MAKER_TITLES = [
  "owner",
  "ceo",
  "chief executive",
  "cfo",
  "chief financial",
  "coo",
  "chief operating",
  "cto",
  "chief technology",
  "partner",
  "president",
  "vice president",
  "vp ",
  "director",
  "sales manager",
  "general manager",
  "managing director",
  "founder",
  "co-founder",
  "principal",
];

interface BucketLead {
  id: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  title?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  sicCode?: string;
  matchingKeys?: {
    title?: string | null;
    companyName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    sicCode?: string | null;
  };
  seniority?: {
    title?: string | null;
    level?: string;
    isDecisionMaker?: boolean;
  };
  _original?: Record<string, string>;
  [key: string]: unknown;
}

// Get the title from various places in the lead data
function getLeadTitle(lead: BucketLead): string {
  return (lead.title ||
    lead.matchingKeys?.title ||
    lead.seniority?.title ||
    lead._original?.["Title"] ||
    lead._original?.["title"] ||
    lead._original?.["Job Title"] ||
    "") as string;
}

// Check if a title matches decision maker criteria
function isDecisionMaker(lead: BucketLead): boolean {
  const title = getLeadTitle(lead).toLowerCase();
  if (!title) return false;
  return DECISION_MAKER_TITLES.some((dm) => title.includes(dm));
}

// Format lead for API response
function formatLead(lead: BucketLead) {
  const keys = lead.matchingKeys || {};
  const original = lead._original || {};

  return {
    id: lead.id,
    first_name:
      lead.firstName ||
      keys.firstName ||
      original["First Name"] ||
      original["first_name"] ||
      "",
    last_name:
      lead.lastName ||
      keys.lastName ||
      original["Last Name"] ||
      original["last_name"] ||
      "",
    title: getLeadTitle(lead),
    company:
      lead.company ||
      keys.companyName ||
      original["Company"] ||
      original["company"] ||
      original["Company Name"] ||
      "",
    email: lead.email || original["Email"] || original["email"] || "",
    phone:
      lead.phone ||
      original["Phone"] ||
      original["phone"] ||
      original["Direct Phone"] ||
      "",
    address:
      lead.address ||
      keys.address ||
      original["Address"] ||
      original["address"] ||
      "",
    city: lead.city || keys.city || original["City"] || original["city"] || "",
    state:
      lead.state ||
      keys.state ||
      original["State"] ||
      original["state"] ||
      "NY",
    zip_code:
      lead.zipCode ||
      keys.zip ||
      original["Zip"] ||
      original["zip"] ||
      original["Zip Code"] ||
      "",
    sic_code:
      lead.sicCode ||
      keys.sicCode ||
      original["SIC Code"] ||
      original["sic_code"] ||
      "",
    sic_description:
      original["SIC Description"] || original["sic_description"] || "",
    industry: original["Industry"] || original["industry"] || "",
    revenue:
      original["Revenue"] ||
      original["revenue"] ||
      original["Annual Revenue"] ||
      "",
    employees:
      original["Employees"] ||
      original["employees"] ||
      original["Number of Employees"] ||
      "",
    is_decision_maker: isDecisionMaker(lead),
    property_id: null,
    created_at: new Date().toISOString(),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      state,
      city,
      company,
      sicCode,
      email,
      title,
      decisionMakersOnly = true,
      limit = 50,
      offset = 0,
      bucketId,
      source = "postgresql", // Default to PostgreSQL
    } = body;

    // PRIMARY: Search PostgreSQL businesses table (USBizData)
    if (source === "postgresql" || !bucketId) {
      try {
        const pgResults = await searchPostgreSQL({
          state,
          city,
          company,
          sicCode,
          title,
          decisionMakersOnly,
          limit,
          offset,
        });

        if (pgResults.leads.length > 0 || source === "postgresql") {
          return NextResponse.json({
            ...pgResults,
            source: "postgresql",
            database: "businesses",
            filters: { state, city, company, title, decisionMakersOnly },
          });
        }
      } catch (pgError) {
        console.warn(
          "[B2B Search] PostgreSQL query failed, falling back to DO Spaces:",
          pgError,
        );
      }
    }

    // FALLBACK: Search DO Spaces bucket files
    if (!SPACES_KEY || !SPACES_SECRET) {
      return NextResponse.json(
        {
          error:
            "No data sources configured - check DATABASE_URL and DO Spaces credentials",
        },
        { status: 503 },
      );
    }

    const filters = {
      state,
      city,
      company,
      sicCode,
      email,
      title,
      decisionMakersOnly,
    };

    if (bucketId) {
      const results = await searchBucket(bucketId, filters, limit);
      return NextResponse.json({
        leads: results.map(formatLead),
        total: results.length,
        limit,
        offset: 0,
        source: "bucket",
        bucketId,
        filters: { decisionMakersOnly, title },
      });
    }

    const bucketList = await listBuckets(10);
    const allResults: BucketLead[] = [];

    for (const bucket of bucketList) {
      if (allResults.length >= limit) break;
      const results = await searchBucket(
        bucket.key,
        filters,
        limit - allResults.length,
      );
      allResults.push(...results);
    }

    return NextResponse.json({
      leads: allResults.map(formatLead),
      total: allResults.length,
      limit,
      offset,
      source: "buckets",
      bucketsSearched: bucketList.length,
      filters: { decisionMakersOnly, title },
    });
  } catch (error) {
    console.error("B2B search error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 },
    );
  }
}

// Search PostgreSQL businesses table (USBizData)
async function searchPostgreSQL(filters: {
  state?: string;
  city?: string;
  company?: string;
  sicCode?: string;
  title?: string;
  decisionMakersOnly?: boolean;
  limit: number;
  offset: number;
}) {
  const conditions = [];

  // State filter
  if (filters.state) {
    conditions.push(eq(businesses.state, filters.state.toUpperCase()));
  }

  // City filter
  if (filters.city) {
    conditions.push(ilike(businesses.city, `%${filters.city}%`));
  }

  // Company filter
  if (filters.company) {
    conditions.push(ilike(businesses.companyName, `%${filters.company}%`));
  }

  // SIC code filter
  if (filters.sicCode) {
    conditions.push(ilike(businesses.sicCode, `${filters.sicCode}%`));
  }

  // Title filter (owner name title)
  if (filters.title) {
    conditions.push(ilike(businesses.ownerTitle, `%${filters.title}%`));
  }

  // Decision maker filter
  if (filters.decisionMakersOnly) {
    conditions.push(
      or(
        ilike(businesses.ownerTitle, "%owner%"),
        ilike(businesses.ownerTitle, "%ceo%"),
        ilike(businesses.ownerTitle, "%president%"),
        ilike(businesses.ownerTitle, "%director%"),
        ilike(businesses.ownerTitle, "%partner%"),
        ilike(businesses.ownerTitle, "%manager%"),
        ilike(businesses.ownerTitle, "%vp%"),
        ilike(businesses.ownerTitle, "%founder%"),
      ),
    );
  }

  // Build query
  let query = db
    .select({
      id: businesses.id,
      companyName: businesses.companyName,
      ownerName: businesses.ownerName,
      ownerTitle: businesses.ownerTitle,
      address: businesses.address,
      city: businesses.city,
      state: businesses.state,
      zip: businesses.zip,
      phone: businesses.phone,
      email: businesses.email,
      website: businesses.website,
      sicCode: businesses.sicCode,
      sicDescription: businesses.sicDescription,
      employeeCount: businesses.employeeCount,
      revenueRange: businesses.revenueRange,
      primarySectorId: businesses.primarySectorId,
      createdAt: businesses.createdAt,
    })
    .from(businesses)
    .orderBy(desc(businesses.createdAt))
    .limit(filters.limit)
    .offset(filters.offset);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const results = await query;

  // Get total count
  let countQuery = db.select({ count: count() }).from(businesses);
  if (conditions.length > 0) {
    countQuery = countQuery.where(and(...conditions)) as typeof countQuery;
  }
  const totalResult = await countQuery;
  const total = Number(totalResult[0]?.count || 0);

  // Transform to expected format with priority scoring
  const leads = results.map((biz) => {
    // Parse owner name into first/last
    const nameParts = (biz.ownerName || "").split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Check if decision maker based on title
    const title = (biz.ownerTitle || "").toLowerCase();
    const isDecisionMaker = DECISION_MAKER_TITLES.some((dm) =>
      title.includes(dm),
    );

    // PRIORITY SCORING - Sector keywords get boosted
    let priorityScore = 0;
    const companyLower = (biz.companyName || "").toLowerCase();
    const sicLower = (biz.sicDescription || "").toLowerCase();
    const sectorLower = (biz.primarySectorId || "").toLowerCase();
    const searchText = `${companyLower} ${sicLower} ${sectorLower}`;

    // SECTOR CONFIG - keywords, SIC codes, colors, auto-tags
    const SECTOR_CONFIG: Record<string, {
      keywords: string[];
      sicPrefix: string;
      color: string;
      label: string;
      autoTags: string[];
    }> = {
      consulting: {
        keywords: ["consult", "advisor", "advisory", "strategy", "management consult"],
        sicPrefix: "8742",
        color: "#8B5CF6", // Purple
        label: "CONSULTING",
        autoTags: ["b2b", "consulting", "high-value"],
      },
      plumbing: {
        keywords: ["plumb", "pipe", "drain", "sewer", "water heater"],
        sicPrefix: "1711",
        color: "#3B82F6", // Blue
        label: "PLUMBING",
        autoTags: ["b2b", "plumbing", "trade"],
      },
      hvac: {
        keywords: ["hvac", "heating", "cooling", "furnace", "air condition", "ventilation"],
        sicPrefix: "1711",
        color: "#06B6D4", // Cyan
        label: "HVAC",
        autoTags: ["b2b", "hvac", "trade"],
      },
      real_estate: {
        keywords: ["real estate", "realtor", "broker", "realty", "property", "reit", "property manager", "leasing"],
        sicPrefix: "6531",
        color: "#10B981", // Green
        label: "REAL ESTATE",
        autoTags: ["b2b", "real-estate", "high-value"],
      },
      electrical: {
        keywords: ["electri", "wiring", "power"],
        sicPrefix: "1731",
        color: "#F59E0B", // Amber
        label: "ELECTRICAL",
        autoTags: ["b2b", "electrical", "trade"],
      },
      roofing: {
        keywords: ["roof", "shingle", "gutter"],
        sicPrefix: "1761",
        color: "#EF4444", // Red
        label: "ROOFING",
        autoTags: ["b2b", "roofing", "trade"],
      },
      solar: {
        keywords: ["solar", "renewable", "photovoltaic", "pv"],
        sicPrefix: "4911",
        color: "#FBBF24", // Yellow
        label: "SOLAR",
        autoTags: ["b2b", "solar", "green-energy"],
      },
      landscaping: {
        keywords: ["landscap", "lawn", "garden", "irrigation"],
        sicPrefix: "0781",
        color: "#22C55E", // Lime
        label: "LANDSCAPING",
        autoTags: ["b2b", "landscaping", "trade"],
      },
      pest_control: {
        keywords: ["pest", "exterminator", "termite", "rodent"],
        sicPrefix: "4959",
        color: "#A855F7", // Fuchsia
        label: "PEST CONTROL",
        autoTags: ["b2b", "pest-control", "trade"],
      },
      automotive: {
        keywords: ["auto", "mechanic", "body shop", "car repair"],
        sicPrefix: "7538",
        color: "#6366F1", // Indigo
        label: "AUTOMOTIVE",
        autoTags: ["b2b", "automotive", "trade"],
      },
    };

    // Check each sector and boost if keywords match
    let matchedSector = "";
    let sectorColor = "#6B7280"; // Default gray
    let sectorLabel = "GENERAL";
    let autoTags: string[] = ["b2b"];

    for (const [sector, config] of Object.entries(SECTOR_CONFIG)) {
      const hasKeyword = config.keywords.some(kw => searchText.includes(kw));
      const hasSic = biz.sicCode?.startsWith(config.sicPrefix);

      if (hasKeyword || hasSic) {
        priorityScore += 100; // Sector match = +100
        matchedSector = sector;
        sectorColor = config.color;
        sectorLabel = config.label;
        autoTags = config.autoTags;
        break;
      }
    }

    // Decision maker bonus (+50)
    if (isDecisionMaker) {
      priorityScore += 50;
    }

    // Has phone (+20)
    if (biz.phone) {
      priorityScore += 20;
    }

    // Has email (+10)
    if (biz.email) {
      priorityScore += 10;
    }

    return {
      id: biz.id,
      first_name: firstName,
      last_name: lastName,
      title: biz.ownerTitle || "",
      company: biz.companyName || "",
      email: biz.email || "",
      phone: biz.phone || "",
      address: biz.address || "",
      city: biz.city || "",
      state: biz.state || "",
      zip_code: biz.zip || "",
      sic_code: biz.sicCode || "",
      sic_description: biz.sicDescription || "",
      industry: biz.primarySectorId || "",
      revenue: biz.revenueRange || "",
      employees: biz.employeeCount?.toString() || "",
      is_decision_maker: isDecisionMaker,
      priority_score: priorityScore,
      property_id: null,
      // COLOR-CODED LABELING & AUTO-TAGS
      sector: matchedSector || "general",
      sector_label: sectorLabel,
      sector_color: sectorColor,
      auto_tags: autoTags,
      metadata: {
        source: "postgresql",
        sector: matchedSector || biz.primarySectorId,
        color: sectorColor,
        label: sectorLabel,
      },
      created_at: biz.createdAt?.toISOString() || new Date().toISOString(),
    };
  });

  // Sort by priority score DESC - consulting leads come first
  leads.sort((a, b) => b.priority_score - a.priority_score);

  console.log(
    `[B2B Search] PostgreSQL query returned ${leads.length} leads (total: ${total})`,
  );

  return {
    leads,
    total,
    limit: filters.limit,
    offset: filters.offset,
  };
}

// GET - Return available buckets and search options
export async function GET() {
  try {
    const buckets = await listBuckets(20);

    return NextResponse.json({
      success: true,
      message: "B2B Search - Query your USBizData business records",
      endpoint: "POST /api/b2b/search",
      params: {
        state: "Filter by state (e.g., 'NY')",
        city: "Filter by city name",
        company: "Filter by company name",
        sicCode: "Filter by SIC code prefix",
        email: "Filter by email domain",
        title: "Filter by job title",
        decisionMakersOnly:
          "DEFAULT: true - Only show Owner, CEO, Partner, Sales Manager. Set false to see all.",
        limit: "Max results (default: 50)",
        bucketId: "Search specific bucket",
      },
      decisionMakerTitles: DECISION_MAKER_TITLES,
      availableBuckets: buckets.slice(0, 10),
      totalBuckets: buckets.length,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// List available bucket files
async function listBuckets(
  maxBuckets: number,
): Promise<{ key: string; size: number }[]> {
  const response = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: SPACES_BUCKET,
      Prefix: "buckets/csv-",
      MaxKeys: maxBuckets,
    }),
  );

  return (response.Contents || [])
    .filter((obj) => obj.Key?.endsWith(".json") && !obj.Key?.includes("_index"))
    .map((obj) => ({
      key: obj.Key!.replace("buckets/", "").replace(".json", ""),
      size: obj.Size || 0,
    }));
}

// Search within a specific bucket
async function searchBucket(
  bucketId: string,
  filters: {
    state?: string;
    city?: string;
    company?: string;
    sicCode?: string;
    email?: string;
    title?: string;
    decisionMakersOnly?: boolean;
  },
  maxResults: number,
): Promise<BucketLead[]> {
  try {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: `buckets/${bucketId}.json`,
      }),
    );

    const content = await response.Body?.transformToString();
    if (!content) return [];

    const data = JSON.parse(content);
    // Handle 'leads', 'records', and 'properties' formats from bucket data
    let leads: BucketLead[] =
      data.leads || data.records || data.properties || [];

    // If no leads found, log available keys for debugging
    if (leads.length === 0) {
      console.log(
        `[B2B Search] Bucket ${bucketId} has keys:`,
        Object.keys(data).slice(0, 10),
      );
    }

    // Normalize records format to have standard fields
    leads = leads.map((lead) => {
      const keys = lead.matchingKeys || {};
      const original = lead._original || {};
      return {
        ...lead,
        firstName:
          lead.firstName || keys.firstName || original["First Name"] || "",
        lastName: lead.lastName || keys.lastName || original["Last Name"] || "",
        company:
          lead.company ||
          keys.companyName ||
          original["Company"] ||
          original["Company Name"] ||
          "",
        title: getLeadTitle(lead),
        email: lead.email || original["Email"] || original["email"] || "",
        phone: lead.phone || original["Phone"] || original["phone"] || "",
        address: lead.address || keys.address || original["Address"] || "",
        city: lead.city || keys.city || original["City"] || "",
        state: lead.state || keys.state || original["State"] || "",
        zipCode:
          lead.zipCode ||
          keys.zip ||
          original["Zip"] ||
          original["Zip Code"] ||
          "",
        sicCode:
          lead.sicCode ||
          keys.sicCode ||
          original["SIC Code"] ||
          original["sic_code"] ||
          "",
      };
    });

    // Apply filters
    const filtered = leads.filter((lead) => {
      // Decision maker filter (DEFAULT ON)
      if (filters.decisionMakersOnly !== false && !isDecisionMaker(lead)) {
        return false;
      }

      // Title filter
      if (filters.title) {
        const leadTitle = getLeadTitle(lead).toLowerCase();
        if (!leadTitle.includes(filters.title.toLowerCase())) {
          return false;
        }
      }

      // State filter
      if (
        filters.state &&
        lead.state?.toUpperCase() !== filters.state.toUpperCase()
      ) {
        return false;
      }

      // City filter
      if (
        filters.city &&
        !lead.city?.toLowerCase().includes(filters.city.toLowerCase())
      ) {
        return false;
      }

      // Company filter
      if (
        filters.company &&
        !lead.company?.toLowerCase().includes(filters.company.toLowerCase())
      ) {
        return false;
      }

      // SIC code filter
      if (filters.sicCode && !lead.sicCode?.startsWith(filters.sicCode)) {
        return false;
      }

      // Email filter
      if (
        filters.email &&
        !lead.email?.toLowerCase().includes(filters.email.toLowerCase())
      ) {
        return false;
      }

      return true;
    });

    return filtered.slice(0, maxResults);
  } catch (error) {
    console.warn(`Error reading bucket ${bucketId}:`, error);
    return [];
  }
}
