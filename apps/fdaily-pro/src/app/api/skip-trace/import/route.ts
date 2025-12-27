import { NextRequest, NextResponse } from "next/server";
import { batches } from "@/lib/batches-store";

/**
 * Import skip traced data from Agent HQ
 * Matches by lead_id and adds phones with mobile/landline labels
 */

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const originalBatch = formData.get("originalBatch") as string;

    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    const text = await file.text();
    const records = parseCSV(text);

    if (!records.length) {
      return NextResponse.json({ error: "No records" }, { status: 400 });
    }

    // Find original batch to update
    const batch = originalBatch ? batches.get(originalBatch) : null;
    const leadsMap = new Map<string, any>();

    if (batch) {
      for (const lead of batch.leads) {
        leadsMap.set(lead.id, lead);
      }
    }

    let matched = 0;
    let withMobile = 0;
    let withLandline = 0;

    for (const record of records) {
      const leadId = record.lead_id || record.record_id;
      const lead = leadsMap.get(leadId);

      if (lead) {
        matched++;

        // Extract phones
        const phones: { number: string; type: string }[] = [];

        for (let i = 1; i <= 5; i++) {
          const phone = record[`phone_${i}`];
          const type = record[`phone_${i}_type`];
          if (phone && phone.length >= 10) {
            phones.push({
              number: phone.replace(/\D/g, "").slice(-10),
              type: normalizeType(type),
            });
          }
        }

        // Alternative format
        if (record.mobile_phone) {
          phones.push({ number: record.mobile_phone.replace(/\D/g, "").slice(-10), type: "mobile" });
        }
        if (record.landline_phone) {
          phones.push({ number: record.landline_phone.replace(/\D/g, "").slice(-10), type: "landline" });
        }

        lead.phones = phones;
        lead.emails = [record.email, record.email_1, record.email_2].filter(e => e && e.includes("@"));
        lead.skipTraced = true;
        lead.skipTracedAt = new Date().toISOString();

        const hasMobile = phones.some(p => p.type === "mobile");
        const hasLandline = phones.some(p => p.type === "landline");

        lead.hasMobile = hasMobile;
        lead.hasLandline = hasLandline;
        lead.campaignReady = hasMobile;

        if (hasMobile) withMobile++;
        if (hasLandline) withLandline++;

        // Update name if provided
        if (record.first_name || record.last_name) {
          lead.ownerName = `${record.first_name || ""} ${record.last_name || ""}`.trim();
        }
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalRecords: records.length,
        matched,
        withMobile,
        withLandline,
        campaignReady: withMobile,
      },
      message: `Matched ${matched} leads, ${withMobile} have mobile phones`,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function normalizeType(type: string | undefined): "mobile" | "landline" | "voip" | "unknown" {
  if (!type) return "unknown";
  const lower = type.toLowerCase();
  if (lower.includes("mobile") || lower.includes("cell") || lower.includes("wireless")) return "mobile";
  if (lower.includes("land") || lower.includes("home") || lower.includes("fixed")) return "landline";
  if (lower.includes("voip")) return "voip";
  return "unknown";
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
