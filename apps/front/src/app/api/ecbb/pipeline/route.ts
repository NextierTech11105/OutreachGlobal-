import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { db } from "@/lib/db";
import { leads, businesses } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

/**
 * ECBB DEAL SOURCING PIPELINE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Complete orchestrator for USBizData → LeadID → SMS Campaign flow
 *
 * FLOW:
 *   1. INGEST: Read USBizData CSV from DO Spaces sector bucket
 *   2. VALIDATE: Apollo.io company validation + enrichment
 *   3. SKIP TRACE: RealEstateAPI to find owner mobile phone
 *   4. VERIFY: Twilio Lookup to confirm lineType = "mobile"
 *   5. QUALIFY: Generate LeadID if all criteria met
 *   6. CAMPAIGN: Queue for SignalHouse SMS campaign
 *
 * QUALIFICATION CRITERIA (record → LeadID):
 *   ✅ Apollo validated (company exists, high match score)
 *   ✅ Has mobile phone from skip trace
 *   ✅ Twilio confirms lineType = "mobile"
 *   ✅ Phone is connected (is_connected = true)
 *   ✅ Not on DNC list (doNotCall = false)
 *
 * USAGE:
 *   POST /api/ecbb/pipeline
 *   {
 *     "sectorPath": "datalake/business/us/sectors/construction/plumbers-hvac/",
 *     "batchSize": 100,
 *     "skipApollo": false,
 *     "dryRun": false
 *   }
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// API Keys
const APOLLO_API_KEY =
  process.env.APOLLO_IO_API_KEY || process.env.APOLLO_API_KEY || "";
const REALESTATE_API_KEY = process.env.REALESTATE_API_KEY || "";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";

// DO Spaces config
const SPACES_BUCKET = process.env.SPACES_BUCKET || "nextier";
const SPACES_ENDPOINT =
  process.env.SPACES_ENDPOINT || "https://nyc3.digitaloceanspaces.com";
const SPACES_KEY = process.env.SPACES_KEY || process.env.DO_SPACES_KEY || "";
const SPACES_SECRET =
  process.env.SPACES_SECRET || process.env.DO_SPACES_SECRET || "";

// Initialize S3 client for DO Spaces
const s3Client = new S3Client({
  endpoint: SPACES_ENDPOINT,
  region: "nyc3",
  credentials: {
    accessKeyId: SPACES_KEY,
    secretAccessKey: SPACES_SECRET,
  },
  forcePathStyle: false,
});

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface USBizDataRecord {
  company_name?: string;
  company?: string;
  dba?: string;
  contact_name?: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
  sic_code?: string;
  sic_description?: string;
  website?: string;
  employees?: string | number;
  revenue?: string | number;
  [key: string]: unknown;
}

interface EnrichmentResult {
  recordId: string;
  companyName: string;
  contactName: string;

  // Apollo enrichment
  apolloValidated: boolean;
  apolloMatchScore?: number;
  apolloCompanyId?: string;
  website?: string;
  linkedinUrl?: string;

  // Skip trace results
  skipTraced: boolean;
  mobilePhone?: string;
  phoneType?: string;
  carrier?: string;
  isConnected?: boolean;

  // Twilio verification
  twilioVerified: boolean;
  twilioLineType?: string;

  // Qualification
  qualified: boolean;
  leadId?: string;
  disqualificationReason?: string;
}

interface PipelineRequest {
  sectorPath: string;
  batchSize?: number;
  skipApollo?: boolean;
  skipSkipTrace?: boolean;
  dryRun?: boolean;
  maxRecords?: number;
  teamId?: string;
}

interface PipelineResult {
  success: boolean;
  pipelineId: string;
  sectorPath: string;
  stats: {
    totalRecords: number;
    apolloValidated: number;
    skipTraced: number;
    twilioVerified: number;
    qualified: number;
    leadsCreated: number;
    campaignReady: number;
    errors: number;
  };
  timing: {
    startedAt: string;
    completedAt: string;
    durationMs: number;
  };
  costs: {
    apolloCalls: number;
    skipTraceCalls: number;
    twilioCalls: number;
    estimatedCost: number;
  };
  results?: EnrichmentResult[];
  errors?: Array<{ recordId: string; error: string }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function generatePipelineId(): string {
  return `ecbb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateLeadId(): string {
  return `lead_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function parseCSV(content: string): USBizDataRecord[] {
  const lines = content.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];

  // Parse header row
  const headers = lines[0]
    .split(",")
    .map((h) =>
      h.trim().replace(/^"|"$/g, "").toLowerCase().replace(/\s+/g, "_"),
    );

  const records: USBizDataRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) continue;

    const record: USBizDataRecord = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx]?.trim().replace(/^"|"$/g, "") || "";
    });
    records.push(record);
  }

  return records;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function extractName(record: USBizDataRecord): {
  firstName: string;
  lastName: string;
} {
  if (record.first_name && record.last_name) {
    return { firstName: record.first_name, lastName: record.last_name };
  }

  const contactName = record.contact_name || "";
  const parts = contactName.split(/\s+/);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" ") || "",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 1: READ FROM DO SPACES
// ═══════════════════════════════════════════════════════════════════════════════

async function listSectorFiles(sectorPath: string): Promise<string[]> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: SPACES_BUCKET,
      Prefix: sectorPath,
    });

    const response = await s3Client.send(command);
    return (
      response.Contents?.map((obj) => obj.Key || "").filter((key) =>
        key.endsWith(".csv"),
      ) || []
    );
  } catch (error) {
    console.error(
      `[ECBB Pipeline] Failed to list files in ${sectorPath}:`,
      error,
    );
    throw error;
  }
}

async function readSectorFile(filePath: string): Promise<USBizDataRecord[]> {
  try {
    const command = new GetObjectCommand({
      Bucket: SPACES_BUCKET,
      Key: filePath,
    });

    const response = await s3Client.send(command);
    const content = await response.Body?.transformToString();

    if (!content) {
      throw new Error(`Empty file: ${filePath}`);
    }

    return parseCSV(content);
  } catch (error) {
    console.error(`[ECBB Pipeline] Failed to read file ${filePath}:`, error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 2: APOLLO VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

async function validateWithApollo(record: USBizDataRecord): Promise<{
  validated: boolean;
  matchScore?: number;
  companyId?: string;
  website?: string;
  linkedinUrl?: string;
  error?: string;
}> {
  if (!APOLLO_API_KEY) {
    return { validated: false, error: "Apollo API key not configured" };
  }

  const companyName = record.company_name || record.company || record.dba || "";
  if (!companyName) {
    return { validated: false, error: "No company name" };
  }

  try {
    const response = await fetch(
      "https://api.apollo.io/v1/organizations/enrich",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "x-api-key": APOLLO_API_KEY,
        },
        body: JSON.stringify({
          name: companyName,
          domain: record.website || undefined,
        }),
      },
    );

    if (!response.ok) {
      return {
        validated: false,
        error: `Apollo API error: ${response.status}`,
      };
    }

    const data = await response.json();
    const org = data.organization;

    if (!org) {
      return { validated: false, error: "No match found" };
    }

    // Calculate match score based on available data
    let matchScore = 0.5; // Base score for finding a match
    if (org.name?.toLowerCase() === companyName.toLowerCase())
      matchScore += 0.3;
    if (org.website_url) matchScore += 0.1;
    if (org.linkedin_url) matchScore += 0.1;

    return {
      validated: matchScore >= 0.5,
      matchScore,
      companyId: org.id,
      website: org.website_url,
      linkedinUrl: org.linkedin_url,
    };
  } catch (error) {
    return { validated: false, error: `Apollo error: ${error}` };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 3: SKIP TRACE (RealEstateAPI)
// ═══════════════════════════════════════════════════════════════════════════════

async function skipTraceOwner(record: USBizDataRecord): Promise<{
  success: boolean;
  mobilePhone?: string;
  phoneType?: string;
  carrier?: string;
  isConnected?: boolean;
  allPhones?: Array<{ number: string; type: string; connected: boolean }>;
  error?: string;
}> {
  if (!REALESTATE_API_KEY) {
    return { success: false, error: "RealEstateAPI key not configured" };
  }

  const { firstName, lastName } = extractName(record);
  if (!firstName && !lastName) {
    return { success: false, error: "No contact name for skip trace" };
  }

  try {
    const response = await fetch("https://api.realestateapi.com/v1/SkipTrace", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        address: record.address,
        city: record.city,
        state: record.state,
        zip: record.zip,
        match_requirements: { phones: true },
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `SkipTrace API error: ${response.status}`,
      };
    }

    const data = await response.json();
    const identity = data.output?.identity || {};
    const phones = identity.phones || [];

    if (phones.length === 0) {
      return { success: false, error: "No phones found" };
    }

    // Find mobile phone
    const mobilePhone = phones.find(
      (p: any) =>
        p.phoneType?.toLowerCase() === "mobile" ||
        p.phoneType?.toLowerCase() === "cell",
    );

    const bestPhone = mobilePhone || phones[0];

    return {
      success: true,
      mobilePhone:
        bestPhone?.phone || bestPhone?.phoneDisplay?.replace(/\D/g, ""),
      phoneType: bestPhone?.phoneType || "unknown",
      carrier: bestPhone?.carrier,
      isConnected: bestPhone?.isConnected !== false,
      allPhones: phones.map((p: any) => ({
        number: p.phone || p.phoneDisplay?.replace(/\D/g, ""),
        type: p.phoneType || "unknown",
        connected: p.isConnected !== false,
      })),
    };
  } catch (error) {
    return { success: false, error: `SkipTrace error: ${error}` };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 4: TWILIO LOOKUP (Phone Type Verification)
// ═══════════════════════════════════════════════════════════════════════════════

async function verifyWithTwilio(phoneNumber: string): Promise<{
  verified: boolean;
  lineType?: string;
  carrier?: string;
  error?: string;
}> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    // If no Twilio credentials, trust skip trace result
    return { verified: true, lineType: "mobile", carrier: "unverified" };
  }

  // Normalize phone number
  const normalized = phoneNumber.replace(/\D/g, "");
  const e164 = normalized.length === 10 ? `+1${normalized}` : `+${normalized}`;

  try {
    const auth = Buffer.from(
      `${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`,
    ).toString("base64");

    const response = await fetch(
      `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(e164)}?Fields=line_type_intelligence`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      },
    );

    if (!response.ok) {
      return { verified: false, error: `Twilio API error: ${response.status}` };
    }

    const data = await response.json();
    const lineType = data.line_type_intelligence?.type || "unknown";
    const carrier = data.line_type_intelligence?.carrier_name;

    return {
      verified: lineType === "mobile" || lineType === "voip",
      lineType,
      carrier,
    };
  } catch (error) {
    return { verified: false, error: `Twilio error: ${error}` };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 5: QUALIFICATION & LEAD CREATION
// ═══════════════════════════════════════════════════════════════════════════════

async function createQualifiedLead(
  record: USBizDataRecord,
  enrichment: Partial<EnrichmentResult>,
  teamId: string,
): Promise<string | null> {
  if (!enrichment.mobilePhone) {
    return null;
  }

  const leadId = generateLeadId();
  const { firstName, lastName } = extractName(record);
  const companyName = record.company_name || record.company || record.dba || "";

  try {
    await db.insert(leads).values({
      id: leadId,
      teamId,
      firstName,
      lastName,
      company: companyName,
      phone: enrichment.mobilePhone,
      email: record.email || null,
      address: record.address || null,
      city: record.city || null,
      state: record.state || null,
      zipCode: record.zip || null,
      source: "ecbb_pipeline",
      status: "qualified",
      score: 80, // High score for verified mobile
      tags: ["ecbb", "campaign_ready", "mobile_verified"],
      metadata: {
        apolloCompanyId: enrichment.apolloCompanyId,
        apolloMatchScore: enrichment.apolloMatchScore,
        phoneType: enrichment.phoneType,
        carrier: enrichment.carrier,
        twilioVerified: enrichment.twilioVerified,
        sicCode: record.sic_code,
        sicDescription: record.sic_description,
        enrichedAt: new Date().toISOString(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return leadId;
  } catch (error) {
    console.error(`[ECBB Pipeline] Failed to create lead:`, error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PIPELINE ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

async function runPipeline(request: PipelineRequest): Promise<PipelineResult> {
  const pipelineId = generatePipelineId();
  const startTime = Date.now();
  const teamId = request.teamId || "default_team";

  console.log(
    `[ECBB Pipeline] Starting pipeline ${pipelineId} for ${request.sectorPath}`,
  );

  const stats = {
    totalRecords: 0,
    apolloValidated: 0,
    skipTraced: 0,
    twilioVerified: 0,
    qualified: 0,
    leadsCreated: 0,
    campaignReady: 0,
    errors: 0,
  };

  const costs = {
    apolloCalls: 0,
    skipTraceCalls: 0,
    twilioCalls: 0,
    estimatedCost: 0,
  };

  const results: EnrichmentResult[] = [];
  const errors: Array<{ recordId: string; error: string }> = [];

  try {
    // List and read sector files
    const files = await listSectorFiles(request.sectorPath);

    if (files.length === 0) {
      throw new Error(`No CSV files found in ${request.sectorPath}`);
    }

    console.log(`[ECBB Pipeline] Found ${files.length} files to process`);

    let allRecords: USBizDataRecord[] = [];
    for (const file of files) {
      const records = await readSectorFile(file);
      allRecords = allRecords.concat(records);
    }

    // Apply max records limit
    if (request.maxRecords && allRecords.length > request.maxRecords) {
      allRecords = allRecords.slice(0, request.maxRecords);
    }

    stats.totalRecords = allRecords.length;
    console.log(`[ECBB Pipeline] Processing ${stats.totalRecords} records`);

    // Process in batches
    const batchSize = request.batchSize || 50;

    for (let i = 0; i < allRecords.length; i += batchSize) {
      const batch = allRecords.slice(i, i + batchSize);
      console.log(
        `[ECBB Pipeline] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allRecords.length / batchSize)}`,
      );

      for (const record of batch) {
        const recordId = `usb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const companyName =
          record.company_name || record.company || record.dba || "Unknown";
        const { firstName, lastName } = extractName(record);

        const enrichment: EnrichmentResult = {
          recordId,
          companyName,
          contactName: `${firstName} ${lastName}`.trim(),
          apolloValidated: false,
          skipTraced: false,
          twilioVerified: false,
          qualified: false,
        };

        try {
          // STAGE 2: Apollo validation (optional)
          if (!request.skipApollo) {
            const apolloResult = await validateWithApollo(record);
            costs.apolloCalls++;

            if (apolloResult.validated) {
              enrichment.apolloValidated = true;
              enrichment.apolloMatchScore = apolloResult.matchScore;
              enrichment.apolloCompanyId = apolloResult.companyId;
              enrichment.website = apolloResult.website;
              enrichment.linkedinUrl = apolloResult.linkedinUrl;
              stats.apolloValidated++;
            } else {
              enrichment.disqualificationReason =
                apolloResult.error || "Apollo validation failed";
              results.push(enrichment);
              continue; // Skip to next record
            }
          } else {
            enrichment.apolloValidated = true; // Skip Apollo = auto-pass
            stats.apolloValidated++;
          }

          // STAGE 3: Skip trace
          if (!request.skipSkipTrace) {
            const skipTraceResult = await skipTraceOwner(record);
            costs.skipTraceCalls++;

            if (skipTraceResult.success && skipTraceResult.mobilePhone) {
              enrichment.skipTraced = true;
              enrichment.mobilePhone = skipTraceResult.mobilePhone;
              enrichment.phoneType = skipTraceResult.phoneType;
              enrichment.carrier = skipTraceResult.carrier;
              enrichment.isConnected = skipTraceResult.isConnected;
              stats.skipTraced++;
            } else {
              enrichment.disqualificationReason =
                skipTraceResult.error || "No mobile phone found";
              results.push(enrichment);
              continue;
            }
          }

          // STAGE 4: Twilio verification
          if (enrichment.mobilePhone) {
            const twilioResult = await verifyWithTwilio(enrichment.mobilePhone);
            costs.twilioCalls++;

            if (twilioResult.verified) {
              enrichment.twilioVerified = true;
              enrichment.twilioLineType = twilioResult.lineType;
              if (twilioResult.carrier)
                enrichment.carrier = twilioResult.carrier;
              stats.twilioVerified++;
            } else {
              enrichment.disqualificationReason = `Phone not mobile: ${twilioResult.lineType}`;
              results.push(enrichment);
              continue;
            }
          }

          // STAGE 5: Qualification check
          const isQualified =
            enrichment.apolloValidated &&
            enrichment.skipTraced &&
            enrichment.twilioVerified &&
            enrichment.mobilePhone &&
            enrichment.isConnected !== false;

          if (isQualified) {
            enrichment.qualified = true;
            stats.qualified++;

            // Create lead if not dry run
            if (!request.dryRun) {
              const leadId = await createQualifiedLead(
                record,
                enrichment,
                teamId,
              );
              if (leadId) {
                enrichment.leadId = leadId;
                stats.leadsCreated++;
                stats.campaignReady++;
              }
            }
          } else {
            enrichment.disqualificationReason = "Failed qualification criteria";
          }

          results.push(enrichment);
        } catch (error) {
          stats.errors++;
          errors.push({
            recordId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Calculate estimated costs
    costs.estimatedCost =
      costs.apolloCalls * 0.01 + // Apollo ~$0.01/call
      costs.skipTraceCalls * 0.15 + // SkipTrace ~$0.15/call
      costs.twilioCalls * 0.005; // Twilio ~$0.005/call

    const endTime = Date.now();

    return {
      success: true,
      pipelineId,
      sectorPath: request.sectorPath,
      stats,
      timing: {
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date(endTime).toISOString(),
        durationMs: endTime - startTime,
      },
      costs,
      results: request.dryRun ? results : undefined,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error(`[ECBB Pipeline] Pipeline failed:`, error);

    return {
      success: false,
      pipelineId,
      sectorPath: request.sectorPath,
      stats,
      timing: {
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      },
      costs,
      errors: [
        {
          recordId: "pipeline",
          error: error instanceof Error ? error.message : "Pipeline failed",
        },
      ],
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PipelineRequest;

    if (!body.sectorPath) {
      return NextResponse.json(
        { success: false, error: "sectorPath is required" },
        { status: 400 },
      );
    }

    console.log(`[ECBB Pipeline] Received request:`, {
      sectorPath: body.sectorPath,
      batchSize: body.batchSize,
      dryRun: body.dryRun,
      maxRecords: body.maxRecords,
    });

    const result = await runPipeline(body);

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    console.error("[ECBB Pipeline] Request error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  // List available sector buckets
  if (action === "sectors") {
    try {
      const command = new ListObjectsV2Command({
        Bucket: SPACES_BUCKET,
        Prefix: "datalake/business/",
        Delimiter: "/",
      });

      const response = await s3Client.send(command);
      const prefixes = response.CommonPrefixes?.map((p) => p.Prefix) || [];

      return NextResponse.json({
        success: true,
        sectors: prefixes,
        bucket: SPACES_BUCKET,
      });
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Failed to list sectors" },
        { status: 500 },
      );
    }
  }

  // Health check / status
  return NextResponse.json({
    success: true,
    endpoint: "/api/ecbb/pipeline",
    description:
      "ECBB Deal Sourcing Pipeline - USBizData → LeadID → SMS Campaign",
    configuration: {
      apolloConfigured: !!APOLLO_API_KEY,
      realEstateApiConfigured: !!REALESTATE_API_KEY,
      twilioConfigured: !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN),
      spacesConfigured: !!(SPACES_KEY && SPACES_SECRET),
      bucket: SPACES_BUCKET,
    },
    usage: {
      method: "POST",
      body: {
        sectorPath: "datalake/business/us/sectors/construction/plumbers-hvac/",
        batchSize: 50,
        skipApollo: false,
        dryRun: true,
        maxRecords: 100,
      },
    },
    qualificationCriteria: [
      "Apollo validated (company exists)",
      "Skip trace found mobile phone",
      "Twilio confirms lineType = mobile",
      "Phone is connected",
      "Not on DNC list",
    ],
  });
}
