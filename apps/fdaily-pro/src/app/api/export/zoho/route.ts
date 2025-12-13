import { NextRequest, NextResponse } from "next/server";
import { batches } from "../../import/route";

/**
 * Export Zoho-ready CSV
 * All IDs included for tracking
 */

const ZOHO_FIELDS = [
  "FDAILY_Lead_ID",
  "RealEstateAPI_ID",
  "Case_Number",
  "Folio",
  "First_Name",
  "Last_Name",
  "Mobile",
  "Phone",
  "Email",
  "Street",
  "City",
  "State",
  "Zip_Code",
  "Estimated_Value",
  "Estimated_Equity",
  "Property_Type",
  "Bedrooms",
  "Bathrooms",
  "Square_Feet",
  "Year_Built",
  "Filing_Date",
  "Priority",
  "Tags",
  "Skip_Traced",
  "Campaign_Ready",
  "Lead_Source",
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const batchName = searchParams.get("batch");

  if (!batchName) {
    return NextResponse.json({
      message: "Export Zoho-ready CSV",
      usage: "GET /api/export/zoho?batch=<name>",
      fields: ZOHO_FIELDS,
    });
  }

  const batch = batches.get(batchName);
  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  const leads = batch.leads || [];
  const rows = leads.map((l: any) => {
    const nameParts = (l.ownerName || "").split(" ");
    const mobile = l.phones?.find((p: any) => p.type === "mobile")?.number || "";
    const landline = l.phones?.find((p: any) => p.type === "landline")?.number || "";

    return [
      l.id || l.fdailyId || "",
      l.realEstateApiId || "",
      l.caseNumber || "",
      l.folio || "",
      nameParts[0] || "",
      nameParts.slice(1).join(" ") || "",
      mobile,
      landline,
      l.emails?.[0] || "",
      l.address || "",
      l.city || "",
      l.state || "",
      l.zip || "",
      l.estimatedValue || "",
      l.estimatedEquity || "",
      l.propertyType || "",
      l.bedrooms || "",
      l.bathrooms || "",
      l.sqft || "",
      l.yearBuilt || "",
      l.filedDate || "",
      l.priority || "",
      (l.tags || []).join("; "),
      l.skipTraced ? "true" : "false",
      l.campaignReady ? "true" : "false",
      "FDAILY",
    ];
  });

  const csv = [
    ZOHO_FIELDS.join(","),
    ...rows.map(r => r.map(v => `"${String(v || "").replace(/"/g, '""')}"`).join(","))
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="zoho-${batchName}.csv"`,
    },
  });
}
