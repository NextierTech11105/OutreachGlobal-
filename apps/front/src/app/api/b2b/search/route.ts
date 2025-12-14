/**
 * B2B Search API
 *
 * Data Sources:
 * 1. Pushbutton Business List API (34M+ companies, 235M+ contacts)
 * 2. USBizData from DO Spaces (5.5M NY businesses)
 * 3. Apollo API fallback (all US)
 */

import { NextRequest, NextResponse } from "next/server";
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
  forcePathStyle: false,
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
    if (!SPACES_KEY || !SPACES_SECRET) {
      return NextResponse.json(
        { error: "DO Spaces credentials not configured" },
        { status: 503 },
      );
    }

    const body = await request.json();
    const {
      state,
      city,
      company,
      sicCode,
      email,
      title,
      decisionMakersOnly = true, // DEFAULT: Only show decision makers (Owner, CEO, Partner, Sales Manager)
      limit = 50,
      offset = 0,
      bucketId, // Optional: search specific bucket
    } = body;

    const filters = {
      state,
      city,
      company,
      sicCode,
      email,
      title,
      decisionMakersOnly,
    };

    // If specific bucket requested, search just that one
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

    // Otherwise, search across buckets (sample from first few)
    const bucketList = await listBuckets(10); // Get first 10 buckets to sample
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
      hint: decisionMakersOnly
        ? "Showing decision makers only (Owner, CEO, Partner, Sales Manager). Set decisionMakersOnly=false to see all."
        : "Add bucketId param to search a specific bucket",
    });
  } catch (error) {
    console.error("B2B search error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 },
    );
  }
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
