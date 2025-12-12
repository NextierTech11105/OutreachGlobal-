import { NextRequest, NextResponse } from "next/server";

/**
 * FDAILY ENRICHMENT - Elite Homeowner Advisors
 *
 * ClerkData provides: address, case info, plaintiff, defendant, attorney,
 *                     beds, baths, sqft, year built, last sale
 *
 * RealEstateAPI adds: estimatedValue, estimatedEquity, mortgageBalance,
 *                     ownerInfo (mailing address), absentee/vacant flags
 */

const REALESTATE_API_KEY = process.env.REALESTATE_API_KEY ||
  process.env.REAL_ESTATE_API_KEY ||
  "ELITEHOMEOWNERADVISORSPRDATAPRODUCTION-d13b-7e8f-953a-f32241302891";

const REALESTATE_API_URL = "https://api.realestateapi.com/v2/PropertyDetail";

// Clean lead structure - only what matters
interface FDAILYLead {
  // === TRACKING IDs ===
  id: string;
  realEstateApiId: string | null;
  caseNumber: string;
  folio: string;

  // === FROM CLERKDATA (FDAILY) ===
  propertyAddress: string;
  city: string;
  state: string;
  zip: string;
  defendant: string;        // Owner name
  plaintiff: string;        // Lender/HOA
  filedDate: string;
  attorney: string;

  // ClerkData property info (may already have)
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  yearBuilt: number | null;
  lastSaleDate: string | null;
  lastSalePrice: number | null;

  // === FROM REALESTATE API (ENRICHMENT) ===
  estimatedValue: number | null;        // CURRENT value
  estimatedEquity: number | null;       // Value - mortgage
  equityPercent: number | null;         // % equity
  openMortgageBalance: number | null;   // What they owe

  // Owner mailing (for absentee detection + direct mail)
  ownerMailingAddress: string | null;
  owner1FirstName: string | null;
  owner1LastName: string | null;
  ownershipLengthYears: number | null;

  // Key flags
  absenteeOwner: boolean;
  outOfStateOwner: boolean;
  vacant: boolean;
  highEquity: boolean;
  freeClear: boolean;
  auction: boolean;
  auctionDate: string | null;

  // Tax info
  assessedValue: number | null;
  taxAmount: number | null;

  // === WORKFLOW ===
  priority: "hot" | "warm" | "cold";
  tags: string[];
  enriched: boolean;
}

// Storage
const batches: Map<string, { leads: FDAILYLead[]; createdAt: string; stats: any }> = new Map();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No CSV file" }, { status: 400 });
    }

    const text = await file.text();
    const records = parseCSV(text);

    if (!records.length) {
      return NextResponse.json({ error: "No records" }, { status: 400 });
    }

    console.log(`[FDAILY] Processing ${records.length} records`);

    const batchId = `fdaily-${Date.now()}`;
    const leads: FDAILYLead[] = [];
    let enriched = 0;

    for (let i = 0; i < records.length; i++) {
      const r = records[i];

      // Build address
      const addr = r.property_address || r.address || r.street || "";
      const city = r.city || "";
      const state = r.state || "FL";
      const zip = r.zip || r.zipcode || "";
      const fullAddress = [addr, city, state, zip].filter(Boolean).join(", ");

      const lead: FDAILYLead = {
        id: `fdaily-${r.case_number || i}-${Date.now()}`,
        realEstateApiId: null,
        caseNumber: r.case_number || r.case_id || "",
        folio: r.folio || r.parcel_id || "",

        propertyAddress: fullAddress,
        city,
        state,
        zip,
        defendant: r.defendant || r.owner_name || r.owner || "",
        plaintiff: r.plaintiff || r.lender || "",
        filedDate: r.filed_date || r.filing_date || "",
        attorney: r.attorney || "",

        // From ClerkData (if present)
        bedrooms: parseNum(r.bedrooms || r.beds),
        bathrooms: parseNum(r.bathrooms || r.baths),
        sqft: parseNum(r.sqft || r.square_feet || r.sq_ft),
        yearBuilt: parseNum(r.year_built || r.yearbuilt),
        lastSaleDate: r.last_sale_date || r.sale_date || null,
        lastSalePrice: parseNum(r.last_sale_price || r.sale_price),

        // Will be filled by RealEstateAPI
        estimatedValue: null,
        estimatedEquity: null,
        equityPercent: null,
        openMortgageBalance: null,
        ownerMailingAddress: null,
        owner1FirstName: null,
        owner1LastName: null,
        ownershipLengthYears: null,
        absenteeOwner: false,
        outOfStateOwner: false,
        vacant: false,
        highEquity: false,
        freeClear: false,
        auction: false,
        auctionDate: null,
        assessedValue: null,
        taxAmount: null,

        priority: getPriority(r.filed_date || r.filing_date),
        tags: ["lis_pendens", "fdaily"],
        enriched: false,
      };

      // === ENRICH FROM REALESTATE API ===
      if (fullAddress && REALESTATE_API_KEY) {
        try {
          const res = await fetch(REALESTATE_API_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": REALESTATE_API_KEY,
            },
            body: JSON.stringify({ address: fullAddress }),
          });

          if (res.ok) {
            const json = await res.json();
            const d = json.data || json;

            if (d && d.id) {
              lead.realEstateApiId = d.id;
              lead.enriched = true;
              enriched++;

              // === PULL ONLY WHAT WE NEED ===

              // Values (THE KEY DATA)
              lead.estimatedValue = d.estimatedValue || null;
              lead.estimatedEquity = d.estimatedEquity || null;
              lead.equityPercent = d.equityPercent || null;
              lead.openMortgageBalance = d.openMortgageBalance || null;

              // Owner mailing address
              if (d.ownerInfo?.mailAddress) {
                const ma = d.ownerInfo.mailAddress;
                lead.ownerMailingAddress = ma.label ||
                  `${ma.address || ""}, ${ma.city || ""}, ${ma.state || ""} ${ma.zip || ""}`.trim();
                lead.owner1FirstName = d.ownerInfo.owner1FirstName || null;
                lead.owner1LastName = d.ownerInfo.owner1LastName || null;
                lead.ownershipLengthYears = d.ownerInfo.ownershipLength || null;
              }

              // Flags
              lead.absenteeOwner = d.absenteeOwner || false;
              lead.outOfStateOwner = d.outOfStateAbsenteeOwner || false;
              lead.vacant = d.vacant || false;
              lead.highEquity = d.highEquity || false;
              lead.freeClear = d.freeClear || false;
              lead.auction = d.auction || false;
              lead.auctionDate = d.auctionInfo?.auctionDate || null;

              // Tax
              lead.assessedValue = d.taxInfo?.assessedValue || null;
              lead.taxAmount = d.taxInfo?.taxAmount || null;

              // Fill property info if ClerkData didn't have it
              if (!lead.bedrooms && d.propertyInfo?.bedrooms) lead.bedrooms = d.propertyInfo.bedrooms;
              if (!lead.bathrooms && d.propertyInfo?.bathrooms) lead.bathrooms = d.propertyInfo.bathrooms;
              if (!lead.sqft) lead.sqft = d.propertyInfo?.livingSquareFeet || d.propertyInfo?.buildingSquareFeet || null;
              if (!lead.yearBuilt && d.propertyInfo?.yearBuilt) lead.yearBuilt = d.propertyInfo.yearBuilt;
              if (!lead.lastSaleDate) lead.lastSaleDate = d.lastSaleDate || null;
              if (!lead.lastSalePrice) lead.lastSalePrice = d.lastSalePrice || null;

              // Auto-tag
              if (lead.highEquity) lead.tags.push("high_equity");
              if (lead.absenteeOwner) lead.tags.push("absentee");
              if (lead.outOfStateOwner) lead.tags.push("out_of_state");
              if (lead.vacant) lead.tags.push("vacant");
              if (lead.auction) lead.tags.push("auction");
              if (lead.freeClear) lead.tags.push("free_clear");
            }
          }
        } catch (err) {
          console.error(`[FDAILY] Enrich error for ${fullAddress}:`, err);
        }

        // Rate limit
        if (i < records.length - 1) await new Promise(r => setTimeout(r, 100));
      }

      leads.push(lead);
    }

    const stats = {
      total: leads.length,
      enriched,
      highEquity: leads.filter(l => l.highEquity).length,
      absentee: leads.filter(l => l.absenteeOwner).length,
      vacant: leads.filter(l => l.vacant).length,
      auction: leads.filter(l => l.auction).length,
      hot: leads.filter(l => l.priority === "hot").length,
    };

    batches.set(batchId, { leads, createdAt: new Date().toISOString(), stats });

    return NextResponse.json({
      success: true,
      batchId,
      stats,
      message: `Enriched ${enriched}/${leads.length} leads`,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Get batch or export to Zoho CSV
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get("batch");
  const format = searchParams.get("format");

  if (!batchId) {
    return NextResponse.json({
      batches: Array.from(batches.entries()).map(([id, b]) => ({
        id, createdAt: b.createdAt, stats: b.stats
      }))
    });
  }

  const batch = batches.get(batchId);
  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  // Zoho CSV export
  if (format === "zoho") {
    const csv = toZohoCSV(batch.leads);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="zoho-${batchId}.csv"`,
      },
    });
  }

  return NextResponse.json({ batchId, ...batch });
}

function toZohoCSV(leads: FDAILYLead[]): string {
  const h = [
    "Lead_ID", "RealEstateAPI_ID", "Case_Number", "Folio",
    "First_Name", "Last_Name",
    "Property_Address", "City", "State", "Zip",
    "Mailing_Address",
    "Plaintiff", "Filed_Date", "Attorney",
    "Estimated_Value", "Estimated_Equity", "Equity_Percent", "Mortgage_Balance",
    "Assessed_Value", "Tax_Amount",
    "Bedrooms", "Bathrooms", "Sqft", "Year_Built",
    "Last_Sale_Date", "Last_Sale_Price",
    "Ownership_Years", "Priority",
    "Absentee", "Out_Of_State", "Vacant", "High_Equity", "Free_Clear", "Auction", "Auction_Date",
    "Tags", "Lead_Source"
  ];

  const rows = leads.map(l => {
    const parts = (l.defendant || "").split(" ");
    return [
      l.id, l.realEstateApiId || "", l.caseNumber, l.folio,
      l.owner1FirstName || parts[0] || "", l.owner1LastName || parts.slice(1).join(" ") || "",
      l.propertyAddress, l.city, l.state, l.zip,
      l.ownerMailingAddress || "",
      l.plaintiff, l.filedDate, l.attorney,
      l.estimatedValue || "", l.estimatedEquity || "", l.equityPercent || "", l.openMortgageBalance || "",
      l.assessedValue || "", l.taxAmount || "",
      l.bedrooms || "", l.bathrooms || "", l.sqft || "", l.yearBuilt || "",
      l.lastSaleDate || "", l.lastSalePrice || "",
      l.ownershipLengthYears || "", l.priority,
      l.absenteeOwner, l.outOfStateOwner, l.vacant, l.highEquity, l.freeClear, l.auction, l.auctionDate || "",
      l.tags.join("; "), "FDAILY"
    ];
  });

  return [h.join(","), ...rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
}

function parseNum(v: any): number | null {
  if (!v) return null;
  const n = parseFloat(String(v).replace(/[$,]/g, ""));
  return isNaN(n) ? null : n;
}

function getPriority(d: string): "hot" | "warm" | "cold" {
  if (!d) return "warm";
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  return days <= 7 ? "hot" : days > 30 ? "cold" : "warm";
}

function parseCSV(text: string): any[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, "_"));
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    const rec: any = {};
    headers.forEach((h, i) => rec[h] = vals[i]?.trim() || "");
    return rec;
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let curr = "", inQ = false;
  for (const c of line) {
    if (c === '"') inQ = !inQ;
    else if (c === "," && !inQ) { result.push(curr); curr = ""; }
    else curr += c;
  }
  result.push(curr);
  return result;
}

export { batches };
