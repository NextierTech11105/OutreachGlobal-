import { NextRequest, NextResponse } from "next/server";

/**
 * FDAILY Import - FULL RealEstateAPI Enrichment
 *
 * Captures the COMPLETE PropertyDetail response including:
 * - Root flags (absenteeOwner, preForeclosure, highEquity, etc.)
 * - ownerInfo (names, mailing address, ownership length)
 * - propertyInfo (beds, baths, sqft, amenities, construction)
 * - taxInfo (assessed values, tax amount)
 * - foreclosureInfo (if applicable)
 * - auctionInfo (if auction scheduled)
 * - currentMortgages
 * - lotInfo (APN, land use, legal description)
 * - demographics (fair market rent, median income)
 * - lastSale
 * - saleHistory
 * - mlsHistory
 * - mortgageHistory
 * - comps
 * - schools
 * - linkedProperties
 */

const REALESTATE_API_KEY = process.env.REALESTATE_API_KEY || process.env.REAL_ESTATE_API_KEY || "";
const REALESTATE_API_URL = "https://api.realestateapi.com/v2";

// In-memory storage for demo (replace with DO Spaces in production)
const batches: Map<string, any> = new Map();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const enrich = formData.get("enrich") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    const text = await file.text();
    const records = parseCSV(text);

    if (!records.length) {
      return NextResponse.json({ error: "No records" }, { status: 400 });
    }

    const batchName = `fdaily-${Date.now()}`;
    const leads: any[] = [];

    for (let i = 0; i < records.length; i++) {
      const raw = records[i];

      // Build address
      const address = raw.property_address || raw.address || "";
      const city = raw.city || "";
      const state = raw.state || "FL";
      const zip = raw.zip || "";
      const fullAddress = [address, city, state, zip].filter(Boolean).join(", ");

      // Core lead structure
      const lead: any = {
        // === TRACKING IDS ===
        id: `fdaily-${raw.case_number || i}-${Date.now()}`,
        fdailyId: `fdaily-${raw.case_number || i}-${Date.now()}`,
        realEstateApiId: null,
        caseNumber: raw.case_number || raw.case_id || "",
        folio: raw.folio || raw.parcel_id || "",

        // === FROM FDAILY CSV ===
        fdailyData: {
          propertyAddress: fullAddress,
          address,
          city,
          state,
          zip,
          ownerName: raw.owner_name || raw.defendant || "",
          plaintiff: raw.plaintiff || "",
          filedDate: raw.filed_date || raw.filing_date || "",
          caseType: raw.case_type || "Lis Pendens",
          loanBalance: parseNumber(raw.loan_balance),
          attorney: raw.attorney || "",
          mailingAddress: raw.mailing_address || "",
        },

        // === REALESTATE API FULL PAYLOAD ===
        realEstateApiData: null, // FULL response stored here

        // === EXTRACTED SUMMARY FIELDS (for UI/filtering) ===
        propertyAddress: fullAddress,
        address,
        city,
        state,
        zip,
        ownerName: raw.owner_name || raw.defendant || "",

        // Property
        estimatedValue: null,
        estimatedEquity: null,
        equityPercent: null,
        bedrooms: null,
        bathrooms: null,
        sqft: null,
        yearBuilt: null,
        propertyType: null,
        lotSquareFeet: null,
        stories: null,

        // Flags
        absenteeOwner: false,
        outOfStateAbsenteeOwner: false,
        inStateAbsenteeOwner: false,
        ownerOccupied: true,
        vacant: false,
        preForeclosure: false,
        foreclosure: false,
        auction: false,
        highEquity: false,
        freeClear: false,
        taxLien: false,
        corporateOwned: false,
        inherited: false,
        cashBuyer: false,

        // MLS
        mlsActive: false,
        mlsPending: false,
        mlsCancelled: false,
        mlsSold: false,
        mlsListingPrice: null,
        daysOnMarket: null,

        // Auction
        auctionDate: null,
        auctionInfo: null,

        // Foreclosure
        foreclosureInfo: null,

        // Owner
        ownerInfo: null,
        owner1FirstName: null,
        owner1LastName: null,
        ownershipLength: null,
        mailingAddress: null,

        // Tax
        taxInfo: null,
        assessedValue: null,
        taxAmount: null,

        // Last Sale
        lastSaleDate: null,
        lastSalePrice: null,
        lastSale: null,

        // Mortgages
        currentMortgages: null,
        openMortgageBalance: null,
        estimatedMortgageBalance: null,

        // Lot
        lotInfo: null,
        apn: null,
        landUse: null,
        zoning: null,

        // Linked Properties
        linkedProperties: null,

        // Status/Campaign
        priority: getPriority(raw.filed_date || raw.filing_date),
        tags: ["lis_pendens", "fdaily"],
        phones: [],
        emails: [],
        skipTraced: false,
        enriched: false,
        campaignReady: false,

        // Monitoring
        baseline: null,
        importedAt: new Date().toISOString(),
      };

      // === ENRICH WITH FULL REALESTATE API DATA ===
      if (enrich && REALESTATE_API_KEY && fullAddress) {
        try {
          const apiData = await fetchPropertyDetail(fullAddress);

          if (apiData && apiData.id) {
            // Store FULL payload
            lead.realEstateApiData = apiData;
            lead.realEstateApiId = apiData.id;
            lead.enriched = true;

            // === EXTRACT ROOT LEVEL FLAGS ===
            lead.absenteeOwner = apiData.absenteeOwner || false;
            lead.outOfStateAbsenteeOwner = apiData.outOfStateAbsenteeOwner || false;
            lead.inStateAbsenteeOwner = apiData.inStateAbsenteeOwner || false;
            lead.ownerOccupied = apiData.ownerOccupied ?? true;
            lead.vacant = apiData.vacant || false;
            lead.preForeclosure = apiData.preForeclosure || false;
            lead.foreclosure = apiData.foreclosure || false;
            lead.auction = apiData.auction || false;
            lead.highEquity = apiData.highEquity || false;
            lead.freeClear = apiData.freeClear || false;
            lead.corporateOwned = apiData.corporateOwned || false;
            lead.inherited = apiData.inherited || false;
            lead.cashBuyer = apiData.cashBuyer || false;
            lead.taxLien = apiData.lien || apiData.taxLien || false;

            // Values
            lead.estimatedValue = apiData.estimatedValue || null;
            lead.estimatedEquity = apiData.estimatedEquity || null;
            lead.equityPercent = apiData.equityPercent || null;
            lead.openMortgageBalance = apiData.openMortgageBalance || null;
            lead.estimatedMortgageBalance = apiData.estimatedMortgageBalance || null;

            // Last Sale
            lead.lastSaleDate = apiData.lastSaleDate || null;
            lead.lastSalePrice = apiData.lastSalePrice || null;

            // MLS Flags
            lead.mlsActive = apiData.mlsActive || false;
            lead.mlsPending = apiData.mlsPending || false;
            lead.mlsCancelled = apiData.mlsCancelled || false;
            lead.mlsSold = apiData.mlsSold || false;

            // === EXTRACT NESTED OBJECTS ===

            // Property Info
            if (apiData.propertyInfo) {
              const pi = apiData.propertyInfo;
              lead.bedrooms = pi.bedrooms || null;
              lead.bathrooms = pi.bathrooms || null;
              lead.sqft = pi.livingSquareFeet || pi.buildingSquareFeet || null;
              lead.yearBuilt = pi.yearBuilt || null;
              lead.stories = pi.stories || null;
              lead.lotSquareFeet = pi.lotSquareFeet || null;
              lead.propertyType = apiData.propertyType || pi.propertyUse || null;
            }

            // Owner Info
            if (apiData.ownerInfo) {
              lead.ownerInfo = apiData.ownerInfo;
              lead.owner1FirstName = apiData.ownerInfo.owner1FirstName || null;
              lead.owner1LastName = apiData.ownerInfo.owner1LastName || null;
              lead.ownershipLength = apiData.ownerInfo.ownershipLength || null;
              if (apiData.ownerInfo.mailAddress) {
                lead.mailingAddress = apiData.ownerInfo.mailAddress.label ||
                  `${apiData.ownerInfo.mailAddress.address}, ${apiData.ownerInfo.mailAddress.city}, ${apiData.ownerInfo.mailAddress.state} ${apiData.ownerInfo.mailAddress.zip}`;
              }
              // Update owner name from API if we have it
              if (apiData.ownerInfo.owner1FullName) {
                lead.ownerName = apiData.ownerInfo.owner1FullName;
              }
            }

            // Tax Info
            if (apiData.taxInfo) {
              lead.taxInfo = apiData.taxInfo;
              lead.assessedValue = apiData.taxInfo.assessedValue || null;
              lead.taxAmount = apiData.taxInfo.taxAmount || null;
            }

            // Lot Info
            if (apiData.lotInfo) {
              lead.lotInfo = apiData.lotInfo;
              lead.apn = apiData.lotInfo.apn || null;
              lead.landUse = apiData.lotInfo.landUse || null;
              lead.zoning = apiData.lotInfo.zoning || null;
            }

            // Auction Info
            if (apiData.auctionInfo) {
              lead.auctionInfo = apiData.auctionInfo;
              lead.auctionDate = apiData.auctionInfo.auctionDate || null;
            }

            // Foreclosure Info
            if (apiData.foreclosureInfo) {
              lead.foreclosureInfo = apiData.foreclosureInfo;
            }

            // Last Sale object
            if (apiData.lastSale) {
              lead.lastSale = apiData.lastSale;
            }

            // Current Mortgages
            if (apiData.currentMortgages) {
              lead.currentMortgages = apiData.currentMortgages;
            }

            // MLS History (extract current listing price if active)
            if (apiData.mlsHistory && apiData.mlsHistory.length > 0) {
              const activeListing = apiData.mlsHistory.find((m: any) =>
                m.status === "active" || m.status === "pending"
              );
              if (activeListing) {
                lead.mlsListingPrice = activeListing.price || null;
                lead.daysOnMarket = activeListing.daysOnMarket || null;
              }
            }

            // Linked Properties
            if (apiData.linkedProperties) {
              lead.linkedProperties = apiData.linkedProperties;
            }

            // === SET BASELINE FOR MONITORING ===
            lead.baseline = {
              mlsActive: lead.mlsActive,
              mlsListingPrice: lead.mlsListingPrice,
              lastSaleDate: lead.lastSaleDate,
              preForeclosure: lead.preForeclosure,
              foreclosure: lead.foreclosure,
              auction: lead.auction,
              auctionDate: lead.auctionDate,
              taxLien: lead.taxLien,
              vacant: lead.vacant,
              ownerOccupied: lead.ownerOccupied,
              checkedAt: new Date().toISOString(),
            };

            // === AUTO-TAG BASED ON ENRICHMENT ===
            if (lead.highEquity) lead.tags.push("high_equity");
            if (lead.absenteeOwner) lead.tags.push("absentee_owner");
            if (lead.outOfStateAbsenteeOwner) lead.tags.push("out_of_state");
            if (lead.vacant) lead.tags.push("vacant");
            if (lead.preForeclosure) lead.tags.push("pre_foreclosure_confirmed");
            if (lead.auction) lead.tags.push("auction_scheduled");
            if (lead.freeClear) lead.tags.push("free_clear");
            if (lead.corporateOwned) lead.tags.push("corporate_owned");
            if (lead.inherited) lead.tags.push("inherited");
            if (lead.mlsActive) lead.tags.push("mls_active");
            if (lead.estimatedValue && lead.estimatedValue > 500000) lead.tags.push("high_value");
          }
        } catch (err) {
          console.error(`Enrich failed for ${fullAddress}:`, err);
        }

        // Rate limit
        if (i < records.length - 1) {
          await new Promise(r => setTimeout(r, 100));
        }
      }

      leads.push(lead);
    }

    // Store batch
    batches.set(batchName, {
      batchName,
      importedAt: new Date().toISOString(),
      totalRecords: leads.length,
      enriched: enrich,
      leads,
    });

    // Stats
    const stats = {
      total: leads.length,
      enriched: leads.filter(l => l.enriched).length,
      withRealEstateId: leads.filter(l => l.realEstateApiId).length,
      hot: leads.filter(l => l.priority === "hot").length,
      warm: leads.filter(l => l.priority === "warm").length,
      cold: leads.filter(l => l.priority === "cold").length,
      highEquity: leads.filter(l => l.highEquity).length,
      absenteeOwner: leads.filter(l => l.absenteeOwner).length,
      preForeclosure: leads.filter(l => l.preForeclosure).length,
      auction: leads.filter(l => l.auction).length,
      vacant: leads.filter(l => l.vacant).length,
    };

    return NextResponse.json({
      success: true,
      batchName,
      stats,
      message: `Imported ${stats.total} leads with FULL RealEstateAPI data. ${stats.withRealEstateId} enriched.`,
      sampleFields: leads[0] ? Object.keys(leads[0]).filter(k => k !== "realEstateApiData") : [],
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function fetchPropertyDetail(address: string): Promise<any> {
  const response = await fetch(`${REALESTATE_API_URL}/PropertyDetail`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": REALESTATE_API_KEY,
    },
    body: JSON.stringify({ address }),
  });

  if (response.ok) {
    const data = await response.json();
    return data.data || data;
  }
  return null;
}

function parseNumber(val: any): number | null {
  if (!val) return null;
  const num = parseFloat(String(val).replace(/[$,]/g, ""));
  return isNaN(num) ? null : num;
}

function getPriority(filedDate: string): "hot" | "warm" | "cold" {
  if (!filedDate) return "warm";
  const days = Math.floor((Date.now() - new Date(filedDate).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 7) return "hot";
  if (days > 30) return "cold";
  return "warm";
}

function parseCSV(text: string): any[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h =>
    h.trim().toLowerCase().replace(/[^a-z0-9]/g, "_")
  );

  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const record: any = {};
    headers.forEach((h, i) => {
      record[h] = values[i]?.trim() || "";
    });
    return record;
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') inQuotes = !inQuotes;
    else if (char === "," && !inQuotes) { result.push(current); current = ""; }
    else current += char;
  }
  result.push(current);
  return result;
}

// Export batches for other routes
export { batches };
