/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CORE EXECUTION CHAIN - The Complete Digital Workforce Pipeline
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * THE FLOW:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  DATA IMPORT → ENRICH → PREP → PREVIEW → DEPLOY → RESPONSES → CONVERSION   │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * STAGES:
 * 1. DATA_IMPORT     - Upload CSV from USBizData (1K blocks)
 * 2. ENRICH          - Tracerfy skip trace ($0.02) + Perplexity verify
 * 3. CONTACTABILITY  - Filter by line type (mobile only), validate
 * 4. CAMPAIGN_PREP   - Match ICP/Persona, assign templates
 * 5. PREVIEW         - Review batch before deployment
 * 6. DEPLOY          - Execute SMS via SignalHouse (GIANNA opener)
 * 7. INBOUND         - AI Copilot classifies responses
 * 8. CAPTURE         - Emails, mobiles confirmed, permissions
 * 9. CONVERSION      - Hot Call Queue → 15-min Discovery → Deal
 *
 * BLUEPRINTS:
 * - COLD     → Initial outreach, THE LOOP Day 1-7
 * - WARM     → Engaged leads, THE LOOP Day 7-21
 * - RETENTION → Booked/converted, nurture sequences
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, sql, and, inArray } from "drizzle-orm";
import { sendSMS } from "@/lib/signalhouse/client";
import {
  THE_LOOP,
  CAMPAIGN_MACROS,
  SIGNALHOUSE_10DLC,
  SMS_SEND_DELAY_MS,
  TRACERFY_COST_PER_LEAD,
} from "@/config/constants";
import { SMS_TEMPLATES, renderTemplate, validateCharCount, getTemplate } from "@/config/the-blitz";
import { Logger } from "@/lib/logger";

const log = new Logger("ExecutionChain");

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ExecutionStage =
  | "DATA_IMPORT"
  | "ENRICH"
  | "CONTACTABILITY"
  | "CAMPAIGN_PREP"
  | "PREVIEW"
  | "DEPLOY"
  | "INBOUND"
  | "CAPTURE"
  | "CONVERSION";

export type Blueprint = "COLD" | "WARM" | "RETENTION";

export interface LeadRecord {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  company?: string | null;
  title?: string | null;
  stage: string;
  lineType?: "mobile" | "landline" | "unknown";
  contactable: boolean;
  customFields?: Record<string, unknown>;
}

export interface ExecutionBatch {
  id: string;
  name: string;
  stage: ExecutionStage;
  blueprint: Blueprint;
  leads: LeadRecord[];
  totalLeads: number;
  processedLeads: number;
  successCount: number;
  failCount: number;
  createdAt: Date;
  updatedAt: Date;
  status: "pending" | "processing" | "completed" | "failed";
  metadata: {
    source?: string;
    campaignId?: string;
    personaId?: string;
    templateId?: string;
    enrichmentCost?: number;
  };
}

export interface DeploymentPreview {
  batchId: string;
  totalLeads: number;
  contactableLeads: number;
  mobileLeads: number;
  template: {
    id: string;
    message: string;
    charCount: number;
    compliant: boolean;
  };
  estimatedCost: {
    sms: number;
    enrichment: number;
    total: number;
  };
  sampleMessages: Array<{
    to: string;
    message: string;
    firstName: string;
  }>;
  readyToDeploy: boolean;
  warnings: string[];
}

export interface ExecutionResult {
  success: boolean;
  stage: ExecutionStage;
  batchId: string;
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
  nextStage?: ExecutionStage;
  data?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 1: DATA IMPORT
// ═══════════════════════════════════════════════════════════════════════════════

export async function executeDataImport(
  csvData: Array<Record<string, string>>,
  config: {
    source: string;
    campaignId?: string;
    industryId?: string;
    batchName?: string;
  }
): Promise<ExecutionResult> {
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const errors: string[] = [];
  let succeeded = 0;
  let failed = 0;

  log.info(`[DataImport] Starting import of ${csvData.length} leads`);

  // Process in 1K blocks
  const BLOCK_SIZE = 1000;
  for (let i = 0; i < csvData.length; i += BLOCK_SIZE) {
    const block = csvData.slice(i, i + BLOCK_SIZE);
    const blockNumber = Math.floor(i / BLOCK_SIZE) + 1;

    try {
      const insertData = block.map((row) => ({
        id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        firstName: row.firstName || row.first_name || "",
        lastName: row.lastName || row.last_name || "",
        phone: cleanPhone(row.phone || row.mobile || ""),
        email: row.email || null,
        company: row.company || row.business || null,
        title: row.title || row.job_title || null,
        address: row.address || null,
        city: row.city || null,
        state: row.state || null,
        zip: row.zip || row.zipcode || null,
        source: config.source,
        stage: "data_prep",
        customFields: {
          batchId,
          blockNumber,
          industryId: config.industryId,
          campaignId: config.campaignId,
          importedAt: new Date().toISOString(),
          executionStage: "DATA_IMPORT" as ExecutionStage,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await db.insert(leads).values(insertData);
      succeeded += block.length;
      log.info(`[DataImport] Block ${blockNumber} imported: ${block.length} leads`);
    } catch (error) {
      failed += block.length;
      errors.push(`Block ${blockNumber} failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      log.error(`[DataImport] Block ${blockNumber} failed`, error);
    }
  }

  return {
    success: failed === 0,
    stage: "DATA_IMPORT",
    batchId,
    processed: csvData.length,
    succeeded,
    failed,
    errors,
    nextStage: "ENRICH",
    data: {
      source: config.source,
      campaignId: config.campaignId,
      industryId: config.industryId,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 2: ENRICH (Tracerfy + Perplexity)
// ═══════════════════════════════════════════════════════════════════════════════

export async function executeEnrich(
  batchId: string,
  config: {
    skipTrace: boolean;
    verifyBusiness: boolean;
  } = { skipTrace: true, verifyBusiness: false }
): Promise<ExecutionResult> {
  const errors: string[] = [];
  let succeeded = 0;
  let failed = 0;

  // Get leads from batch
  const batchLeads = await db
    .select()
    .from(leads)
    .where(sql`custom_fields->>'batchId' = ${batchId}`);

  log.info(`[Enrich] Processing ${batchLeads.length} leads from batch ${batchId}`);

  if (config.skipTrace) {
    // Queue for Tracerfy skip trace
    const tracerfyPayload = batchLeads.map((lead) => ({
      firstName: lead.firstName,
      lastName: lead.lastName,
      address: lead.address || "",
      city: lead.city || "",
      state: lead.state || "",
      zip: lead.zip || "",
    }));

    try {
      // Call Tracerfy API
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/skip-trace/tracerfy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: tracerfyPayload,
          webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/skip-trace/tracerfy/webhook`,
          batchId,
        }),
      });

      if (response.ok) {
        succeeded = batchLeads.length;
        log.info(`[Enrich] Skip trace queued for ${batchLeads.length} leads`);
      } else {
        failed = batchLeads.length;
        errors.push("Skip trace API call failed");
      }
    } catch (error) {
      failed = batchLeads.length;
      errors.push(`Skip trace error: ${error instanceof Error ? error.message : "Unknown"}`);
    }
  }

  const enrichmentCost = batchLeads.length * TRACERFY_COST_PER_LEAD;

  return {
    success: failed === 0,
    stage: "ENRICH",
    batchId,
    processed: batchLeads.length,
    succeeded,
    failed,
    errors,
    nextStage: "CONTACTABILITY",
    data: {
      enrichmentCost,
      skipTraceQueued: config.skipTrace,
      verifyQueued: config.verifyBusiness,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 3: CONTACTABILITY - Filter by line type
// ═══════════════════════════════════════════════════════════════════════════════

export async function executeContactability(batchId: string): Promise<ExecutionResult> {
  const errors: string[] = [];
  let mobileCount = 0;
  let landlineCount = 0;
  let unknownCount = 0;

  // Get enriched leads
  const batchLeads = await db
    .select()
    .from(leads)
    .where(sql`custom_fields->>'batchId' = ${batchId}`);

  log.info(`[Contactability] Filtering ${batchLeads.length} leads`);

  for (const lead of batchLeads) {
    const customFields = lead.customFields as Record<string, unknown> || {};
    const lineType = customFields.lineType as string || "unknown";

    // Mark contactability based on line type
    const contactable = lineType.includes("mobile");

    await db
      .update(leads)
      .set({
        customFields: sql`
          jsonb_set(
            jsonb_set(
              COALESCE(custom_fields, '{}'::jsonb),
              '{contactable}',
              ${contactable}::jsonb
            ),
            '{executionStage}',
            '"CONTACTABILITY"'
          )
        `,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, lead.id));

    if (lineType.includes("mobile")) mobileCount++;
    else if (lineType.includes("landline")) landlineCount++;
    else unknownCount++;
  }

  return {
    success: true,
    stage: "CONTACTABILITY",
    batchId,
    processed: batchLeads.length,
    succeeded: mobileCount,
    failed: landlineCount + unknownCount,
    errors,
    nextStage: "CAMPAIGN_PREP",
    data: {
      mobile: mobileCount,
      landline: landlineCount,
      unknown: unknownCount,
      contactableRate: batchLeads.length > 0 ? (mobileCount / batchLeads.length * 100).toFixed(1) : 0,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 4: CAMPAIGN PREP - Match ICP/Persona, assign templates
// ═══════════════════════════════════════════════════════════════════════════════

export async function executeCampaignPrep(
  batchId: string,
  config: {
    personaId: string;
    templateStage: "opener" | "nudge" | "value" | "close";
    campaign: keyof typeof CAMPAIGN_MACROS;
  }
): Promise<ExecutionResult> {
  const errors: string[] = [];

  // Get contactable leads
  const contactableLeads = await db
    .select()
    .from(leads)
    .where(
      sql`custom_fields->>'batchId' = ${batchId} AND (custom_fields->>'contactable')::boolean = true`
    );

  log.info(`[CampaignPrep] Preparing ${contactableLeads.length} contactable leads`);

  // Get template
  const template = getTemplate(config.personaId, config.templateStage);
  if (!template) {
    return {
      success: false,
      stage: "CAMPAIGN_PREP",
      batchId,
      processed: 0,
      succeeded: 0,
      failed: contactableLeads.length,
      errors: [`Template not found for persona ${config.personaId} stage ${config.templateStage}`],
      nextStage: undefined,
    };
  }

  // Validate template compliance
  const validation = validateCharCount(template.message);
  if (!validation.valid) {
    errors.push(`Template exceeds 160 chars: ${validation.count}`);
  }

  // Update leads with campaign assignment
  for (const lead of contactableLeads) {
    await db
      .update(leads)
      .set({
        customFields: sql`
          jsonb_set(
            jsonb_set(
              jsonb_set(
                COALESCE(custom_fields, '{}'::jsonb),
                '{personaId}',
                ${JSON.stringify(config.personaId)}::jsonb
              ),
              '{templateId}',
              ${JSON.stringify(template.id)}::jsonb
            ),
            '{executionStage}',
            '"CAMPAIGN_PREP"'
          )
        `,
        stage: "campaign_ready",
        updatedAt: new Date(),
      })
      .where(eq(leads.id, lead.id));
  }

  return {
    success: errors.length === 0,
    stage: "CAMPAIGN_PREP",
    batchId,
    processed: contactableLeads.length,
    succeeded: contactableLeads.length,
    failed: 0,
    errors,
    nextStage: "PREVIEW",
    data: {
      personaId: config.personaId,
      templateId: template.id,
      templateMessage: template.message,
      charCount: template.charCount,
      campaign: config.campaign,
      campaignId: CAMPAIGN_MACROS[config.campaign].signalhouseCampaignId,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 5: PREVIEW - Review batch before deployment
// ═══════════════════════════════════════════════════════════════════════════════

export async function executePreview(batchId: string): Promise<DeploymentPreview> {
  // Get campaign-ready leads
  const readyLeads = await db
    .select()
    .from(leads)
    .where(
      sql`custom_fields->>'batchId' = ${batchId} AND stage = 'campaign_ready'`
    );

  const warnings: string[] = [];

  // Get template from first lead
  const firstLead = readyLeads[0];
  const customFields = (firstLead?.customFields as Record<string, unknown>) || {};
  const templateId = customFields.templateId as string;
  const template = SMS_TEMPLATES.find((t) => t.id === templateId);

  if (!template) {
    warnings.push("Template not found - needs reconfiguration");
  }

  // Generate sample messages
  const sampleMessages = readyLeads.slice(0, 5).map((lead) => {
    const message = template
      ? renderTemplate(template, {
          firstName: lead.firstName || "there",
          link: process.env.CALENDLY_LINK || "https://calendly.com/nextier",
          industry: (lead.customFields as Record<string, string>)?.industry || "business",
        })
      : "";
    return {
      to: lead.phone,
      message,
      firstName: lead.firstName,
    };
  });

  // Cost estimates
  const smsCount = readyLeads.length;
  const estimatedCost = {
    sms: smsCount * 0.008, // ~$0.008 per SMS
    enrichment: smsCount * TRACERFY_COST_PER_LEAD,
    total: smsCount * 0.008 + smsCount * TRACERFY_COST_PER_LEAD,
  };

  // Compliance check
  const compliant = template ? validateCharCount(template.message).valid : false;
  if (!compliant) {
    warnings.push("Template exceeds 160 characters - will send as multiple segments");
  }

  return {
    batchId,
    totalLeads: readyLeads.length,
    contactableLeads: readyLeads.filter((l) => (l.customFields as Record<string, boolean>)?.contactable).length,
    mobileLeads: readyLeads.length, // All ready leads are mobile
    template: template
      ? {
          id: template.id,
          message: template.message,
          charCount: template.charCount,
          compliant,
        }
      : { id: "", message: "", charCount: 0, compliant: false },
    estimatedCost,
    sampleMessages,
    readyToDeploy: warnings.length === 0 && readyLeads.length > 0,
    warnings,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 6: DEPLOY - Execute SMS via SignalHouse (GIANNA opener)
// ═══════════════════════════════════════════════════════════════════════════════

export async function executeDeploy(
  batchId: string,
  config: {
    dryRun?: boolean;
    limit?: number;
  } = {}
): Promise<ExecutionResult> {
  const errors: string[] = [];
  let succeeded = 0;
  let failed = 0;

  // Get campaign-ready leads
  let readyLeads = await db
    .select()
    .from(leads)
    .where(sql`custom_fields->>'batchId' = ${batchId} AND stage = 'campaign_ready'`);

  if (config.limit) {
    readyLeads = readyLeads.slice(0, config.limit);
  }

  log.info(`[Deploy] Deploying to ${readyLeads.length} leads (dryRun: ${config.dryRun})`);

  for (const lead of readyLeads) {
    const customFields = (lead.customFields as Record<string, unknown>) || {};
    const templateId = customFields.templateId as string;
    const template = SMS_TEMPLATES.find((t) => t.id === templateId);

    if (!template) {
      failed++;
      errors.push(`No template for lead ${lead.id}`);
      continue;
    }

    const message = renderTemplate(template, {
      firstName: lead.firstName || "there",
      link: process.env.CALENDLY_LINK || "https://calendly.com/nextier",
      industry: (customFields.industry as string) || "business",
    });

    if (config.dryRun) {
      log.info(`[Deploy DryRun] Would send to ${lead.phone}: ${message}`);
      succeeded++;
      continue;
    }

    try {
      // Rate limit: 1 SMS per second (75 TPM AT&T limit)
      await new Promise((resolve) => setTimeout(resolve, SMS_SEND_DELAY_MS));

      const result = await sendSMS({
        from: SIGNALHOUSE_10DLC.phoneNumber,
        to: lead.phone,
        message,
      });

      if (result.success) {
        succeeded++;

        // Update lead stage
        await db
          .update(leads)
          .set({
            stage: "contacted",
            customFields: sql`
              jsonb_set(
                jsonb_set(
                  jsonb_set(
                    COALESCE(custom_fields, '{}'::jsonb),
                    '{lastSmsAt}',
                    to_jsonb(${new Date().toISOString()}::text)
                  ),
                  '{messageId}',
                  ${JSON.stringify(result.data?.messageId || "")}::jsonb
                ),
                '{executionStage}',
                '"DEPLOY"'
              )
            `,
            updatedAt: new Date(),
          })
          .where(eq(leads.id, lead.id));
      } else {
        failed++;
        errors.push(`SMS failed for ${lead.phone}: ${result.error}`);
      }
    } catch (error) {
      failed++;
      errors.push(`Error sending to ${lead.phone}: ${error instanceof Error ? error.message : "Unknown"}`);
    }
  }

  return {
    success: failed === 0,
    stage: "DEPLOY",
    batchId,
    processed: readyLeads.length,
    succeeded,
    failed,
    errors,
    nextStage: "INBOUND",
    data: {
      dryRun: config.dryRun,
      smsRate: `${SIGNALHOUSE_10DLC.carrierLimits.att.smsTPM} TPM`,
      fromNumber: SIGNALHOUSE_10DLC.phoneNumber,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLUEPRINT FLOWS - Cold, Warm, Retention
// ═══════════════════════════════════════════════════════════════════════════════

export const BLUEPRINTS = {
  COLD: {
    name: "Cold Outreach",
    description: "Initial outreach to new leads - THE LOOP Day 1-7",
    stages: ["opener", "nudge"] as const,
    loopDays: [1, 3, 5, 7],
    worker: "GIANNA",
    escalateTo: "WARM",
    escalateOn: ["POSITIVE", "QUESTION", "BOOKING_REQUEST"],
  },

  WARM: {
    name: "Warm Engagement",
    description: "Engaged leads showing interest - THE LOOP Day 7-21",
    stages: ["value", "close"] as const,
    loopDays: [7, 10, 14, 21],
    worker: "CATHY",
    escalateTo: "RETENTION",
    escalateOn: ["BOOKING_REQUEST", "APPOINTMENT_SET"],
  },

  RETENTION: {
    name: "Retention & Nurture",
    description: "Booked/converted leads - ongoing nurture",
    stages: ["value"] as const,
    loopDays: [30, 60, 90],
    worker: "SABRINA",
    escalateTo: null,
    escalateOn: [],
  },
} as const;

export function getBlueprint(leadStage: string): Blueprint {
  if (["new", "contacted"].includes(leadStage)) return "COLD";
  if (["engaged", "qualified"].includes(leadStage)) return "WARM";
  return "RETENTION";
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAPTURE - Emails, mobiles confirmed, permissions
// ═══════════════════════════════════════════════════════════════════════════════

export interface CapturedData {
  leadId: string;
  email?: string;
  mobileConfirmed: boolean;
  permissionGranted: boolean;
  confirmationType?: "email_reply" | "sms_confirm" | "form_submit" | "verbal";
  capturedAt: Date;
}

export async function executeCapture(
  leadId: string,
  data: Partial<CapturedData>
): Promise<ExecutionResult> {
  try {
    await db
      .update(leads)
      .set({
        email: data.email || undefined,
        customFields: sql`
          jsonb_set(
            jsonb_set(
              jsonb_set(
                COALESCE(custom_fields, '{}'::jsonb),
                '{mobileConfirmed}',
                ${data.mobileConfirmed || false}::jsonb
              ),
              '{permissionGranted}',
              ${data.permissionGranted || false}::jsonb
            ),
            '{executionStage}',
            '"CAPTURE"'
          )
        `,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, leadId));

    return {
      success: true,
      stage: "CAPTURE",
      batchId: leadId,
      processed: 1,
      succeeded: 1,
      failed: 0,
      errors: [],
      nextStage: "CONVERSION",
      data: {
        email: data.email,
        mobileConfirmed: data.mobileConfirmed,
        permissionGranted: data.permissionGranted,
      },
    };
  } catch (error) {
    return {
      success: false,
      stage: "CAPTURE",
      batchId: leadId,
      processed: 1,
      succeeded: 0,
      failed: 1,
      errors: [error instanceof Error ? error.message : "Capture failed"],
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FULL CHAIN EXECUTION - Run entire pipeline
// ═══════════════════════════════════════════════════════════════════════════════

export async function executeFullChain(
  csvData: Array<Record<string, string>>,
  config: {
    source: string;
    industryId: string;
    campaign: keyof typeof CAMPAIGN_MACROS;
    personaId: string;
    dryRun?: boolean;
  }
): Promise<{
  success: boolean;
  batchId: string;
  stages: ExecutionResult[];
  preview: DeploymentPreview | null;
}> {
  const stages: ExecutionResult[] = [];

  // Stage 1: Data Import
  const importResult = await executeDataImport(csvData, {
    source: config.source,
    campaignId: CAMPAIGN_MACROS[config.campaign].signalhouseCampaignId,
    industryId: config.industryId,
  });
  stages.push(importResult);

  if (!importResult.success) {
    return { success: false, batchId: importResult.batchId, stages, preview: null };
  }

  // Stage 2: Enrich (async - webhook will update)
  const enrichResult = await executeEnrich(importResult.batchId, {
    skipTrace: true,
    verifyBusiness: false,
  });
  stages.push(enrichResult);

  // For now, skip to campaign prep (enrichment is async)
  // In production, wait for webhook or poll

  // Stage 4: Campaign Prep
  const prepResult = await executeCampaignPrep(importResult.batchId, {
    personaId: config.personaId,
    templateStage: "opener",
    campaign: config.campaign,
  });
  stages.push(prepResult);

  if (!prepResult.success) {
    return { success: false, batchId: importResult.batchId, stages, preview: null };
  }

  // Stage 5: Preview
  const preview = await executePreview(importResult.batchId);

  // Stage 6: Deploy (if not dry run and ready)
  if (!config.dryRun && preview.readyToDeploy) {
    const deployResult = await executeDeploy(importResult.batchId, { dryRun: false });
    stages.push(deployResult);
  }

  return {
    success: true,
    batchId: importResult.batchId,
    stages,
    preview,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function cleanPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith("1")) return `+${cleaned}`;
  return cleaned ? `+${cleaned}` : "";
}

log.info("[ExecutionChain] Core Execution Chain loaded");
