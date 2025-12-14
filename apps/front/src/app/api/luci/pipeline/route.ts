/**
 * LUCI Agent Pipeline
 *
 * End-to-end data intelligence agent that:
 * 1. Scans the entire business data lake (USBizData)
 * 2. Auto-tags and labels for acquisition, tech integration, expansion
 * 3. Skip traces the OWNER (person, not company)
 * 4. Cross-references property records to find owner's real estate
 * 5. Generates daily campaigns for each channel (SMS, Email, Call)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businesses, properties, leads, contacts } from "@/lib/db/schema";
import { eq, and, gte, lte, desc, asc, isNull, or, sql, ne } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

// RealEstateAPI for Skip Trace & Property Lookup
const REALESTATE_API_KEY = process.env.REAL_ESTATE_API_KEY || process.env.REALESTATE_API_KEY || "";
const SKIP_TRACE_URL = "https://api.realestateapi.com/v1/SkipTrace";
const PROPERTY_SEARCH_URL = "https://api.realestateapi.com/v2/PropertySearch";

// ============================================================
// AUTO-TAGGING LOGIC
// ============================================================

const BLUE_COLLAR_SIC_PREFIXES = [
  "15", "16", "17", // Construction
  "07", // Agricultural services
  "34", "35", "36", "37", "38", "39", // Manufacturing
  "42", // Trucking/freight
  "49", // Utilities
  "75", "76", // Repair services
];

const TECH_INTEGRATION_SIC_PREFIXES = [
  "50", "51", // Wholesale
  "60", "61", "63", "64", // Finance/Insurance
  "73", // Business services
  "80", // Healthcare
  "82", // Education
  "87", // Engineering/consulting
];

interface BusinessWithTags {
  id: string;
  companyName: string;
  ownerFirstName: string | null;
  ownerLastName: string | null;
  ownerName: string | null;
  ownerPhone: string | null;
  ownerEmail: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  sicCode: string | null;
  sicDescription: string | null;
  employeeCount: number | null;
  annualRevenue: number | null;
  yearEstablished: number | null;
  yearsInBusiness: number | null;
  autoTags: string[];
  priority: "high" | "medium" | "low";
}

interface SkipTracedOwner {
  businessId: string;
  companyName: string;
  // Owner info
  ownerFirstName: string;
  ownerLastName: string;
  ownerFullName: string;
  // Skip traced contact
  phones: { number: string; type: "mobile" | "landline" | "unknown" }[];
  emails: string[];
  mailingAddress: string | null;
  // Properties owned by this person
  propertiesOwned: {
    address: string;
    city: string;
    state: string;
    estimatedValue: number | null;
    estimatedEquity: number | null;
    propertyType: string;
  }[];
  // Tags
  autoTags: string[];
  priority: "high" | "medium" | "low";
}

interface DailyCampaign {
  channel: "sms" | "email" | "call";
  name: string;
  targets: SkipTracedOwner[];
  targetCount: number;
  tagFilter: string[];
  generatedAt: string;
}

function generateAutoTags(biz: {
  sicCode: string | null;
  employeeCount: number | null;
  annualRevenue: number | null;
  yearsInBusiness: number | null;
  yearEstablished: number | null;
  ownerName: string | null;
}): { tags: string[]; priority: "high" | "medium" | "low" } {
  const tags: string[] = [];
  let priorityScore = 0;
  const sicPrefix = biz.sicCode?.substring(0, 2) || "";

  // Blue Collar Business
  if (BLUE_COLLAR_SIC_PREFIXES.includes(sicPrefix)) {
    tags.push("blue-collar");
    priorityScore += 1;

    // Acquisition sweet spot: 5-50 employees, $500K-$10M revenue
    if (biz.employeeCount && biz.employeeCount >= 5 && biz.employeeCount <= 50) {
      tags.push("acquisition-target");
      priorityScore += 2;
    }
    if (biz.annualRevenue && biz.annualRevenue >= 500000 && biz.annualRevenue <= 10000000) {
      tags.push("sweet-spot-revenue");
      priorityScore += 2;
    }
  }

  // Tech Integration Candidate
  if (TECH_INTEGRATION_SIC_PREFIXES.includes(sicPrefix)) {
    tags.push("tech-integration");
    priorityScore += 1;

    if (biz.employeeCount && biz.employeeCount >= 20) {
      tags.push("scale-ready");
      priorityScore += 1;
    }
  }

  // Exit prep timing (5-15 years = prime exit window)
  if (biz.yearsInBusiness && biz.yearsInBusiness >= 5 && biz.yearsInBusiness <= 15) {
    tags.push("exit-prep-timing");
    priorityScore += 1;
  }

  // Mature ownership (20+ years = owner likely ready to exit)
  if (biz.yearEstablished) {
    const age = new Date().getFullYear() - biz.yearEstablished;
    if (age >= 20) {
      tags.push("mature-ownership");
      tags.push("potential-exit");
      priorityScore += 2;
    }
    if (age >= 30) {
      tags.push("succession-planning");
      priorityScore += 1;
    }
  }

  // Expansion candidate
  if (biz.employeeCount && biz.employeeCount >= 10 && biz.employeeCount <= 100) {
    if (biz.annualRevenue && biz.annualRevenue >= 1000000) {
      tags.push("expansion-candidate");
      priorityScore += 1;
    }
  }

  // Owner identified = can skip trace
  if (biz.ownerName) {
    tags.push("owner-identified");
    priorityScore += 1;
  }

  // Established business
  if (biz.yearsInBusiness && biz.yearsInBusiness >= 10) {
    tags.push("established");
  }

  // Revenue tiers
  if (biz.annualRevenue) {
    if (biz.annualRevenue < 500000) tags.push("revenue-under-500k");
    else if (biz.annualRevenue < 1000000) tags.push("revenue-500k-1m");
    else if (biz.annualRevenue < 5000000) tags.push("revenue-1m-5m");
    else if (biz.annualRevenue < 10000000) tags.push("revenue-5m-10m");
    else tags.push("revenue-10m-plus");
  }

  // Employee tiers
  if (biz.employeeCount) {
    if (biz.employeeCount <= 10) tags.push("micro-business");
    else if (biz.employeeCount <= 50) tags.push("small-business");
    else if (biz.employeeCount <= 200) tags.push("mid-market");
    else tags.push("enterprise");
  }

  // Priority based on score
  let priority: "high" | "medium" | "low" = "low";
  if (priorityScore >= 5) priority = "high";
  else if (priorityScore >= 3) priority = "medium";

  return { tags, priority };
}

// ============================================================
// SKIP TRACE OWNER (Person, not company)
// ============================================================

async function skipTraceOwner(
  firstName: string,
  lastName: string,
  address: string,
  city: string,
  state: string,
  zip: string
): Promise<{
  phones: { number: string; type: "mobile" | "landline" | "unknown" }[];
  emails: string[];
  mailingAddress: string | null;
}> {
  if (!REALESTATE_API_KEY) {
    console.warn("[LUCI] No RealEstateAPI key - skip trace disabled");
    return { phones: [], emails: [], mailingAddress: null };
  }

  try {
    const response = await fetch(SKIP_TRACE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        address,
        city,
        state,
        zip,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const result = data.data || data;

      // Extract phones with type labeling
      const phones: { number: string; type: "mobile" | "landline" | "unknown" }[] = [];
      const rawPhones = result.phones || result.phone_numbers || [];

      for (const phone of rawPhones) {
        const phoneObj = typeof phone === "string" ? { number: phone } : phone;
        const lineType = (phoneObj.line_type || phoneObj.type || "").toLowerCase();

        let phoneType: "mobile" | "landline" | "unknown" = "unknown";
        if (lineType.includes("mobile") || lineType.includes("cell") || lineType.includes("wireless")) {
          phoneType = "mobile";
        } else if (lineType.includes("land") || lineType.includes("voip") || lineType.includes("fixed")) {
          phoneType = "landline";
        }

        phones.push({
          number: phoneObj.number || phoneObj.phone || phone,
          type: phoneType,
        });
      }

      // Extract emails
      const emails = (result.emails || result.email_addresses || []).map(
        (e: any) => typeof e === "string" ? e : e.email || e.address
      );

      // Extract mailing address
      const mailingAddress = result.mailing_address || result.current_address || null;

      return { phones, emails, mailingAddress };
    }
  } catch (error) {
    console.error("[LUCI] Skip trace failed:", error);
  }

  return { phones: [], emails: [], mailingAddress: null };
}

// ============================================================
// FIND PROPERTIES OWNED BY PERSON
// ============================================================

async function findPropertiesOwnedBy(
  firstName: string,
  lastName: string,
  state?: string
): Promise<{
  address: string;
  city: string;
  state: string;
  estimatedValue: number | null;
  estimatedEquity: number | null;
  propertyType: string;
}[]> {
  if (!REALESTATE_API_KEY) {
    return [];
  }

  try {
    // Search for properties owned by this person
    const response = await fetch(PROPERTY_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify({
        owner_first_name: firstName,
        owner_last_name: lastName,
        state: state, // Narrow search to state if known
        limit: 10,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const properties = data.data || data.properties || [];

      return properties.map((p: any) => ({
        address: p.address || p.property_address || "",
        city: p.city || "",
        state: p.state || "",
        estimatedValue: p.estimated_value || p.estimatedValue || null,
        estimatedEquity: p.estimated_equity || p.estimatedEquity || null,
        propertyType: p.property_type || p.propertyType || "Unknown",
      }));
    }
  } catch (error) {
    console.error("[LUCI] Property search failed:", error);
  }

  return [];
}

// ============================================================
// MAIN PIPELINE ENDPOINT
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const body = await request.json();
    const {
      action,
      // Scan options
      scanMode = "sequential", // "sequential" | "shuffle" | "priority"
      limit = 100,
      offset = 0,
      tagFilter, // Only process businesses with these tags
      skipTraceEnabled = true,
      crossReferenceProperties = true,
      // Campaign generation
      channels = ["sms", "email", "call"],
      campaignsPerChannel = 50,
    } = body;

    // ============================================================
    // ACTION: SCAN - Scan data lake and auto-tag
    // ============================================================
    if (action === "scan") {
      // Build query
      let query = db
        .select({
          id: businesses.id,
          companyName: businesses.companyName,
          ownerFirstName: businesses.ownerFirstName,
          ownerLastName: businesses.ownerLastName,
          ownerName: businesses.ownerName,
          ownerPhone: businesses.ownerPhone,
          ownerEmail: businesses.ownerEmail,
          address: businesses.address,
          city: businesses.city,
          state: businesses.state,
          zip: businesses.zip,
          sicCode: businesses.sicCode,
          sicDescription: businesses.sicDescription,
          employeeCount: businesses.employeeCount,
          annualRevenue: businesses.annualRevenue,
          yearEstablished: businesses.yearEstablished,
          yearsInBusiness: businesses.yearsInBusiness,
        })
        .from(businesses)
        .where(eq(businesses.userId, userId));

      // Order based on scan mode
      if (scanMode === "shuffle") {
        query = query.orderBy(sql`RANDOM()`);
      } else if (scanMode === "priority") {
        // Order by revenue desc (higher value first)
        query = query.orderBy(desc(businesses.annualRevenue));
      } else {
        query = query.orderBy(asc(businesses.createdAt));
      }

      const results = await query.limit(limit).offset(offset);

      // Auto-tag all results
      const taggedBusinesses: BusinessWithTags[] = results.map((biz) => {
        const { tags, priority } = generateAutoTags({
          sicCode: biz.sicCode,
          employeeCount: biz.employeeCount,
          annualRevenue: biz.annualRevenue,
          yearsInBusiness: biz.yearsInBusiness,
          yearEstablished: biz.yearEstablished,
          ownerName: biz.ownerName,
        });

        return {
          ...biz,
          autoTags: tags,
          priority,
        };
      });

      // Filter by tags if specified
      let filtered = taggedBusinesses;
      if (tagFilter && Array.isArray(tagFilter) && tagFilter.length > 0) {
        filtered = taggedBusinesses.filter((biz) =>
          tagFilter.some((tag: string) => biz.autoTags.includes(tag))
        );
      }

      // Calculate tag distribution
      const tagCounts: Record<string, number> = {};
      const priorityCounts = { high: 0, medium: 0, low: 0 };
      filtered.forEach((biz) => {
        priorityCounts[biz.priority]++;
        biz.autoTags.forEach((tag) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });

      return NextResponse.json({
        success: true,
        action: "scan",
        scanMode,
        totalScanned: results.length,
        afterFilter: filtered.length,
        priorityCounts,
        tagCounts,
        businesses: filtered,
      });
    }

    // ============================================================
    // ACTION: ENRICH - Skip trace owners + find their properties
    // ============================================================
    if (action === "enrich") {
      const { businessIds } = body;

      if (!businessIds || !Array.isArray(businessIds) || businessIds.length === 0) {
        return NextResponse.json({ error: "businessIds array required" }, { status: 400 });
      }

      if (businessIds.length > 50) {
        return NextResponse.json({ error: "Max 50 businesses per request" }, { status: 400 });
      }

      // Fetch businesses
      const bizResults = await db
        .select({
          id: businesses.id,
          companyName: businesses.companyName,
          ownerFirstName: businesses.ownerFirstName,
          ownerLastName: businesses.ownerLastName,
          ownerName: businesses.ownerName,
          address: businesses.address,
          city: businesses.city,
          state: businesses.state,
          zip: businesses.zip,
          sicCode: businesses.sicCode,
          employeeCount: businesses.employeeCount,
          annualRevenue: businesses.annualRevenue,
          yearEstablished: businesses.yearEstablished,
          yearsInBusiness: businesses.yearsInBusiness,
        })
        .from(businesses)
        .where(
          and(
            eq(businesses.userId, userId),
            sql`${businesses.id} IN (${sql.join(businessIds.map(id => sql`${id}`), sql`, `)})`
          )
        );

      const enrichedOwners: SkipTracedOwner[] = [];
      const stats = {
        processed: 0,
        skipTraced: 0,
        phonesFound: 0,
        mobilePhones: 0,
        emailsFound: 0,
        propertiesFound: 0,
        errors: [] as string[],
      };

      for (const biz of bizResults) {
        try {
          stats.processed++;

          // Parse owner name
          const firstName = biz.ownerFirstName || biz.ownerName?.split(" ")[0] || "";
          const lastName = biz.ownerLastName || biz.ownerName?.split(" ").slice(1).join(" ") || "";

          if (!firstName) {
            stats.errors.push(`${biz.id}: No owner name`);
            continue;
          }

          // Generate tags
          const { tags, priority } = generateAutoTags({
            sicCode: biz.sicCode,
            employeeCount: biz.employeeCount,
            annualRevenue: biz.annualRevenue,
            yearsInBusiness: biz.yearsInBusiness,
            yearEstablished: biz.yearEstablished,
            ownerName: biz.ownerName,
          });

          // SKIP TRACE THE OWNER (person, not company!)
          let skipResult = { phones: [] as any[], emails: [] as string[], mailingAddress: null as string | null };
          if (skipTraceEnabled && biz.address) {
            skipResult = await skipTraceOwner(
              firstName,
              lastName,
              biz.address,
              biz.city || "",
              biz.state || "",
              biz.zip || ""
            );
            stats.skipTraced++;
            stats.phonesFound += skipResult.phones.length;
            stats.mobilePhones += skipResult.phones.filter((p: any) => p.type === "mobile").length;
            stats.emailsFound += skipResult.emails.length;
          }

          // CROSS-REFERENCE: Find properties owned by this person
          let ownedProperties: any[] = [];
          if (crossReferenceProperties) {
            ownedProperties = await findPropertiesOwnedBy(firstName, lastName, biz.state || undefined);
            stats.propertiesFound += ownedProperties.length;

            // Add special tag if owner has real estate
            if (ownedProperties.length > 0) {
              tags.push("property-owner");
              if (ownedProperties.length >= 3) {
                tags.push("multi-property-owner");
              }
              // Check for high equity properties
              const highEquityProps = ownedProperties.filter(
                (p) => p.estimatedEquity && p.estimatedEquity > 100000
              );
              if (highEquityProps.length > 0) {
                tags.push("high-equity-property-owner");
              }
            }
          }

          enrichedOwners.push({
            businessId: biz.id,
            companyName: biz.companyName,
            ownerFirstName: firstName,
            ownerLastName: lastName,
            ownerFullName: `${firstName} ${lastName}`.trim(),
            phones: skipResult.phones,
            emails: skipResult.emails,
            mailingAddress: skipResult.mailingAddress,
            propertiesOwned: ownedProperties,
            autoTags: tags,
            priority,
          });

          // Rate limiting
          await new Promise((r) => setTimeout(r, 250));
        } catch (error: any) {
          stats.errors.push(`${biz.id}: ${error.message}`);
        }
      }

      return NextResponse.json({
        success: true,
        action: "enrich",
        stats,
        owners: enrichedOwners,
      });
    }

    // ============================================================
    // ACTION: GENERATE-CAMPAIGNS - Create daily campaigns per channel
    // ============================================================
    if (action === "generate-campaigns") {
      const { targetTags = ["acquisition-target", "potential-exit", "property-owner"] } = body;

      // First scan and enrich to get targets
      // For demo, we'll just scan and tag
      const scanResults = await db
        .select({
          id: businesses.id,
          companyName: businesses.companyName,
          ownerFirstName: businesses.ownerFirstName,
          ownerLastName: businesses.ownerLastName,
          ownerName: businesses.ownerName,
          ownerPhone: businesses.ownerPhone,
          ownerEmail: businesses.ownerEmail,
          address: businesses.address,
          city: businesses.city,
          state: businesses.state,
          zip: businesses.zip,
          sicCode: businesses.sicCode,
          employeeCount: businesses.employeeCount,
          annualRevenue: businesses.annualRevenue,
          yearEstablished: businesses.yearEstablished,
          yearsInBusiness: businesses.yearsInBusiness,
        })
        .from(businesses)
        .where(eq(businesses.userId, userId))
        .orderBy(sql`RANDOM()`)
        .limit(campaignsPerChannel * channels.length * 2); // Get more than needed

      // Tag and filter
      const tagged = scanResults
        .map((biz) => {
          const { tags, priority } = generateAutoTags({
            sicCode: biz.sicCode,
            employeeCount: biz.employeeCount,
            annualRevenue: biz.annualRevenue,
            yearsInBusiness: biz.yearsInBusiness,
            yearEstablished: biz.yearEstablished,
            ownerName: biz.ownerName,
          });
          return { ...biz, autoTags: tags, priority };
        })
        .filter((biz) => targetTags.some((tag: string) => biz.autoTags.includes(tag)));

      // Generate campaigns per channel
      const campaigns: DailyCampaign[] = [];

      for (const channel of channels as ("sms" | "email" | "call")[]) {
        // Filter targets based on channel requirements
        let channelTargets = tagged;

        if (channel === "sms") {
          // Need phone number for SMS
          channelTargets = tagged.filter((t) => t.ownerPhone);
        } else if (channel === "email") {
          // Need email for email campaigns
          channelTargets = tagged.filter((t) => t.ownerEmail);
        }
        // Call can use any phone

        // Take up to campaignsPerChannel
        const targets = channelTargets.slice(0, campaignsPerChannel);

        campaigns.push({
          channel,
          name: `LUCI Daily ${channel.toUpperCase()} - ${new Date().toISOString().split("T")[0]}`,
          targets: targets.map((t) => ({
            businessId: t.id,
            companyName: t.companyName,
            ownerFirstName: t.ownerFirstName || t.ownerName?.split(" ")[0] || "",
            ownerLastName: t.ownerLastName || t.ownerName?.split(" ").slice(1).join(" ") || "",
            ownerFullName: t.ownerName || `${t.ownerFirstName} ${t.ownerLastName}`.trim(),
            phones: t.ownerPhone ? [{ number: t.ownerPhone, type: "unknown" as const }] : [],
            emails: t.ownerEmail ? [t.ownerEmail] : [],
            mailingAddress: t.address,
            propertiesOwned: [], // Would be populated by enrich action
            autoTags: t.autoTags,
            priority: t.priority,
          })),
          targetCount: targets.length,
          tagFilter: targetTags,
          generatedAt: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        success: true,
        action: "generate-campaigns",
        date: new Date().toISOString().split("T")[0],
        totalBusinessesScanned: scanResults.length,
        matchingTargets: tagged.length,
        campaigns,
        summary: campaigns.map((c) => ({
          channel: c.channel,
          name: c.name,
          targetCount: c.targetCount,
        })),
      });
    }

    return NextResponse.json({ error: "Invalid action. Use: scan, enrich, generate-campaigns" }, { status: 400 });
  } catch (error: any) {
    console.error("[LUCI Pipeline] Error:", error);
    return NextResponse.json(
      { error: error.message || "Pipeline failed", details: error.stack },
      { status: 500 }
    );
  }
}

// ============================================================
// GET - Check LUCI status and capabilities
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Get counts
    const [businessCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(businesses)
      .where(eq(businesses.userId, userId));

    return NextResponse.json({
      agent: "LUCI",
      status: "active",
      capabilities: [
        "scan - Scan data lake, auto-tag businesses",
        "enrich - Skip trace OWNER (person), find their properties",
        "generate-campaigns - Create daily campaigns per channel",
      ],
      dataLake: {
        businesses: businessCount?.count || 0,
      },
      autoTags: {
        acquisition: ["blue-collar", "acquisition-target", "sweet-spot-revenue"],
        techIntegration: ["tech-integration", "scale-ready"],
        exit: ["exit-prep-timing", "mature-ownership", "potential-exit", "succession-planning"],
        expansion: ["expansion-candidate"],
        property: ["property-owner", "multi-property-owner", "high-equity-property-owner"],
      },
      channels: ["sms", "email", "call"],
      skipTraceEnabled: !!REALESTATE_API_KEY,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
