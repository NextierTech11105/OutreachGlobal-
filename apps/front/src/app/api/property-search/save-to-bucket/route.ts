import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/spaces";

const REALESTATE_API_KEY =
  process.env.REAL_ESTATE_API_KEY || process.env.REALESTATE_API_KEY || "";
const REALESTATE_API_URL = "https://api.realestateapi.com/v2/PropertySearch";
const MAX_SAVE_SIZE = 10000; // Max 10K properties per save

// Event signals - things that trigger campaigns
export const EVENT_SIGNALS = [
  // Distress signals
  "preForeclosure",
  "foreclosure",
  "auction",
  "taxLien",
  "judgment",
  "bankruptcy",
  "divorce",
  // Estate signals
  "estate",
  "probate",
  "inherited",
  // Property status signals
  "vacant",
  // MLS signals
  "mlsExpired",
  "mlsCancelled",
  "mlsWithdrawn",
] as const;

export type EventSignal = (typeof EVENT_SIGNALS)[number];

// Property CRITERIA - static characteristics for filtering/scoring (not signals)
// Examples: equity%, absentee, outOfState, yearsOwned, propertyType, lotSize, yearBuilt
// Development criteria: lotDimensions, zoning, buildableSqFt, unusedFAR, allowedUnits

export interface SavedSearchResult {
  id: string;
  name: string;
  searchParams: Record<string, unknown>;
  totalCount: number;
  savedCount: number;
  bucketPath: string;
  cdnUrl: string;
  createdAt: string;
  // Event signal tracking
  monitoredSignals: EventSignal[];
  lastChecked?: string;
  signalsDetected?: Record<EventSignal, number>;
  // Auto-trigger settings
  autoTriggerSMS: boolean;
  autoTriggerEmail: boolean;
  smsTemplateOverride?: string;
  // Stats
  triggered?: number;
  queued?: number;
  sent?: number;
  responded?: number;
}

// POST - Execute search and save up to 10K results to DO Spaces bucket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      filters,
      saveSize = 1000,
      // Event signal configuration
      monitoredSignals = [
        "preForeclosure",
        "foreclosure",
        "taxLien",
        "inherited",
      ],
      autoTriggerSMS = true,
      autoTriggerEmail = false,
      smsTemplateOverride,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Search name is required" },
        { status: 400 },
      );
    }

    if (
      !filters ||
      (!filters.state && !filters.county && !filters.zip && !filters.city)
    ) {
      return NextResponse.json(
        {
          error:
            "At least one location filter is required (state, county, city, or zip)",
        },
        { status: 400 },
      );
    }

    // Limit save size
    const requestedSize = Math.min(saveSize, MAX_SAVE_SIZE);

    console.log(
      `[Save Search] Starting "${name}" - requesting ${requestedSize} properties`,
    );

    // First, get total count
    const countResponse = await fetch(REALESTATE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify({
        ...filters,
        count: true,
        size: 0,
      }),
    });

    const countData = await countResponse.json();
    const totalCount = countData.resultCount || countData.count || 0;

    console.log(`[Save Search] Total available: ${totalCount}`);

    // Now fetch the actual data (up to requestedSize)
    const allProperties: Record<string, unknown>[] = [];
    const batchSize = 500; // RealEstateAPI pagination limit
    let offset = 0;

    while (allProperties.length < requestedSize && offset < totalCount) {
      const fetchSize = Math.min(
        batchSize,
        requestedSize - allProperties.length,
      );

      const dataResponse = await fetch(REALESTATE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": REALESTATE_API_KEY,
        },
        body: JSON.stringify({
          ...filters,
          size: fetchSize,
          from: offset,
        }),
      });

      const dataResult = await dataResponse.json();
      const properties = dataResult.data || dataResult.properties || [];

      if (properties.length === 0) break;

      allProperties.push(...properties);
      offset += properties.length;

      console.log(
        `[Save Search] Fetched ${allProperties.length}/${requestedSize}`,
      );

      // Small delay to avoid rate limits
      if (allProperties.length < requestedSize) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    console.log(`[Save Search] Total fetched: ${allProperties.length}`);

    // Create the saved search record
    const timestamp = Date.now();
    const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    // Save to datalake structure for campaign tracking
    const bucketPath = `datalake/realestate/searches/active/${safeName}-${timestamp}.json`;

    // Count initial signals in the data
    const signalCounts: Record<string, number> = {};
    for (const signal of monitoredSignals) {
      signalCounts[signal] = allProperties.filter(
        (p: Record<string, unknown>) => {
          if (signal === "highEquity") return (p.equityPercent as number) >= 70;
          if (signal === "longOwnership") return (p.yearsOwned as number) >= 10;
          return p[signal] === true;
        },
      ).length;
    }

    const searchRecord: SavedSearchResult = {
      id: timestamp.toString(),
      name,
      searchParams: filters,
      totalCount,
      savedCount: allProperties.length,
      bucketPath,
      cdnUrl: "",
      createdAt: new Date().toISOString(),
      // Event signal tracking
      monitoredSignals: monitoredSignals as EventSignal[],
      signalsDetected: signalCounts as Record<EventSignal, number>,
      // Auto-trigger settings
      autoTriggerSMS,
      autoTriggerEmail,
      smsTemplateOverride,
      // Initial stats
      triggered: 0,
      queued: 0,
      sent: 0,
      responded: 0,
    };

    // Prepare data for bucket - raw signals for your scoring system
    const bucketData = {
      metadata: searchRecord,
      properties: allProperties.map((p: Record<string, unknown>) => ({
        // Core identifiers
        id: p.id || p.propertyId,
        address: p.address,
        propertyType: p.propertyType,
        // Owner info
        owner1FirstName: p.owner1FirstName,
        owner1LastName: p.owner1LastName,
        ownerType: p.ownerType, // individual, corporate, trust, etc.
        absenteeOwner: p.absenteeOwner,
        outOfState: p.outOfState,
        yearsOwned: p.yearsOwned,
        // Property details
        yearBuilt: p.yearBuilt,
        squareFeet: p.squareFeet,
        buildingSqFt: p.buildingSqFt,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        // Lot & Development criteria
        lotSize: p.lotSize,
        lotSqFt: p.lotSqFt,
        lotAcres: p.lotAcres,
        lotWidth: p.lotWidth,
        lotDepth: p.lotDepth,
        lotDimensions: p.lotDimensions,
        zoning: p.zoning,
        zoningCode: p.zoningCode,
        zoningDescription: p.zoningDescription,
        allowedFAR: p.allowedFAR,
        currentFAR: p.currentFAR,
        unusedFAR: p.unusedFAR,
        buildableSqFt: p.buildableSqFt,
        allowedUnits: p.allowedUnits,
        currentUnits: p.currentUnits,
        // Financial
        estimatedValue: p.estimatedValue,
        estimatedEquity: p.estimatedEquity,
        equityPercent: p.equityPercent,
        loanAmount: p.loanAmount,
        loanType: p.loanType,
        // Distress signals (raw - your system scores these)
        preForeclosure: p.preForeclosure,
        foreclosure: p.foreclosure,
        taxLien: p.taxLien,
        vacant: p.vacant,
        inherited: p.inherited,
        divorce: p.divorce,
        probate: p.probate,
        bankruptcy: p.bankruptcy,
        // Loan signals
        adjustableRate: p.adjustableRate,
        balloonPayment: p.balloonPayment,
        loanMaturityDate: p.loanMaturityDate,
        freeClear: p.freeClear,
        // Listing signals
        listed: p.listed,
        listingPrice: p.listingPrice,
        daysOnMarket: p.daysOnMarket,
        priceReduction: p.priceReduction,
        listingExpired: p.listingExpired,
        // Campaign tracking (updated by your system)
        campaignStatus: "pending",
        // Full raw data for enrichment
        _raw: p,
      })),
    };

    // Upload to DO Spaces
    const uploadResult = await uploadFile(
      bucketPath,
      JSON.stringify(bucketData, null, 2),
      "application/json",
      false, // Private - use signed URLs
    );

    if (!uploadResult) {
      // If Spaces not configured, return data anyway
      console.warn(
        "[Save Search] DO Spaces not configured, returning inline data",
      );
      return NextResponse.json({
        success: true,
        search: {
          ...searchRecord,
          bucketPath: "local-only",
          cdnUrl: "",
        },
        totalCount,
        savedCount: allProperties.length,
        data: allProperties, // Return inline since no bucket
        warning:
          "DO Spaces not configured. Data returned inline instead of saved to bucket.",
      });
    }

    searchRecord.cdnUrl = uploadResult.cdnUrl;

    console.log(`[Save Search] Saved to bucket: ${bucketPath}`);

    // Also create a CSV version for easy download
    const csvBucketPath = `searches/${safeName}-${timestamp}.csv`;
    const csvHeaders = [
      "id",
      "address",
      "city",
      "state",
      "zip",
      "propertyType",
      "beds",
      "baths",
      "sqft",
      "yearBuilt",
      "estimatedValue",
      "estimatedEquity",
      "equityPercent",
      "ownerFirstName",
      "ownerLastName",
      "absenteeOwner",
      "vacant",
      "preForeclosure",
      "taxLien",
      "inherited",
    ];

    const csvRows = allProperties.map((p: Record<string, unknown>) => {
      const addr = p.address as Record<string, string> | undefined;
      return [
        p.id || p.propertyId || "",
        addr?.address || addr?.street || "",
        addr?.city || p.city || "",
        addr?.state || p.state || "",
        addr?.zip || p.zip || "",
        p.propertyType || "",
        p.bedrooms || "",
        p.bathrooms || "",
        p.squareFeet || p.sqft || "",
        p.yearBuilt || "",
        p.estimatedValue || "",
        p.estimatedEquity || "",
        p.equityPercent || "",
        p.owner1FirstName || "",
        p.owner1LastName || "",
        p.absenteeOwner ? "true" : "false",
        p.vacant ? "true" : "false",
        p.preForeclosure ? "true" : "false",
        p.taxLien ? "true" : "false",
        p.inherited ? "true" : "false",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });

    const csvContent = [csvHeaders.join(","), ...csvRows].join("\n");

    await uploadFile(csvBucketPath, csvContent, "text/csv", true);

    return NextResponse.json({
      success: true,
      search: searchRecord,
      totalCount,
      savedCount: allProperties.length,
      bucketPath,
      csvPath: csvBucketPath,
      cdnUrl: uploadResult.cdnUrl,
      csvCdnUrl: uploadResult.cdnUrl.replace(".json", ".csv"),
      message: `Saved ${allProperties.length} of ${totalCount} properties to bucket`,
    });
  } catch (error: unknown) {
    console.error("[Save Search] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - List saved searches (reads from local tracking, not bucket)
export async function GET() {
  // This would read from a database in production
  // For now, return empty list - the client tracks in localStorage
  return NextResponse.json({
    searches: [],
    message:
      "Saved searches are tracked client-side. Use POST to create new searches.",
  });
}
