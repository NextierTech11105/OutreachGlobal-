import { NextResponse } from "next/server";
import { batches } from "../import/route";

export async function GET() {
  const REALESTATE_API_KEY = process.env.REALESTATE_API_KEY || process.env.REAL_ESTATE_API_KEY || "";

  // Count leads with RealEstateAPI IDs
  let totalLeads = 0;
  let withIds = 0;

  for (const [, batch] of batches) {
    const leads = batch.leads || [];
    totalLeads += leads.length;
    withIds += leads.filter((l: any) => l.realEstateApiId).length;
  }

  return NextResponse.json({
    status: "ok",
    realEstateApi: {
      configured: !!REALESTATE_API_KEY,
      keyPrefix: REALESTATE_API_KEY ? REALESTATE_API_KEY.slice(0, 20) + "..." : null,
    },
    data: {
      batches: batches.size,
      totalLeads,
      leadsWithRealEstateApiId: withIds,
      monitorable: withIds,
    },
    endpoints: {
      import: "POST /api/import - Upload FDAILY CSV",
      monitor: "GET /api/monitor - Run change detection cron",
      batch: "GET /api/batch?name=X - Get batch data",
      exportAgentHQ: "GET /api/export/agent-hq?batch=X - Export for skip trace",
      exportZoho: "GET /api/export/zoho?batch=X - Export for Zoho CRM",
    },
  });
}
