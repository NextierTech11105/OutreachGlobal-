import { NextRequest, NextResponse } from "next/server";
import { batches } from "@/lib/batches-store";

/**
 * CRON Monitor - Tracks changes by RealEstateAPI ID
 *
 * Each lead with a realEstateApiId gets checked for:
 * - MLS_LISTED: Property went on market
 * - MLS_EXPIRED: Listing expired
 * - MLS_PRICE_DROP: Price reduced
 * - DEED_CHANGE: Property sold
 * - AUCTION_SCHEDULED: Auction date set
 * - OCCUPANCY_CHANGE: Owner moved out
 * - TAX_LIEN_ADDED: New tax lien
 *
 * Run via cron: GET /api/monitor
 */

const REALESTATE_API_KEY = process.env.REALESTATE_API_KEY || process.env.REAL_ESTATE_API_KEY || "";

interface Change {
  leadId: string;
  realEstateApiId: string;
  address: string;
  changeType: string;
  previousValue: any;
  newValue: any;
  priority: "critical" | "high" | "medium" | "low";
  detectedAt: string;
}

export async function GET(request: NextRequest) {
  if (!REALESTATE_API_KEY) {
    return NextResponse.json({ error: "RealEstateAPI not configured" }, { status: 500 });
  }

  const changes: Change[] = [];
  let checked = 0;

  // Check all batches
  for (const [batchName, batch] of batches) {
    const leads = batch.leads || [];

    for (const lead of leads) {
      // Only check leads with RealEstateAPI IDs
      if (!lead.realEstateApiId || !lead.baseline) continue;

      checked++;

      try {
        // Fetch current property data
        const current = await fetchPropertyById(lead.realEstateApiId);
        if (!current) continue;

        const baseline = lead.baseline;
        const now = new Date().toISOString();

        // Check for MLS LISTED
        if (!baseline.mlsActive && current.mlsActive) {
          changes.push({
            leadId: lead.id,
            realEstateApiId: lead.realEstateApiId,
            address: lead.propertyAddress,
            changeType: "MLS_LISTED",
            previousValue: false,
            newValue: { mlsActive: true, listingPrice: current.mlsListingPrice },
            priority: "critical",
            detectedAt: now,
          });
        }

        // Check for MLS EXPIRED
        if (baseline.mlsActive && !current.mlsActive && !current.mlsSold) {
          changes.push({
            leadId: lead.id,
            realEstateApiId: lead.realEstateApiId,
            address: lead.propertyAddress,
            changeType: "MLS_EXPIRED",
            previousValue: { mlsActive: true },
            newValue: { mlsActive: false },
            priority: "high",
            detectedAt: now,
          });
        }

        // Check for PRICE DROP
        if (baseline.mlsActive && current.mlsActive &&
            baseline.mlsListingPrice && current.mlsListingPrice &&
            current.mlsListingPrice < baseline.mlsListingPrice) {
          changes.push({
            leadId: lead.id,
            realEstateApiId: lead.realEstateApiId,
            address: lead.propertyAddress,
            changeType: "MLS_PRICE_DROP",
            previousValue: baseline.mlsListingPrice,
            newValue: current.mlsListingPrice,
            priority: "high",
            detectedAt: now,
          });
        }

        // Check for DEED CHANGE (sold)
        if (baseline.lastSaleDate !== current.lastSaleDate && current.lastSaleDate) {
          changes.push({
            leadId: lead.id,
            realEstateApiId: lead.realEstateApiId,
            address: lead.propertyAddress,
            changeType: "DEED_CHANGE",
            previousValue: baseline.lastSaleDate,
            newValue: current.lastSaleDate,
            priority: "medium",
            detectedAt: now,
          });
        }

        // Check for AUCTION SCHEDULED
        if (!baseline.auctionDate && current.auctionDate) {
          changes.push({
            leadId: lead.id,
            realEstateApiId: lead.realEstateApiId,
            address: lead.propertyAddress,
            changeType: "AUCTION_SCHEDULED",
            previousValue: null,
            newValue: current.auctionDate,
            priority: "critical",
            detectedAt: now,
          });
        }

        // Check for OCCUPANCY CHANGE
        if (baseline.ownerOccupied && !current.ownerOccupied) {
          changes.push({
            leadId: lead.id,
            realEstateApiId: lead.realEstateApiId,
            address: lead.propertyAddress,
            changeType: "OCCUPANCY_CHANGE",
            previousValue: { ownerOccupied: true },
            newValue: { ownerOccupied: false, vacant: current.vacant },
            priority: "high",
            detectedAt: now,
          });
        }

        // Check for TAX LIEN
        if (!baseline.taxLien && current.taxLien) {
          changes.push({
            leadId: lead.id,
            realEstateApiId: lead.realEstateApiId,
            address: lead.propertyAddress,
            changeType: "TAX_LIEN_ADDED",
            previousValue: false,
            newValue: true,
            priority: "high",
            detectedAt: now,
          });
        }

        // Update baseline for next run
        lead.baseline = {
          mlsActive: current.mlsActive || false,
          mlsListingPrice: current.mlsListingPrice || null,
          lastSaleDate: current.lastSaleDate || null,
          preForeclosure: current.preForeclosure || false,
          foreclosure: current.foreclosure || false,
          auctionDate: current.auctionDate || null,
          taxLien: current.taxLien || false,
          vacant: current.vacant || false,
          ownerOccupied: current.ownerOccupied || false,
          checkedAt: now,
        };

        // Rate limit
        await new Promise(r => setTimeout(r, 100));

      } catch (err) {
        console.error(`Monitor error for ${lead.realEstateApiId}:`, err);
      }
    }
  }

  // Summary
  const summary = {
    checked,
    changes: changes.length,
    critical: changes.filter(c => c.priority === "critical").length,
    high: changes.filter(c => c.priority === "high").length,
    byType: {
      MLS_LISTED: changes.filter(c => c.changeType === "MLS_LISTED").length,
      MLS_EXPIRED: changes.filter(c => c.changeType === "MLS_EXPIRED").length,
      MLS_PRICE_DROP: changes.filter(c => c.changeType === "MLS_PRICE_DROP").length,
      DEED_CHANGE: changes.filter(c => c.changeType === "DEED_CHANGE").length,
      AUCTION_SCHEDULED: changes.filter(c => c.changeType === "AUCTION_SCHEDULED").length,
      OCCUPANCY_CHANGE: changes.filter(c => c.changeType === "OCCUPANCY_CHANGE").length,
      TAX_LIEN_ADDED: changes.filter(c => c.changeType === "TAX_LIEN_ADDED").length,
    },
  };

  return NextResponse.json({
    success: true,
    runAt: new Date().toISOString(),
    summary,
    changes,
  });
}

async function fetchPropertyById(id: string): Promise<any> {
  const response = await fetch("https://api.realestateapi.com/v2/PropertyDetail", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": REALESTATE_API_KEY,
    },
    body: JSON.stringify({ id }),
  });

  if (response.ok) {
    const data = await response.json();
    return data.data || data;
  }
  return null;
}
