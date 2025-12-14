import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

/**
 * FDAILY Skip Trace Pipeline
 *
 * Full workflow:
 * 1. Agent downloads list from FDAILY import
 * 2. Skip trace via RealEstateAPI to get phone numbers
 * 3. Label phones as MOBILE vs LANDLINE
 * 4. Return enriched contacts ready for campaigns
 * 5. Sync to Zoho CRM with full property detail
 *
 * Output format for campaign prep:
 * - leadId, folio, propertyId, zohoId
 * - ownerName, phones[{number, type: mobile|landline}]
 * - campaignId, messageLibraryIds[], retargetIds[]
 */

const SPACES_ENDPOINT = "https://nyc3.digitaloceanspaces.com";
const SPACES_BUCKET = "nextier";
const SPACES_KEY = process.env.DO_SPACES_KEY || "";
const SPACES_SECRET = process.env.DO_SPACES_SECRET || "";

// RealEstateAPI for Skip Trace
const REALESTATE_API_KEY =
  process.env.REAL_ESTATE_API_KEY || process.env.REALESTATE_API_KEY || "";
const SKIP_TRACE_URL = "https://api.realestateapi.com/v1/SkipTrace";
const PROPERTY_DETAIL_URL = "https://api.realestateapi.com/v2/PropertyDetail";

// Zoho CRM
const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID || "";
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET || "";
const ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN || "";
const ZOHO_API_URL = "https://www.zohoapis.com/crm/v3";

interface PhoneNumber {
  number: string;
  type: "mobile" | "landline" | "unknown";
  carrier?: string;
  score?: number;
  dnc?: boolean;
}

interface SkipTracedLead {
  // IDs for tracking
  id: string;
  folio: string;
  propertyId: string | null;
  zohoId: string | null;

  // Property info
  propertyAddress: string;
  city: string;
  state: string;
  zip: string;

  // Owner/Contact
  ownerName: string;
  ownerFirstName: string;
  ownerLastName: string;
  phones: PhoneNumber[];
  emails: string[];
  mailingAddress: string;

  // Case info
  caseNumber: string;
  filedDate: string;

  // Property details from RealEstateAPI
  estimatedValue: number | null;
  estimatedEquity: number | null;
  equityPercent: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  yearBuilt: number | null;
  propertyType: string;
  preForeclosure: boolean;
  foreclosure: boolean;

  // Campaign assignment
  campaignId: string | null;
  initialMessageIds: string[];
  retargetMessageIds: string[];

  // Status
  skipTraced: boolean;
  skipTracedAt: string | null;
  zohoSynced: boolean;
  zohoSyncedAt: string | null;
  campaignReady: boolean;
}

function getS3Client(): S3Client | null {
  if (!SPACES_KEY || !SPACES_SECRET) return null;
  return new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: "nyc3",
    credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
  });
}

async function getZohoAccessToken(): Promise<string | null> {
  if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN) {
    console.warn("[Skip Trace] Zoho not configured");
    return null;
  }

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
    console.error("[Skip Trace] Zoho auth failed:", error);
  }

  return null;
}

async function skipTracePerson(
  firstName: string,
  lastName: string,
  address: string,
  city: string,
  state: string,
  zip: string,
): Promise<{ phones: PhoneNumber[]; emails: string[] }> {
  if (!REALESTATE_API_KEY) {
    return { phones: [], emails: [] };
  }

  try {
    const response = await fetch(SKIP_TRACE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        address,
        city,
        state,
        zip,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const result = data.data || data;

      // Extract and label phones
      const phones: PhoneNumber[] = [];

      // Process phone numbers from skip trace response
      const rawPhones = result.phones || result.phone_numbers || [];
      for (const phone of rawPhones) {
        const phoneObj = typeof phone === "string" ? { number: phone } : phone;

        // Determine type based on carrier info or line type
        let phoneType: "mobile" | "landline" | "unknown" = "unknown";
        const lineType = (
          phoneObj.line_type ||
          phoneObj.type ||
          ""
        ).toLowerCase();

        if (
          lineType.includes("mobile") ||
          lineType.includes("cell") ||
          lineType.includes("wireless")
        ) {
          phoneType = "mobile";
        } else if (
          lineType.includes("land") ||
          lineType.includes("voip") ||
          lineType.includes("fixed")
        ) {
          phoneType = "landline";
        }

        phones.push({
          number: phoneObj.number || phoneObj.phone || phone,
          type: phoneType,
          carrier: phoneObj.carrier || phoneObj.provider,
          score: phoneObj.score || phoneObj.confidence,
          dnc: phoneObj.dnc || phoneObj.do_not_call || false,
        });
      }

      // Extract emails
      const emails = result.emails || result.email_addresses || [];

      return {
        phones,
        emails: emails.map((e: any) =>
          typeof e === "string" ? e : e.email || e.address,
        ),
      };
    }
  } catch (error) {
    console.error("[Skip Trace] API call failed:", error);
  }

  return { phones: [], emails: [] };
}

async function getPropertyDetail(address: string): Promise<any> {
  if (!REALESTATE_API_KEY) return null;

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
    console.error("[Skip Trace] Property detail failed:", error);
  }

  return null;
}

async function syncToZoho(
  lead: SkipTracedLead,
  accessToken: string,
): Promise<string | null> {
  try {
    // Format phone numbers for Zoho
    const mobilePhone =
      lead.phones.find((p) => p.type === "mobile")?.number || "";
    const homePhone =
      lead.phones.find((p) => p.type === "landline")?.number || "";
    const primaryEmail = lead.emails[0] || "";

    const zohoLead = {
      data: [
        {
          // Basic info
          First_Name: lead.ownerFirstName,
          Last_Name: lead.ownerLastName || "Unknown",
          Email: primaryEmail,
          Mobile: mobilePhone,
          Phone: homePhone,

          // Property address
          Street: lead.propertyAddress,
          City: lead.city,
          State: lead.state,
          Zip_Code: lead.zip,

          // Mailing address
          Mailing_Street: lead.mailingAddress,

          // Custom fields - Property Details
          Property_ID: lead.propertyId,
          Folio_Number: lead.folio,
          Estimated_Value: lead.estimatedValue,
          Estimated_Equity: lead.estimatedEquity,
          Equity_Percent: lead.equityPercent,
          Bedrooms: lead.bedrooms,
          Bathrooms: lead.bathrooms,
          Square_Feet: lead.sqft,
          Year_Built: lead.yearBuilt,
          Property_Type: lead.propertyType,

          // Case info
          Case_Number: lead.caseNumber,
          Filing_Date: lead.filedDate,

          // Status flags
          Pre_Foreclosure: lead.preForeclosure,
          Foreclosure: lead.foreclosure,

          // Campaign tracking
          Campaign_ID: lead.campaignId,
          Initial_Message_IDs: lead.initialMessageIds.join(","),
          Retarget_Message_IDs: lead.retargetMessageIds.join(","),

          // Source tracking
          Lead_Source: "FDAILY",
          FDAILY_Lead_ID: lead.id,

          // Skip trace info
          Skip_Traced: lead.skipTraced,
          Skip_Trace_Date: lead.skipTracedAt,
          Phone_Type: lead.phones
            .map((p) => `${p.number}:${p.type}`)
            .join("; "),
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
      const zohoId = result.data?.[0]?.details?.id;
      return zohoId || null;
    } else {
      const error = await response.text();
      console.error("[Zoho Sync] Failed:", error);
    }
  } catch (error) {
    console.error("[Zoho Sync] Error:", error);
  }

  return null;
}

// POST /api/fdaily/skip-trace - Run skip trace on batch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      batchName,
      leadIds, // Optional: specific leads to process
      syncToZohoCRM = true,
      assignCampaign, // Optional: campaign ID to assign
      initialMessageIds = [], // Message library IDs for initial outreach
      retargetMessageIds = [], // Message IDs for retargeting
    } = body;

    if (!batchName) {
      return NextResponse.json(
        { error: "batchName required" },
        { status: 400 },
      );
    }

    const client = getS3Client();
    if (!client) {
      return NextResponse.json(
        { error: "Storage not configured" },
        { status: 500 },
      );
    }

    // Load batch
    const getResponse = await client.send(
      new GetObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: `fdaily/${batchName}.json`,
      }),
    );

    const content = await getResponse.Body?.transformToString();
    if (!content) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const batchData = JSON.parse(content);
    let leads = batchData.leads || [];

    // Filter to specific leads if provided
    if (leadIds?.length) {
      leads = leads.filter((l: any) => leadIds.includes(l.id));
    }

    console.log(
      `[Skip Trace] Processing ${leads.length} leads from ${batchName}`,
    );

    const results = {
      total: leads.length,
      skipTraced: 0,
      phonesFound: 0,
      mobilePhones: 0,
      landlinePhones: 0,
      emailsFound: 0,
      zohoSynced: 0,
      campaignReady: 0,
      errors: [] as string[],
    };

    // Get Zoho token if syncing
    let zohoToken: string | null = null;
    if (syncToZohoCRM) {
      zohoToken = await getZohoAccessToken();
    }

    const processedLeads: SkipTracedLead[] = [];

    for (const lead of leads) {
      try {
        // Parse owner name
        const ownerName = lead.ownerName || lead.defendant || "";
        const nameParts = ownerName.split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || nameParts[0] || "";

        // Run skip trace
        const skipResult = await skipTracePerson(
          firstName,
          lastName,
          lead.propertyAddress || "",
          lead.city || "",
          lead.state || "",
          lead.zip || "",
        );

        // Get full property detail
        const propertyDetail = await getPropertyDetail(lead.propertyAddress);

        // Build enriched lead
        const enrichedLead: SkipTracedLead = {
          id: lead.id,
          folio: lead.folio || "",
          propertyId: propertyDetail?.id || lead.realEstateApiId || null,
          zohoId: null,

          propertyAddress: lead.propertyAddress,
          city: lead.city || "",
          state: lead.state || "",
          zip: lead.zip || "",

          ownerName,
          ownerFirstName: firstName,
          ownerLastName: lastName,
          phones: skipResult.phones,
          emails: skipResult.emails,
          mailingAddress: lead.mailingAddress || lead.propertyAddress,

          caseNumber: lead.caseNumber || "",
          filedDate: lead.filedDate || "",

          estimatedValue: propertyDetail?.estimatedValue || lead.estimatedValue,
          estimatedEquity: propertyDetail?.estimatedEquity || null,
          equityPercent: propertyDetail?.equityPercent || null,
          bedrooms: propertyDetail?.bedrooms || lead.bedrooms,
          bathrooms: propertyDetail?.bathrooms || lead.bathrooms,
          sqft: propertyDetail?.squareFeet || lead.sqft,
          yearBuilt: propertyDetail?.yearBuilt || lead.yearBuilt,
          propertyType:
            propertyDetail?.propertyType || lead.propertyType || "Residential",
          preForeclosure: propertyDetail?.preForeclosure || true,
          foreclosure: propertyDetail?.foreclosure || false,

          campaignId: assignCampaign || null,
          initialMessageIds: initialMessageIds,
          retargetMessageIds: retargetMessageIds,

          skipTraced: true,
          skipTracedAt: new Date().toISOString(),
          zohoSynced: false,
          zohoSyncedAt: null,
          campaignReady: false,
        };

        // Update stats
        results.skipTraced++;
        results.phonesFound += enrichedLead.phones.length;
        results.mobilePhones += enrichedLead.phones.filter(
          (p) => p.type === "mobile",
        ).length;
        results.landlinePhones += enrichedLead.phones.filter(
          (p) => p.type === "landline",
        ).length;
        results.emailsFound += enrichedLead.emails.length;

        // Sync to Zoho
        if (zohoToken && syncToZohoCRM) {
          const zohoId = await syncToZoho(enrichedLead, zohoToken);
          if (zohoId) {
            enrichedLead.zohoId = zohoId;
            enrichedLead.zohoSynced = true;
            enrichedLead.zohoSyncedAt = new Date().toISOString();
            results.zohoSynced++;
          }
        }

        // Mark campaign ready if has mobile phone
        if (enrichedLead.phones.some((p) => p.type === "mobile" && !p.dnc)) {
          enrichedLead.campaignReady = true;
          results.campaignReady++;
        }

        processedLeads.push(enrichedLead);

        // Rate limiting
        await new Promise((r) => setTimeout(r, 200));
      } catch (error: any) {
        results.errors.push(`Lead ${lead.id}: ${error.message}`);
      }
    }

    // Save updated batch
    const outputKey = `fdaily/${batchName}-skip-traced.json`;
    await client.send(
      new PutObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: outputKey,
        Body: JSON.stringify(
          {
            batchName,
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

    console.log(`[Skip Trace] Completed. Results:`, results);

    return NextResponse.json({
      success: true,
      outputFile: outputKey,
      stats: results,
      message: `Skip traced ${results.skipTraced} leads: ${results.mobilePhones} mobile, ${results.landlinePhones} landline phones found`,
      // Preview first 3 for verification
      preview: processedLeads.slice(0, 3).map((l) => ({
        id: l.id,
        ownerName: l.ownerName,
        address: l.propertyAddress,
        phones: l.phones,
        zohoId: l.zohoId,
        campaignReady: l.campaignReady,
      })),
    });
  } catch (error: any) {
    console.error("[Skip Trace] Error:", error);
    return NextResponse.json(
      { error: error.message || "Skip trace failed" },
      { status: 500 },
    );
  }
}

// GET /api/fdaily/skip-trace - Get skip traced batch
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchName = searchParams.get("batch");
    const campaignReady = searchParams.get("campaignReady") === "true";
    const format = searchParams.get("format") || "json";

    if (!batchName) {
      return NextResponse.json({
        message: "Use ?batch=<name> to retrieve skip traced data",
        example:
          "/api/fdaily/skip-trace?batch=fdaily-import-2024-12-11-skip-traced",
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
    let leads = data.leads || [];

    // Filter to campaign ready if requested
    if (campaignReady) {
      leads = leads.filter((l: SkipTracedLead) => l.campaignReady);
    }

    // Return as CSV for agent download
    if (format === "csv") {
      const headers = [
        "id",
        "folio",
        "propertyId",
        "zohoId",
        "ownerName",
        "mobilePhone",
        "landlinePhone",
        "email",
        "propertyAddress",
        "city",
        "state",
        "zip",
        "estimatedValue",
        "caseNumber",
        "filedDate",
        "campaignId",
        "campaignReady",
      ];

      const rows = leads.map((l: SkipTracedLead) => [
        l.id,
        l.folio,
        l.propertyId,
        l.zohoId,
        l.ownerName,
        l.phones.find((p) => p.type === "mobile")?.number || "",
        l.phones.find((p) => p.type === "landline")?.number || "",
        l.emails[0] || "",
        l.propertyAddress,
        l.city,
        l.state,
        l.zip,
        l.estimatedValue,
        l.caseNumber,
        l.filedDate,
        l.campaignId,
        l.campaignReady,
      ]);

      const csv = [
        headers.join(","),
        ...rows.map((r) => r.map((v) => `"${v || ""}"`).join(",")),
      ].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${batchName}.csv"`,
        },
      });
    }

    return NextResponse.json({
      batchName,
      totalLeads: leads.length,
      campaignReady: leads.filter((l: SkipTracedLead) => l.campaignReady)
        .length,
      leads,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to retrieve data" },
      { status: 500 },
    );
  }
}
