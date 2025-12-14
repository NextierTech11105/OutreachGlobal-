import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

/**
 * Agent HQ Skip Trace Integration
 *
 * Flow:
 * 1. EXPORT: Send list TO Agent HQ for skip tracing
 * 2. IMPORT: Receive skip traced data BACK from Agent HQ
 * 3. Process: Label phones as mobile/landline
 * 4. Campaign Prep: Mark leads ready for outreach
 * 5. Zoho Sync: Push full data to CRM (Homeowner Advisor only)
 *
 * Agent HQ returns:
 * - Owner name, phones (with type: mobile/landline/voip)
 * - Emails, relatives, associates
 * - Property ownership verification
 *
 * App-specific behavior:
 * - Homeowner Advisor: Full Zoho CRM sync, SignalHouse campaigns
 * - Nextier: No Zoho (uses different CRM or none), same core pipeline
 *
 * Environment variables checked:
 * - ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN -> Zoho sync enabled
 * - SIGNALHOUSE_API_KEY -> SMS campaigns enabled
 * - REAL_ESTATE_API_KEY -> Property enrichment enabled
 */

const SPACES_ENDPOINT = "https://nyc3.digitaloceanspaces.com";
const SPACES_BUCKET = "nextier";
const SPACES_KEY = process.env.DO_SPACES_KEY || "";
const SPACES_SECRET = process.env.DO_SPACES_SECRET || "";

// RealEstateAPI for property detail enrichment
const REALESTATE_API_KEY =
  process.env.REAL_ESTATE_API_KEY || process.env.REALESTATE_API_KEY || "";
const PROPERTY_DETAIL_URL = "https://api.realestateapi.com/v2/PropertyDetail";

// Zoho CRM
const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID || "";
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET || "";
const ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN || "";
const ZOHO_API_URL = "https://www.zohoapis.com/crm/v3";

interface PhoneNumber {
  number: string;
  type: "mobile" | "landline" | "voip" | "unknown";
  carrier?: string;
  score?: number;
  dnc?: boolean;
}

interface AgentHQRecord {
  // From Agent HQ skip trace return
  record_id?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;

  // Phones - Agent HQ labels these
  phone_1?: string;
  phone_1_type?: string; // "Mobile", "Landline", "VoIP"
  phone_2?: string;
  phone_2_type?: string;
  phone_3?: string;
  phone_3_type?: string;
  phone_4?: string;
  phone_4_type?: string;
  phone_5?: string;
  phone_5_type?: string;

  // Alternative format
  mobile_phone?: string;
  landline_phone?: string;

  // Emails
  email_1?: string;
  email_2?: string;
  email?: string;

  // Property
  property_address?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;

  // Original data passed through
  folio?: string;
  case_number?: string;
  filing_date?: string;
  lead_id?: string;
}

interface ProcessedLead {
  id: string;
  folio: string;
  propertyId: string | null;
  zohoId: string | null;

  propertyAddress: string;
  city: string;
  state: string;
  zip: string;

  ownerName: string;
  ownerFirstName: string;
  ownerLastName: string;
  phones: PhoneNumber[];
  emails: string[];

  caseNumber: string;
  filedDate: string;

  // RealEstateAPI enrichment
  estimatedValue: number | null;
  estimatedEquity: number | null;
  equityPercent: number | null;
  propertyType: string;
  preForeclosure: boolean;

  // Campaign tracking
  campaignId: string | null;
  initialMessageIds: string[];
  retargetMessageIds: string[];

  // Status
  skipTraced: boolean;
  skipTracedAt: string;
  zohoSynced: boolean;
  zohoSyncedAt: string | null;
  campaignReady: boolean;
  hasMobile: boolean;
  hasLandline: boolean;
}

function getS3Client(): S3Client | null {
  if (!SPACES_KEY || !SPACES_SECRET) return null;
  return new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: "nyc3",
    credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
  });
}

function normalizePhoneType(
  type: string | undefined,
): "mobile" | "landline" | "voip" | "unknown" {
  if (!type) return "unknown";
  const lower = type.toLowerCase();
  if (
    lower.includes("mobile") ||
    lower.includes("cell") ||
    lower.includes("wireless")
  )
    return "mobile";
  if (
    lower.includes("land") ||
    lower.includes("home") ||
    lower.includes("fixed")
  )
    return "landline";
  if (lower.includes("voip") || lower.includes("virtual")) return "voip";
  return "unknown";
}

function extractPhones(record: AgentHQRecord): PhoneNumber[] {
  const phones: PhoneNumber[] = [];

  // Check numbered phone fields (phone_1, phone_2, etc)
  for (let i = 1; i <= 5; i++) {
    const phoneKey = `phone_${i}` as keyof AgentHQRecord;
    const typeKey = `phone_${i}_type` as keyof AgentHQRecord;
    const phone = record[phoneKey] as string | undefined;
    const type = record[typeKey] as string | undefined;

    if (phone && phone.length >= 10) {
      phones.push({
        number: phone.replace(/\D/g, "").slice(-10), // Normalize to 10 digits
        type: normalizePhoneType(type),
      });
    }
  }

  // Check explicit mobile/landline fields
  if (
    record.mobile_phone &&
    !phones.some(
      (p) => p.number === record.mobile_phone?.replace(/\D/g, "").slice(-10),
    )
  ) {
    phones.push({
      number: record.mobile_phone.replace(/\D/g, "").slice(-10),
      type: "mobile",
    });
  }

  if (
    record.landline_phone &&
    !phones.some(
      (p) => p.number === record.landline_phone?.replace(/\D/g, "").slice(-10),
    )
  ) {
    phones.push({
      number: record.landline_phone.replace(/\D/g, "").slice(-10),
      type: "landline",
    });
  }

  return phones;
}

function extractEmails(record: AgentHQRecord): string[] {
  const emails: string[] = [];

  if (record.email) emails.push(record.email);
  if (record.email_1 && !emails.includes(record.email_1))
    emails.push(record.email_1);
  if (record.email_2 && !emails.includes(record.email_2))
    emails.push(record.email_2);

  return emails.filter((e) => e && e.includes("@"));
}

async function getPropertyDetail(address: string): Promise<any> {
  if (!REALESTATE_API_KEY || !address) return null;

  try {
    const response = await fetch(PROPERTY_DETAIL_URL, {
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
  } catch (error) {
    console.error("[Agent HQ] Property detail failed:", error);
  }

  return null;
}

async function getZohoAccessToken(): Promise<string | null> {
  if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN)
    return null;

  try {
    const response = await fetch("https://accounts.zoho.com/oauth/v2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: ZOHO_CLIENT_ID,
        client_secret: ZOHO_CLIENT_SECRET,
        refresh_token: ZOHO_REFRESH_TOKEN,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.access_token;
    }
  } catch (error) {
    console.error("[Agent HQ] Zoho auth failed:", error);
  }

  return null;
}

async function syncToZoho(
  lead: ProcessedLead,
  accessToken: string,
): Promise<string | null> {
  try {
    const mobilePhone =
      lead.phones.find((p) => p.type === "mobile")?.number || "";
    const landlinePhone =
      lead.phones.find((p) => p.type === "landline")?.number || "";

    const zohoLead = {
      data: [
        {
          First_Name: lead.ownerFirstName,
          Last_Name: lead.ownerLastName || "Unknown",
          Email: lead.emails[0] || "",
          Mobile: mobilePhone,
          Phone: landlinePhone,

          Street: lead.propertyAddress,
          City: lead.city,
          State: lead.state,
          Zip_Code: lead.zip,

          Property_ID: lead.propertyId,
          Folio_Number: lead.folio,
          Estimated_Value: lead.estimatedValue,
          Estimated_Equity: lead.estimatedEquity,

          Case_Number: lead.caseNumber,
          Filing_Date: lead.filedDate,

          Campaign_ID: lead.campaignId,
          Initial_Message_IDs: lead.initialMessageIds.join(","),
          Retarget_Message_IDs: lead.retargetMessageIds.join(","),

          Lead_Source: "FDAILY",
          FDAILY_Lead_ID: lead.id,
          Skip_Traced: true,
          Skip_Trace_Source: "Agent_HQ",
          Has_Mobile: lead.hasMobile,
          Has_Landline: lead.hasLandline,
          Campaign_Ready: lead.campaignReady,
        },
      ],
      trigger: ["workflow"],
    };

    const response = await fetch(`${ZOHO_API_URL}/Leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
      body: JSON.stringify(zohoLead),
    });

    if (response.ok) {
      const result = await response.json();
      return result.data?.[0]?.details?.id || null;
    }
  } catch (error) {
    console.error("[Agent HQ] Zoho sync failed:", error);
  }

  return null;
}

// GET /api/fdaily/agent-hq - Export list TO Agent HQ for skip tracing
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchName = searchParams.get("batch");
    const format = searchParams.get("format") || "csv";

    if (!batchName) {
      return NextResponse.json({
        message: "Export list to send to Agent HQ for skip tracing",
        usage:
          "GET /api/fdaily/agent-hq?batch=fdaily-import-2024-12-11&format=csv",
        note: "Download CSV, upload to Agent HQ, then POST the results back here",
      });
    }

    const client = getS3Client();
    if (!client) {
      return NextResponse.json(
        { error: "Storage not configured" },
        { status: 500 },
      );
    }

    const response = await client.send(
      new GetObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: `fdaily/${batchName}.json`,
      }),
    );

    const content = await response.Body?.transformToString();
    if (!content) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const data = JSON.parse(content);
    const leads = data.leads || [];

    // Format for Agent HQ upload
    // They typically want: Name, Address, City, State, Zip + any reference IDs
    const headers = [
      "lead_id",
      "first_name",
      "last_name",
      "full_name",
      "property_address",
      "city",
      "state",
      "zip",
      "folio",
      "case_number",
      "filing_date",
    ];

    const rows = leads.map((l: any) => {
      const ownerName = l.ownerName || l.defendant || "";
      const nameParts = ownerName.split(/\s+/);

      return [
        l.id,
        nameParts[0] || "",
        nameParts.slice(1).join(" ") || "",
        ownerName,
        l.propertyAddress || "",
        l.city || "",
        l.state || "",
        l.zip || "",
        l.folio || "",
        l.caseNumber || "",
        l.filedDate || "",
      ];
    });

    if (format === "csv") {
      const csv = [
        headers.join(","),
        ...rows.map((r) =>
          r
            .map((v) => `"${(v || "").toString().replace(/"/g, '""')}"`)
            .join(","),
        ),
      ].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="agent-hq-upload-${batchName}.csv"`,
        },
      });
    }

    return NextResponse.json({
      batchName,
      totalLeads: leads.length,
      exportFormat: "Ready for Agent HQ upload",
      leads: rows.map((r, i) => ({
        lead_id: r[0],
        first_name: r[1],
        last_name: r[2],
        full_name: r[3],
        property_address: r[4],
        city: r[5],
        state: r[6],
        zip: r[7],
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/fdaily/agent-hq - Import skip traced data BACK from Agent HQ
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let records: AgentHQRecord[] = [];
    let originalBatchName = "";
    let syncToZohoCRM = true;
    let assignCampaign: string | null = null;
    let initialMessageIds: string[] = [];
    let retargetMessageIds: string[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File;
      originalBatchName = (formData.get("originalBatch") as string) || "";
      syncToZohoCRM = formData.get("syncZoho") !== "false";
      assignCampaign = (formData.get("campaignId") as string) || null;

      const msgIds = formData.get("initialMessageIds") as string;
      if (msgIds) initialMessageIds = msgIds.split(",").map((s) => s.trim());

      const retargetIds = formData.get("retargetMessageIds") as string;
      if (retargetIds)
        retargetMessageIds = retargetIds.split(",").map((s) => s.trim());

      if (!file) {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 },
        );
      }

      const text = await file.text();
      records = parseCSV(text);
    } else {
      const body = await request.json();
      records = body.records || [];
      originalBatchName = body.originalBatch || "";
      syncToZohoCRM = body.syncZoho !== false;
      assignCampaign = body.campaignId || null;
      initialMessageIds = body.initialMessageIds || [];
      retargetMessageIds = body.retargetMessageIds || [];
    }

    if (!records.length) {
      return NextResponse.json(
        { error: "No records to process" },
        { status: 400 },
      );
    }

    console.log(`[Agent HQ] Processing ${records.length} skip traced records`);

    const client = getS3Client();
    const zohoToken = syncToZohoCRM ? await getZohoAccessToken() : null;

    const results = {
      total: records.length,
      processed: 0,
      withMobile: 0,
      withLandline: 0,
      withEmail: 0,
      campaignReady: 0,
      zohoSynced: 0,
      errors: [] as string[],
    };

    const processedLeads: ProcessedLead[] = [];

    for (const record of records) {
      try {
        const phones = extractPhones(record);
        const emails = extractEmails(record);

        const ownerName =
          record.full_name ||
          `${record.first_name || ""} ${record.last_name || ""}`.trim();
        const address = record.property_address || record.address || "";

        // Get RealEstateAPI detail for property
        const propertyDetail = await getPropertyDetail(address);

        const hasMobile = phones.some((p) => p.type === "mobile");
        const hasLandline = phones.some((p) => p.type === "landline");

        const lead: ProcessedLead = {
          id:
            record.lead_id ||
            record.record_id ||
            `agenthq-${Date.now()}-${results.processed}`,
          folio: record.folio || "",
          propertyId: propertyDetail?.id || null,
          zohoId: null,

          propertyAddress: address,
          city: record.city || "",
          state: record.state || "",
          zip: record.zip || "",

          ownerName,
          ownerFirstName: record.first_name || ownerName.split(" ")[0] || "",
          ownerLastName:
            record.last_name || ownerName.split(" ").slice(1).join(" ") || "",
          phones,
          emails,

          caseNumber: record.case_number || "",
          filedDate: record.filing_date || "",

          estimatedValue: propertyDetail?.estimatedValue || null,
          estimatedEquity: propertyDetail?.estimatedEquity || null,
          equityPercent: propertyDetail?.equityPercent || null,
          propertyType: propertyDetail?.propertyType || "Residential",
          preForeclosure: propertyDetail?.preForeclosure || true,

          campaignId: assignCampaign,
          initialMessageIds,
          retargetMessageIds,

          skipTraced: true,
          skipTracedAt: new Date().toISOString(),
          zohoSynced: false,
          zohoSyncedAt: null,
          campaignReady: hasMobile, // Ready for SMS campaigns if has mobile
          hasMobile,
          hasLandline,
        };

        // Update stats
        results.processed++;
        if (hasMobile) results.withMobile++;
        if (hasLandline) results.withLandline++;
        if (emails.length > 0) results.withEmail++;
        if (lead.campaignReady) results.campaignReady++;

        // Sync to Zoho
        if (zohoToken) {
          const zohoId = await syncToZoho(lead, zohoToken);
          if (zohoId) {
            lead.zohoId = zohoId;
            lead.zohoSynced = true;
            lead.zohoSyncedAt = new Date().toISOString();
            results.zohoSynced++;
          }
        }

        processedLeads.push(lead);

        // Rate limit API calls
        if (propertyDetail) await new Promise((r) => setTimeout(r, 100));
      } catch (error: any) {
        results.errors.push(
          `Record ${record.lead_id || record.record_id}: ${error.message}`,
        );
      }
    }

    // Save processed data
    if (client) {
      const outputKey = `fdaily/${originalBatchName || "agenthq"}-skip-traced-${Date.now()}.json`;

      await client.send(
        new PutObjectCommand({
          Bucket: SPACES_BUCKET,
          Key: outputKey,
          Body: JSON.stringify(
            {
              source: "agent_hq",
              originalBatch: originalBatchName,
              processedAt: new Date().toISOString(),
              stats: results,
              leads: processedLeads,
            },
            null,
            2,
          ),
          ContentType: "application/json",
        }),
      );

      console.log(`[Agent HQ] Saved to ${outputKey}`);
    }

    return NextResponse.json({
      success: true,
      stats: results,
      message: `Processed ${results.processed} leads: ${results.withMobile} mobile, ${results.withLandline} landline, ${results.campaignReady} campaign-ready`,
      summary: {
        mobilePhones: results.withMobile,
        landlinePhones: results.withLandline,
        emails: results.withEmail,
        campaignReady: results.campaignReady,
        syncedToZoho: results.zohoSynced,
      },
      preview: processedLeads.slice(0, 3).map((l) => ({
        id: l.id,
        ownerName: l.ownerName,
        phones: l.phones,
        campaignReady: l.campaignReady,
        zohoId: l.zohoId,
      })),
    });
  } catch (error: any) {
    console.error("[Agent HQ] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Simple CSV parser
function parseCSV(text: string): AgentHQRecord[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) =>
    h
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_"),
  );

  const records: AgentHQRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < headers.length / 2) continue;

    const record: any = {};
    headers.forEach((h, idx) => {
      if (values[idx]) record[h] = values[idx].trim();
    });

    records.push(record);
  }

  return records;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}
