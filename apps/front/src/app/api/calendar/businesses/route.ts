/**
 * Calendar Businesses API
 * GET businesses for calendar view with full USBizData fields
 * Includes auto-tagging for acquisition targets, tech integration, expansion opportunities
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { eq, and, gte, lte, desc, or, isNotNull } from "drizzle-orm";
import { apiAuth } from "@/lib/api-auth";

// Business type for calendar with full USBizData fields
interface CalendarBusiness {
  id: string;
  // Company Info
  companyName: string;
  dba?: string;
  legalName?: string;
  entityType?: string;
  // Address
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
  // Contact
  phone?: string;
  phoneAlt?: string;
  email?: string;
  website?: string;
  // Classification
  sicCode?: string;
  sicDescription?: string;
  naicsCode?: string;
  naicsDescription?: string;
  // Size & Revenue
  employeeCount?: number;
  employeeRange?: string;
  annualRevenue?: number;
  revenueRange?: string;
  salesVolume?: string;
  // Business Details
  yearEstablished?: number;
  yearsInBusiness?: number;
  isHeadquarters?: boolean;
  parentCompany?: string;
  franchiseFlag?: boolean;
  // Owner Info
  ownerName?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  ownerTitle?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  // Executive Info
  executiveName?: string;
  executiveTitle?: string;
  executivePhone?: string;
  executiveEmail?: string;
  // Status
  status: string;
  score?: number;
  enrichmentStatus?: string;
  // Sector
  primarySectorId?: string;
  sectorCategory?: string;
  // Auto-tags
  autoTags: string[];
  // Timestamps
  createdAt: string;
  lastContactedAt?: string;
}

// Blue collar SIC codes that are good acquisition targets
const BLUE_COLLAR_SIC_CODES = [
  "17", // Construction
  "15", // Building construction
  "16", // Heavy construction
  "49", // Electric, gas, sanitary services
  "42", // Motor freight transportation
  "75", // Auto repair, services
  "76", // Miscellaneous repair services
  "07", // Agricultural services
  "35", // Industrial machinery
  "36", // Electronic equipment
  "34", // Fabricated metal products
  "37", // Transportation equipment
  "38", // Measuring/analyzing instruments
  "39", // Misc manufacturing
];

// SIC codes good for tech integration / exit prep
const TECH_INTEGRATION_SIC_CODES = [
  "73", // Business services
  "87", // Engineering/management services
  "80", // Health services
  "82", // Educational services
  "63", // Insurance carriers
  "64", // Insurance agents
  "60", // Depository institutions
  "61", // Non-depository credit
  "50", // Wholesale trade - durable
  "51", // Wholesale trade - nondurable
];

// Generate auto-tags based on business data
function generateAutoTags(business: {
  sicCode?: string | null;
  employeeCount?: number | null;
  annualRevenue?: number | null;
  yearsInBusiness?: number | null;
  ownerName?: string | null;
  yearEstablished?: number | null;
}): string[] {
  const tags: string[] = [];
  const sicPrefix = business.sicCode?.substring(0, 2) || "";

  // Blue Collar Acquisition Target
  if (BLUE_COLLAR_SIC_CODES.includes(sicPrefix)) {
    tags.push("blue-collar");

    // Good acquisition indicators
    if (
      business.employeeCount &&
      business.employeeCount >= 5 &&
      business.employeeCount <= 50
    ) {
      tags.push("acquisition-target");
    }
    if (
      business.annualRevenue &&
      business.annualRevenue >= 500000 &&
      business.annualRevenue <= 10000000
    ) {
      tags.push("sweet-spot-revenue");
    }
    if (business.yearsInBusiness && business.yearsInBusiness >= 10) {
      tags.push("established-business");
    }
    if (business.ownerName) {
      tags.push("owner-identified");
    }
  }

  // Tech Integration / Exit Prep Target
  if (TECH_INTEGRATION_SIC_CODES.includes(sicPrefix)) {
    tags.push("tech-integration-candidate");

    if (business.employeeCount && business.employeeCount >= 20) {
      tags.push("scale-ready");
    }
    if (
      business.yearsInBusiness &&
      business.yearsInBusiness >= 5 &&
      business.yearsInBusiness <= 15
    ) {
      tags.push("exit-prep-timing");
    }
  }

  // Expansion Opportunity Tags
  if (
    business.employeeCount &&
    business.employeeCount >= 10 &&
    business.employeeCount <= 100
  ) {
    if (business.annualRevenue && business.annualRevenue >= 1000000) {
      tags.push("expansion-candidate");
    }
  }

  // Owner age estimation (if established long ago, owner may be ready to exit)
  if (business.yearEstablished) {
    const yearsOld = new Date().getFullYear() - business.yearEstablished;
    if (yearsOld >= 20) {
      tags.push("mature-ownership");
      tags.push("potential-exit");
    }
    if (yearsOld >= 30) {
      tags.push("succession-planning");
    }
  }

  // Revenue tier tags
  if (business.annualRevenue) {
    if (business.annualRevenue < 500000) tags.push("revenue-under-500k");
    else if (business.annualRevenue < 1000000) tags.push("revenue-500k-1m");
    else if (business.annualRevenue < 5000000) tags.push("revenue-1m-5m");
    else if (business.annualRevenue < 10000000) tags.push("revenue-5m-10m");
    else tags.push("revenue-10m-plus");
  }

  // Employee tier tags
  if (business.employeeCount) {
    if (business.employeeCount <= 10) tags.push("micro-business");
    else if (business.employeeCount <= 50) tags.push("small-business");
    else if (business.employeeCount <= 200) tags.push("mid-market");
    else tags.push("enterprise");
  }

  return tags;
}

// GET - Fetch businesses for calendar view
export async function GET(request: NextRequest) {
  try {
    const { userId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 },
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status");
    const sicCode = searchParams.get("sicCode");
    const tag = searchParams.get("tag"); // Filter by auto-tag

    // Build query conditions
    const conditions = [eq(businesses.userId, userId)];

    if (startDate && !isNaN(Date.parse(startDate))) {
      conditions.push(gte(businesses.createdAt, new Date(startDate)));
    }

    if (endDate && !isNaN(Date.parse(endDate))) {
      conditions.push(lte(businesses.createdAt, new Date(endDate)));
    }

    if (status && status !== "all") {
      conditions.push(eq(businesses.status, status));
    }

    if (sicCode) {
      conditions.push(eq(businesses.sicCode, sicCode));
    }

    // Fetch businesses with all USBizData fields
    const results = await db
      .select({
        id: businesses.id,
        // Company Info
        companyName: businesses.companyName,
        dba: businesses.dba,
        legalName: businesses.legalName,
        entityType: businesses.entityType,
        // Address
        address: businesses.address,
        city: businesses.city,
        state: businesses.state,
        zip: businesses.zip,
        county: businesses.county,
        // Contact
        phone: businesses.phone,
        phoneAlt: businesses.phoneAlt,
        email: businesses.email,
        website: businesses.website,
        // Classification
        sicCode: businesses.sicCode,
        sicDescription: businesses.sicDescription,
        naicsCode: businesses.naicsCode,
        naicsDescription: businesses.naicsDescription,
        // Size & Revenue
        employeeCount: businesses.employeeCount,
        employeeRange: businesses.employeeRange,
        annualRevenue: businesses.annualRevenue,
        revenueRange: businesses.revenueRange,
        salesVolume: businesses.salesVolume,
        // Business Details
        yearEstablished: businesses.yearEstablished,
        yearsInBusiness: businesses.yearsInBusiness,
        isHeadquarters: businesses.isHeadquarters,
        parentCompany: businesses.parentCompany,
        franchiseFlag: businesses.franchiseFlag,
        // Owner Info
        ownerName: businesses.ownerName,
        ownerFirstName: businesses.ownerFirstName,
        ownerLastName: businesses.ownerLastName,
        ownerTitle: businesses.ownerTitle,
        ownerPhone: businesses.ownerPhone,
        ownerEmail: businesses.ownerEmail,
        // Executive Info
        executiveName: businesses.executiveName,
        executiveTitle: businesses.executiveTitle,
        executivePhone: businesses.executivePhone,
        executiveEmail: businesses.executiveEmail,
        // Status & Enrichment
        status: businesses.status,
        score: businesses.score,
        enrichmentStatus: businesses.enrichmentStatus,
        // Sector
        primarySectorId: businesses.primarySectorId,
        sectorCategory: businesses.sectorCategory,
        // Timestamps
        createdAt: businesses.createdAt,
        lastContactedAt: businesses.lastContactedAt,
      })
      .from(businesses)
      .where(and(...conditions))
      .orderBy(desc(businesses.createdAt))
      .limit(1000);

    // Transform with auto-tags
    let calendarBusinesses: CalendarBusiness[] = results.map((biz) => ({
      id: biz.id,
      companyName: biz.companyName,
      dba: biz.dba || undefined,
      legalName: biz.legalName || undefined,
      entityType: biz.entityType || undefined,
      address: biz.address || undefined,
      city: biz.city || undefined,
      state: biz.state || undefined,
      zip: biz.zip || undefined,
      county: biz.county || undefined,
      phone: biz.phone || undefined,
      phoneAlt: biz.phoneAlt || undefined,
      email: biz.email || undefined,
      website: biz.website || undefined,
      sicCode: biz.sicCode || undefined,
      sicDescription: biz.sicDescription || undefined,
      naicsCode: biz.naicsCode || undefined,
      naicsDescription: biz.naicsDescription || undefined,
      employeeCount: biz.employeeCount || undefined,
      employeeRange: biz.employeeRange || undefined,
      annualRevenue: biz.annualRevenue || undefined,
      revenueRange: biz.revenueRange || undefined,
      salesVolume: biz.salesVolume || undefined,
      yearEstablished: biz.yearEstablished || undefined,
      yearsInBusiness: biz.yearsInBusiness || undefined,
      isHeadquarters: biz.isHeadquarters || undefined,
      parentCompany: biz.parentCompany || undefined,
      franchiseFlag: biz.franchiseFlag || undefined,
      ownerName: biz.ownerName || undefined,
      ownerFirstName: biz.ownerFirstName || undefined,
      ownerLastName: biz.ownerLastName || undefined,
      ownerTitle: biz.ownerTitle || undefined,
      ownerPhone: biz.ownerPhone || undefined,
      ownerEmail: biz.ownerEmail || undefined,
      executiveName: biz.executiveName || undefined,
      executiveTitle: biz.executiveTitle || undefined,
      executivePhone: biz.executivePhone || undefined,
      executiveEmail: biz.executiveEmail || undefined,
      status: biz.status || "new",
      score: biz.score || undefined,
      enrichmentStatus: biz.enrichmentStatus || undefined,
      primarySectorId: biz.primarySectorId || undefined,
      sectorCategory: biz.sectorCategory || undefined,
      autoTags: generateAutoTags({
        sicCode: biz.sicCode,
        employeeCount: biz.employeeCount,
        annualRevenue: biz.annualRevenue,
        yearsInBusiness: biz.yearsInBusiness,
        ownerName: biz.ownerName,
        yearEstablished: biz.yearEstablished,
      }),
      createdAt: biz.createdAt
        ? new Date(biz.createdAt).toISOString()
        : new Date().toISOString(),
      lastContactedAt: biz.lastContactedAt
        ? new Date(biz.lastContactedAt).toISOString()
        : undefined,
    }));

    // Filter by auto-tag if specified
    if (tag) {
      calendarBusinesses = calendarBusinesses.filter((biz) =>
        biz.autoTags.includes(tag),
      );
    }

    // Get tag counts for filtering UI
    const tagCounts: Record<string, number> = {};
    calendarBusinesses.forEach((biz) => {
      biz.autoTags.forEach((t) => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    });

    return NextResponse.json({
      success: true,
      businesses: calendarBusinesses,
      count: calendarBusinesses.length,
      tagCounts,
      dateRange: { startDate, endDate },
    });
  } catch (error) {
    console.error("[Calendar Businesses] GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch businesses",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// POST - Update business status or push to campaigns
export async function POST(request: NextRequest) {
  try {
    const { userId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 },
      );
    }

    const body = await request.json();
    const { action, businessIds, newStatus } = body;

    if (action === "bulk_update_status") {
      if (!businessIds || !Array.isArray(businessIds) || !newStatus) {
        return NextResponse.json(
          { success: false, error: "businessIds array and newStatus required" },
          { status: 400 },
        );
      }

      if (businessIds.length > 500) {
        return NextResponse.json(
          { success: false, error: "Maximum 500 businesses per request" },
          { status: 400 },
        );
      }

      const updatePromises = businessIds.map((id: string) =>
        db
          .update(businesses)
          .set({
            status: newStatus,
            updatedAt: new Date(),
          })
          .where(and(eq(businesses.id, id), eq(businesses.userId, userId))),
      );

      await Promise.all(updatePromises);

      return NextResponse.json({
        success: true,
        updated: businessIds.length,
        newStatus,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 },
    );
  } catch (error) {
    console.error("[Calendar Businesses] POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
