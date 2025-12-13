import { NextRequest, NextResponse } from "next/server";
import { batches } from "../../import/route";

/**
 * Export CSV for Agent HQ skip tracing
 * Include lead_id so we can match when importing back
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const batchName = searchParams.get("batch");

  if (!batchName) {
    return NextResponse.json({
      message: "Export CSV for Agent HQ skip tracing",
      usage: "GET /api/export/agent-hq?batch=<name>",
    });
  }

  const batch = batches.get(batchName);
  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  const leads = batch.leads || [];
  const headers = [
    "lead_id",
    "first_name",
    "last_name",
    "property_address",
    "city",
    "state",
    "zip",
    "case_number",
    "folio",
  ];

  const rows = leads.map((l: any) => {
    const nameParts = (l.ownerName || "").split(" ");
    return [
      l.id || l.fdailyId || "",
      nameParts[0] || "",
      nameParts.slice(1).join(" ") || "",
      l.address || "",
      l.city || "",
      l.state || "",
      l.zip || "",
      l.caseNumber || "",
      l.folio || "",
    ];
  });

  const csv = [
    headers.join(","),
    ...rows.map(r => r.map(v => `"${String(v || "").replace(/"/g, '""')}"`).join(","))
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="agent-hq-${batchName}.csv"`,
    },
  });
}
