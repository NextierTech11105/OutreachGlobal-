import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

/**
 * FDAILY Property Monitor - Daily Cron Job
 *
 * Monitors imported FDAILY leads for material changes:
 * - MLS_LISTED: Property went on market
 * - MLS_EXPIRED: Listing expired/cancelled
 * - DEED_CHANGE: Property sold/transferred
 * - ADDITIONAL_NOTICE: More foreclosure filings
 * - OCCUPANCY_CHANGE: Owner moved out, property vacant
 * - AUCTION_SCHEDULED: Auction date set
 * - PRICE_DROP: Listing price reduced
 *
 * Run daily via cron: GET /api/fdaily/monitor
 *
 * Triggers:
 * - Hot lead alerts for fresh opportunities
 * - SMS/Email campaigns via Gianna/SignalHouse
 * - Webhook notifications
 */

const SPACES_ENDPOINT = "https://nyc3.digitaloceanspaces.com";
const SPACES_BUCKET = "nextier";
const SPACES_KEY = process.env.DO_SPACES_KEY || "";
const SPACES_SECRET = process.env.DO_SPACES_SECRET || "";

const REALESTATE_API_KEY =
  process.env.REAL_ESTATE_API_KEY || process.env.REALESTATE_API_KEY || "";
const REALESTATE_API_V1 = "https://api.realestateapi.com/v1";
const REALESTATE_API_V2 = "https://api.realestateapi.com/v2";

// Change types we monitor for
type ChangeType =
  | "MLS_LISTED"
  | "MLS_EXPIRED"
  | "MLS_PRICE_DROP"
  | "MLS_PRICE_INCREASE"
  | "DEED_CHANGE"
  | "ADDITIONAL_NOTICE"
  | "OCCUPANCY_CHANGE"
  | "AUCTION_SCHEDULED"
  | "TAX_LIEN_ADDED"
  | "STATUS_UPDATE";

interface PropertyChange {
  propertyId: string;
  address: string;
  changeType: ChangeType;
  previousValue: any;
  newValue: any;
  detectedAt: string;
  priority: "critical" | "high" | "medium" | "low";
  actionRequired: string;
  leadId?: string;
  caseNumber?: string;
}

interface MonitorResult {
  runId: string;
  startedAt: string;
  completedAt: string;
  propertiesChecked: number;
  changesDetected: PropertyChange[];
  summary: {
    mlsListed: number;
    mlsExpired: number;
    deedChanges: number;
    additionalNotices: number;
    occupancyChanges: number;
    auctionScheduled: number;
    priceDrop: number;
  };
  errors: string[];
}

interface StoredLead {
  id: string;
  realEstateApiId?: string;
  propertyAddress: string;
  caseNumber: string;
  status: string;
  // Baseline values for comparison
  baseline?: {
    mlsActive: boolean;
    mlsStatus: string | null;
    mlsListingPrice: number | null;
    lastSaleDate: string | null;
    lastSaleAmount: number | null;
    preForeclosure: boolean;
    foreclosure: boolean;
    auction: boolean;
    auctionDate: string | null;
    taxLien: boolean;
    vacant: boolean;
    ownerOccupied: boolean;
    checkedAt: string;
  };
}

function getS3Client(): S3Client | null {
  if (!SPACES_KEY || !SPACES_SECRET) return null;
  return new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: "nyc3",
    credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
  });
}

async function fetchPropertyDetail(propertyId: string): Promise<any> {
  if (!REALESTATE_API_KEY) return null;

  try {
    const response = await fetch(`${REALESTATE_API_V2}/PropertyDetail`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify({ id: propertyId }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.data || data;
    }
  } catch (error) {
    console.error(`[Monitor] Failed to fetch ${propertyId}:`, error);
  }

  return null;
}

function detectChanges(lead: StoredLead, current: any): PropertyChange[] {
  const changes: PropertyChange[] = [];
  const baseline = lead.baseline;
  const now = new Date().toISOString();

  if (!baseline || !current) return changes;

  const address = lead.propertyAddress;
  const propertyId = lead.realEstateApiId || "";

  // MLS LISTED - Property went on market
  if (!baseline.mlsActive && current.mlsActive) {
    changes.push({
      propertyId,
      address,
      changeType: "MLS_LISTED",
      previousValue: false,
      newValue: {
        mlsActive: true,
        listingPrice: current.mlsListingPrice,
        status: current.mlsStatus,
      },
      detectedAt: now,
      priority: "critical",
      actionRequired:
        "HOT LEAD: Property just listed! Contact immediately - owner may be motivated.",
      leadId: lead.id,
      caseNumber: lead.caseNumber,
    });
  }

  // MLS EXPIRED - Listing cancelled/expired
  if (baseline.mlsActive && !current.mlsActive && !current.mlsSold) {
    changes.push({
      propertyId,
      address,
      changeType: "MLS_EXPIRED",
      previousValue: {
        mlsActive: true,
        listingPrice: baseline.mlsListingPrice,
      },
      newValue: {
        mlsActive: false,
        mlsCancelled: current.mlsCancelled,
      },
      detectedAt: now,
      priority: "high",
      actionRequired:
        "Listing expired - owner may be frustrated. Good time to reach out with cash offer.",
      leadId: lead.id,
      caseNumber: lead.caseNumber,
    });
  }

  // MLS PRICE DROP
  if (
    baseline.mlsActive &&
    current.mlsActive &&
    baseline.mlsListingPrice &&
    current.mlsListingPrice &&
    current.mlsListingPrice < baseline.mlsListingPrice
  ) {
    const dropPercent = (
      ((baseline.mlsListingPrice - current.mlsListingPrice) /
        baseline.mlsListingPrice) *
      100
    ).toFixed(1);
    changes.push({
      propertyId,
      address,
      changeType: "MLS_PRICE_DROP",
      previousValue: baseline.mlsListingPrice,
      newValue: current.mlsListingPrice,
      detectedAt: now,
      priority: dropPercent > "10" ? "high" : "medium",
      actionRequired: `Price dropped ${dropPercent}%! Owner getting desperate - increase outreach.`,
      leadId: lead.id,
      caseNumber: lead.caseNumber,
    });
  }

  // DEED CHANGE - Property sold/transferred
  if (baseline.lastSaleDate !== current.lastSaleDate && current.lastSaleDate) {
    changes.push({
      propertyId,
      address,
      changeType: "DEED_CHANGE",
      previousValue: {
        lastSaleDate: baseline.lastSaleDate,
        lastSaleAmount: baseline.lastSaleAmount,
      },
      newValue: {
        lastSaleDate: current.lastSaleDate,
        lastSaleAmount: current.lastSaleAmount,
        buyer: current.owner1FirstName
          ? `${current.owner1FirstName} ${current.owner1LastName}`
          : "Unknown",
      },
      detectedAt: now,
      priority: "medium",
      actionRequired:
        "Property sold - update records and remove from active campaigns.",
      leadId: lead.id,
      caseNumber: lead.caseNumber,
    });
  }

  // ADDITIONAL NOTICE - Foreclosure progressed
  if (!baseline.foreclosure && current.foreclosure) {
    changes.push({
      propertyId,
      address,
      changeType: "ADDITIONAL_NOTICE",
      previousValue: {
        preForeclosure: baseline.preForeclosure,
        foreclosure: false,
      },
      newValue: { preForeclosure: current.preForeclosure, foreclosure: true },
      detectedAt: now,
      priority: "critical",
      actionRequired:
        "Foreclosure filed! Owner under pressure - urgent outreach recommended.",
      leadId: lead.id,
      caseNumber: lead.caseNumber,
    });
  }

  // AUCTION SCHEDULED
  if (!baseline.auctionDate && current.auctionDate) {
    changes.push({
      propertyId,
      address,
      changeType: "AUCTION_SCHEDULED",
      previousValue: null,
      newValue: {
        auctionDate: current.auctionDate,
        auction: current.auction,
      },
      detectedAt: now,
      priority: "critical",
      actionRequired: `Auction scheduled for ${current.auctionDate}! Last chance to reach owner before sale.`,
      leadId: lead.id,
      caseNumber: lead.caseNumber,
    });
  }

  // OCCUPANCY CHANGE - Became vacant or owner moved out
  if (baseline.ownerOccupied && !current.ownerOccupied) {
    changes.push({
      propertyId,
      address,
      changeType: "OCCUPANCY_CHANGE",
      previousValue: { ownerOccupied: true, vacant: baseline.vacant },
      newValue: { ownerOccupied: false, vacant: current.vacant },
      detectedAt: now,
      priority: "high",
      actionRequired:
        "Owner moved out - property may be abandoned. Good time to make cash offer.",
      leadId: lead.id,
      caseNumber: lead.caseNumber,
    });
  }

  // TAX LIEN ADDED
  if (!baseline.taxLien && current.taxLien) {
    changes.push({
      propertyId,
      address,
      changeType: "TAX_LIEN_ADDED",
      previousValue: false,
      newValue: true,
      detectedAt: now,
      priority: "high",
      actionRequired:
        "Tax lien added - owner has financial distress. Motivated seller opportunity.",
      leadId: lead.id,
      caseNumber: lead.caseNumber,
    });
  }

  return changes;
}

// GET /api/fdaily/monitor - Run monitoring check (cron job)
export async function GET(request: NextRequest) {
  const runId = `monitor-${Date.now()}`;
  const startedAt = new Date().toISOString();
  const errors: string[] = [];

  console.log(`[FDAILY Monitor] Starting run ${runId}`);

  const result: MonitorResult = {
    runId,
    startedAt,
    completedAt: "",
    propertiesChecked: 0,
    changesDetected: [],
    summary: {
      mlsListed: 0,
      mlsExpired: 0,
      deedChanges: 0,
      additionalNotices: 0,
      occupancyChanges: 0,
      auctionScheduled: 0,
      priceDrop: 0,
    },
    errors: [],
  };

  try {
    const client = getS3Client();
    if (!client) {
      return NextResponse.json(
        { error: "Storage not configured" },
        { status: 500 },
      );
    }

    if (!REALESTATE_API_KEY) {
      return NextResponse.json(
        { error: "RealEstateAPI key not configured" },
        { status: 500 },
      );
    }

    // List all FDAILY import batches
    const listResponse = await client.send(
      new ListObjectsV2Command({
        Bucket: SPACES_BUCKET,
        Prefix: "fdaily/",
        MaxKeys: 100,
      }),
    );

    const batches =
      listResponse.Contents?.filter((obj) => obj.Key?.endsWith(".json")) || [];
    console.log(`[FDAILY Monitor] Found ${batches.length} import batches`);

    // Process each batch
    for (const batch of batches) {
      if (!batch.Key) continue;

      try {
        const getResponse = await client.send(
          new GetObjectCommand({
            Bucket: SPACES_BUCKET,
            Key: batch.Key,
          }),
        );

        const content = await getResponse.Body?.transformToString();
        if (!content) continue;

        const batchData = JSON.parse(content);
        const leads: StoredLead[] = batchData.leads || [];

        // Filter leads that have RealEstateAPI IDs for monitoring
        const monitorableLeads = leads.filter(
          (l) =>
            l.realEstateApiId &&
            l.status !== "converted" &&
            l.status !== "removed",
        );

        console.log(
          `[FDAILY Monitor] Checking ${monitorableLeads.length} leads from ${batch.Key}`,
        );

        // Check each lead for changes
        for (const lead of monitorableLeads) {
          result.propertiesChecked++;

          const currentData = await fetchPropertyDetail(lead.realEstateApiId!);
          if (!currentData) {
            errors.push(`Failed to fetch data for ${lead.realEstateApiId}`);
            continue;
          }

          // Detect changes
          const changes = detectChanges(lead, currentData);
          result.changesDetected.push(...changes);

          // Update summary counts
          for (const change of changes) {
            switch (change.changeType) {
              case "MLS_LISTED":
                result.summary.mlsListed++;
                break;
              case "MLS_EXPIRED":
                result.summary.mlsExpired++;
                break;
              case "MLS_PRICE_DROP":
                result.summary.priceDrop++;
                break;
              case "DEED_CHANGE":
                result.summary.deedChanges++;
                break;
              case "ADDITIONAL_NOTICE":
                result.summary.additionalNotices++;
                break;
              case "OCCUPANCY_CHANGE":
                result.summary.occupancyChanges++;
                break;
              case "AUCTION_SCHEDULED":
                result.summary.auctionScheduled++;
                break;
            }
          }

          // Update baseline for next run
          lead.baseline = {
            mlsActive: currentData.mlsActive || false,
            mlsStatus: currentData.mlsStatus || null,
            mlsListingPrice: currentData.mlsListingPrice || null,
            lastSaleDate: currentData.lastSaleDate || null,
            lastSaleAmount: currentData.lastSaleAmount || null,
            preForeclosure: currentData.preForeclosure || false,
            foreclosure: currentData.foreclosure || false,
            auction: currentData.auction || false,
            auctionDate: currentData.auctionDate || null,
            taxLien: currentData.taxLien || false,
            vacant: currentData.vacant || false,
            ownerOccupied: currentData.ownerOccupied || false,
            checkedAt: new Date().toISOString(),
          };

          // Rate limiting - brief pause between API calls
          await new Promise((r) => setTimeout(r, 100));
        }

        // Save updated batch with new baselines
        batchData.leads = leads;
        batchData.lastMonitorRun = new Date().toISOString();

        await client.send(
          new PutObjectCommand({
            Bucket: SPACES_BUCKET,
            Key: batch.Key,
            Body: JSON.stringify(batchData, null, 2),
            ContentType: "application/json",
          }),
        );
      } catch (batchError: any) {
        errors.push(`Error processing ${batch.Key}: ${batchError.message}`);
      }
    }

    result.completedAt = new Date().toISOString();
    result.errors = errors;

    // Save monitor run results
    const resultKey = `fdaily/monitor-runs/${runId}.json`;
    await client.send(
      new PutObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: resultKey,
        Body: JSON.stringify(result, null, 2),
        ContentType: "application/json",
      }),
    );

    // Log summary
    console.log(`[FDAILY Monitor] Completed run ${runId}`);
    console.log(`  Properties checked: ${result.propertiesChecked}`);
    console.log(`  Changes detected: ${result.changesDetected.length}`);
    console.log(`  Summary:`, result.summary);

    // If there are critical changes, we could trigger webhooks here
    const criticalChanges = result.changesDetected.filter(
      (c) => c.priority === "critical",
    );
    if (criticalChanges.length > 0) {
      console.log(
        `[FDAILY Monitor] ${criticalChanges.length} CRITICAL changes require immediate action!`,
      );
      // TODO: Trigger webhook/SMS/email notifications
    }

    return NextResponse.json({
      success: true,
      ...result,
      message: `Checked ${result.propertiesChecked} properties, found ${result.changesDetected.length} changes`,
    });
  } catch (error: any) {
    console.error("[FDAILY Monitor] Error:", error);
    return NextResponse.json(
      { error: error.message || "Monitor run failed" },
      { status: 500 },
    );
  }
}

// POST /api/fdaily/monitor - Manually trigger for specific leads
export async function POST(request: NextRequest) {
  try {
    const { leadIds, propertyIds } = await request.json();

    if (!leadIds?.length && !propertyIds?.length) {
      return NextResponse.json(
        { error: "leadIds or propertyIds required" },
        { status: 400 },
      );
    }

    // For manual trigger, call the GET handler logic with specific IDs
    // This would filter to only check the specified leads
    // Implementation similar to GET but filtered

    return NextResponse.json({
      message: "Manual monitor trigger - use GET for full cron run",
      leadIds,
      propertyIds,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to trigger monitor" },
      { status: 500 },
    );
  }
}
