/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DATA → SMS PIPELINE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * STREAMLINED FLOW: CSV → LUCI → Tracerfy → Trestle → Filter → SMS Campaign
 *
 * This is THE unified pipeline. No scattered logic. One path.
 *
 * STAGES:
 * 1. INGEST   - Raw CSV parsed, LUCI structures into 2K blocks
 * 2. ENRICH   - Tracerfy skip trace ($0.02/record) → phones + emails
 * 3. SCORE    - Trestle contactability ($0.03/phone) → grade + activity
 * 4. FILTER   - Gate: Grade A/B, Activity 70+, Mobile, No litigators
 * 5. CAMPAIGN - Qualified leads → SignalHouse SMS queue
 *
 * COSTS:
 * - Tracerfy: $0.02/record
 * - Trestle:  $0.03/phone (avg 3 phones = $0.09/record)
 * - Total:    ~$0.11/record enrichment
 * - SMS:      $0.0075/message (SignalHouse 10DLC)
 *
 * CONTACTABILITY GATE (Pre-SMS Filter):
 * - Grade A or B only
 * - Activity Score 70+
 * - Mobile line type only
 * - Name match required
 * - No litigator risk
 * - Expected pass rate: 27-40%
 */

import { LUCI, type CampaignManifest, type ExecutionBlock } from "@/lib/luci";
import { getTracerfyClient, extractPhones, extractEmails } from "@/lib/tracerfy";
import {
  getTrestleClient,
  isPhoneContactable,
  calculateContactabilityScore,
  type TrestleRealContactResponse,
} from "@/lib/trestle";
import { getConfigForPhone, type PhoneCampaignConfig } from "@/lib/sms/compliance/phone-campaign-map";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface RawRecord {
  name?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  sicCode?: string;
  [key: string]: unknown;
}

export interface EnrichedRecord extends RawRecord {
  // Source
  blockId: string;
  rowIndex: number;

  // Tracerfy results
  phones: Array<{
    number: string;
    type: "Mobile" | "Landline" | "VoIP" | "Unknown";
    isPrimary: boolean;
  }>;
  emails: string[];

  // Trestle results (per phone)
  phoneScores: Array<{
    phone: string;
    grade: string | null;
    activityScore: number | null;
    lineType: string | null;
    nameMatch: boolean | null;
    isLitigator: boolean;
    isContactable: boolean;
    contactabilityScore: number;
  }>;

  // Best contactable phone (passes all gates)
  bestPhone: string | null;
  bestPhoneGrade: string | null;
  bestPhoneActivity: number | null;

  // Status
  enrichmentStatus: "pending" | "enriched" | "scored" | "qualified" | "rejected";
  rejectionReason?: string;

  // Cost tracking
  tracerfyCost: number;
  trestleCost: number;
  totalCost: number;
}

export interface QualifiedLead {
  id: string;
  name: string;
  company?: string;
  phone: string; // Best contactable phone
  email?: string;
  grade: string;
  activityScore: number;
  campaignId: string;
  blockId: string;
}

export interface SMSCampaign {
  id: string;
  name: string;
  manifestId: string;
  status: "building" | "ready" | "executing" | "complete";

  // Qualified leads ready for SMS
  leads: QualifiedLead[];
  totalLeads: number;

  // Stats
  stats: {
    totalRecords: number;
    enriched: number;
    scored: number;
    qualified: number;
    rejected: number;
    qualifyRate: number;
  };

  // Costs
  costs: {
    tracerfy: number;
    trestle: number;
    enrichmentTotal: number;
    estimatedSMS: number;
    costPerQualifiedLead: number;
  };

  // SignalHouse config
  signalHouse: {
    campaignId: string;
    brandId: string;
    fromPhone: string;
    tpmLimit: number;
    dailyLimit: number;
  } | null;
}

export interface PipelineConfig {
  // Block size for LUCI
  blockSize: 1000 | 2000;

  // Enrichment
  skipTracerfy: boolean;
  skipTrestle: boolean;

  // Contactability gates
  minGrade: "A" | "B" | "C";
  minActivityScore: number;
  requireMobile: boolean;
  requireNameMatch: boolean;
  blockLitigators: boolean;

  // Rate limits
  tracerfyConcurrency: number;
  trestleConcurrency: number;
  delayBetweenBatches: number;

  // Callbacks
  onBlockStart?: (blockId: string, blockNumber: number, totalBlocks: number) => void;
  onBlockComplete?: (blockId: string, stats: { enriched: number; qualified: number }) => void;
  onProgress?: (stage: string, processed: number, total: number) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════════

export const PIPELINE_DEFAULTS: PipelineConfig = {
  blockSize: 2000,
  skipTracerfy: false,
  skipTrestle: false,
  minGrade: "B",
  minActivityScore: 70,
  requireMobile: true,
  requireNameMatch: true,
  blockLitigators: true,
  tracerfyConcurrency: 10,
  trestleConcurrency: 10,
  delayBetweenBatches: 100,
};

export const COSTS = {
  TRACERFY_PER_RECORD: 0.02,
  TRESTLE_PER_PHONE: 0.03,
  AVG_PHONES_PER_RECORD: 3,
  SMS_PER_MESSAGE: 0.0075,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

export class DataToSMSPipeline {
  private luci: LUCI;
  private config: PipelineConfig;
  private manifest: CampaignManifest | null = null;
  private enrichedRecords: Map<string, EnrichedRecord[]> = new Map();
  private campaign: SMSCampaign | null = null;

  constructor(config: Partial<PipelineConfig> = {}) {
    this.config = { ...PIPELINE_DEFAULTS, ...config };
    this.luci = new LUCI();
  }

  /**
   * STAGE 1: INGEST - Parse CSV and structure into blocks
   */
  async ingest(
    rawRecords: RawRecord[],
    options: { name: string; sourceFile: string }
  ): Promise<CampaignManifest> {
    console.log(`[Pipeline] Ingesting ${rawRecords.length} records...`);

    // LUCI structures into blocks
    this.manifest = this.luci.ingest(
      rawRecords.map((r) => ({
        name: r.name || `${r.firstName || ""} ${r.lastName || ""}`.trim(),
        company: r.company,
        phone: r.phone,
        email: r.email,
        address: r.address,
        city: r.city,
        state: r.state,
        zip: r.zip,
        sicCode: r.sicCode,
      })),
      {
        name: options.name,
        sourceFile: options.sourceFile,
        blockSize: this.config.blockSize,
      }
    );

    // Initialize campaign
    this.campaign = {
      id: `sms_${this.manifest.id}`,
      name: options.name,
      manifestId: this.manifest.id,
      status: "building",
      leads: [],
      totalLeads: 0,
      stats: {
        totalRecords: this.manifest.totalRecords,
        enriched: 0,
        scored: 0,
        qualified: 0,
        rejected: 0,
        qualifyRate: 0,
      },
      costs: {
        tracerfy: 0,
        trestle: 0,
        enrichmentTotal: 0,
        estimatedSMS: 0,
        costPerQualifiedLead: 0,
      },
      signalHouse: null,
    };

    console.log(`[Pipeline] Created manifest: ${this.manifest.id}`);
    console.log(`  - Total records: ${this.manifest.totalRecords}`);
    console.log(`  - Blocks: ${this.manifest.blocks.length}`);
    console.log(`  - Estimated cost: $${this.manifest.estimatedCost.total.toFixed(2)}`);

    return this.manifest;
  }

  /**
   * STAGE 2-4: PROCESS - Enrich, score, and filter each block
   */
  async processAllBlocks(): Promise<SMSCampaign> {
    if (!this.manifest || !this.campaign) {
      throw new Error("Must call ingest() first");
    }

    const totalBlocks = this.manifest.blocks.length;
    let blockNumber = 0;

    // Process blocks sequentially
    while (true) {
      const block = this.luci.getNextBlock(this.manifest.id);
      if (!block) break;

      blockNumber++;
      this.config.onBlockStart?.(block.id, blockNumber, totalBlocks);

      const results = await this.processBlock(block);
      this.enrichedRecords.set(block.id, results.enriched);

      // Update campaign stats
      this.campaign.stats.enriched += results.stats.enriched;
      this.campaign.stats.scored += results.stats.scored;
      this.campaign.stats.qualified += results.stats.qualified;
      this.campaign.stats.rejected += results.stats.rejected;

      // Update costs
      this.campaign.costs.tracerfy += results.costs.tracerfy;
      this.campaign.costs.trestle += results.costs.trestle;

      // Add qualified leads to campaign
      this.campaign.leads.push(...results.qualifiedLeads);

      // Mark block complete
      this.luci.updateBlockStatus(this.manifest.id, block.id, "completed");
      this.config.onBlockComplete?.(block.id, {
        enriched: results.stats.enriched,
        qualified: results.stats.qualified,
      });

      // Delay between blocks
      if (this.config.delayBetweenBatches > 0) {
        await new Promise((r) => setTimeout(r, this.config.delayBetweenBatches));
      }
    }

    // Finalize campaign
    this.campaign.totalLeads = this.campaign.leads.length;
    this.campaign.stats.qualifyRate =
      this.campaign.stats.qualified / this.campaign.stats.totalRecords;
    this.campaign.costs.enrichmentTotal =
      this.campaign.costs.tracerfy + this.campaign.costs.trestle;
    this.campaign.costs.estimatedSMS =
      this.campaign.leads.length * COSTS.SMS_PER_MESSAGE;
    this.campaign.costs.costPerQualifiedLead =
      this.campaign.leads.length > 0
        ? this.campaign.costs.enrichmentTotal / this.campaign.leads.length
        : 0;

    // Get SignalHouse config for default phone
    const signalHouseConfig = getConfigForPhone("15164079249");
    if (signalHouseConfig) {
      this.campaign.signalHouse = {
        campaignId: signalHouseConfig.campaignId,
        brandId: signalHouseConfig.brandId,
        fromPhone: signalHouseConfig.phoneNumber,
        tpmLimit: signalHouseConfig.tpmLimit,
        dailyLimit: signalHouseConfig.dailyLimit,
      };
    }

    this.campaign.status = "ready";

    console.log(`[Pipeline] Campaign ready: ${this.campaign.id}`);
    console.log(`  - Qualified leads: ${this.campaign.totalLeads}`);
    console.log(`  - Qualify rate: ${(this.campaign.stats.qualifyRate * 100).toFixed(1)}%`);
    console.log(`  - Total enrichment cost: $${this.campaign.costs.enrichmentTotal.toFixed(2)}`);
    console.log(`  - Cost per qualified lead: $${this.campaign.costs.costPerQualifiedLead.toFixed(2)}`);

    return this.campaign;
  }

  /**
   * Process a single block through enrichment and scoring
   */
  private async processBlock(block: ExecutionBlock): Promise<{
    enriched: EnrichedRecord[];
    qualifiedLeads: QualifiedLead[];
    stats: { enriched: number; scored: number; qualified: number; rejected: number };
    costs: { tracerfy: number; trestle: number };
  }> {
    const enriched: EnrichedRecord[] = [];
    const qualifiedLeads: QualifiedLead[] = [];
    let tracerfyCost = 0;
    let trestleCost = 0;
    let enrichedCount = 0;
    let scoredCount = 0;
    let qualifiedCount = 0;
    let rejectedCount = 0;

    const tracerfyClient = this.config.skipTracerfy ? null : getTracerfyClient();
    const trestleClient = this.config.skipTrestle ? null : getTrestleClient();

    // Process records in batches
    for (let i = 0; i < block.records.length; i += this.config.tracerfyConcurrency) {
      const batch = block.records.slice(i, i + this.config.tracerfyConcurrency);

      const batchResults = await Promise.all(
        batch.map(async (record, batchIdx) => {
          const rowIndex = i + batchIdx;
          const enrichedRecord: EnrichedRecord = {
            ...record,
            blockId: block.id,
            rowIndex,
            phones: [],
            emails: [],
            phoneScores: [],
            bestPhone: null,
            bestPhoneGrade: null,
            bestPhoneActivity: null,
            enrichmentStatus: "pending",
            tracerfyCost: 0,
            trestleCost: 0,
            totalCost: 0,
          };

          try {
            // STAGE 2: ENRICH (Tracerfy)
            if (tracerfyClient && record.name && record.address) {
              const nameParts = record.name.split(" ");
              const firstName = nameParts[0] || "";
              const lastName = nameParts.slice(1).join(" ") || "";

              const traceResponse = await tracerfyClient.beginTrace(
                [
                  {
                    first_name: firstName,
                    last_name: lastName,
                    address: record.address || "",
                    city: record.city || "",
                    state: record.state || "",
                    zip: record.zip,
                    mail_address: record.address || "",
                    mail_city: record.city || "",
                    mail_state: record.state || "",
                  },
                ],
                "normal"
              );

              const queue = await tracerfyClient.waitForQueue(
                traceResponse.queue_id,
                2000,
                30000
              );

              if (queue.download_url) {
                const results = await tracerfyClient.getQueueResults(
                  traceResponse.queue_id
                );
                if (results.length > 0) {
                  const phones = extractPhones(results[0]);
                  const emails = extractEmails(results[0]);

                  enrichedRecord.phones = phones.map((p, idx) => ({
                    number: p.number,
                    type: p.type as "Mobile" | "Landline" | "VoIP" | "Unknown",
                    isPrimary: idx === 0,
                  }));
                  enrichedRecord.emails = emails;
                }
              }

              enrichedRecord.tracerfyCost = COSTS.TRACERFY_PER_RECORD;
              enrichedRecord.enrichmentStatus = "enriched";
              enrichedCount++;
            } else if (record.phone) {
              // Use existing phone
              enrichedRecord.phones = [
                { number: record.phone, type: "Unknown", isPrimary: true },
              ];
              enrichedRecord.enrichmentStatus = "enriched";
              enrichedCount++;
            }

            // STAGE 3: SCORE (Trestle)
            if (trestleClient && enrichedRecord.phones.length > 0) {
              for (const phone of enrichedRecord.phones) {
                try {
                  const validation = await trestleClient.realContact({
                    name: record.name || "",
                    phone: phone.number,
                    email: enrichedRecord.emails[0],
                    address: record.address
                      ? {
                          street_line_1: record.address,
                          city: record.city,
                          state_code: record.state,
                          postal_code: record.zip,
                          country_code: "US",
                        }
                      : undefined,
                    addOns: ["litigator_checks"],
                  });

                  const isLitigator =
                    validation.addOns?.litigatorChecks?.phoneIsLitigatorRisk ===
                    true;
                  const contactabilityScore = calculateContactabilityScore(validation);
                  const passesGate = this.passesContactabilityGate(validation, isLitigator);

                  enrichedRecord.phoneScores.push({
                    phone: phone.number,
                    grade: validation.phone.contactGrade,
                    activityScore: validation.phone.activityScore,
                    lineType: validation.phone.lineType,
                    nameMatch: validation.phone.nameMatch,
                    isLitigator,
                    isContactable: passesGate,
                    contactabilityScore,
                  });

                  // Update phone type from Trestle
                  if (validation.phone.lineType) {
                    phone.type = this.mapLineType(validation.phone.lineType);
                  }

                  enrichedRecord.trestleCost += COSTS.TRESTLE_PER_PHONE;
                } catch (err) {
                  // Score failed for this phone
                  enrichedRecord.phoneScores.push({
                    phone: phone.number,
                    grade: null,
                    activityScore: null,
                    lineType: null,
                    nameMatch: null,
                    isLitigator: false,
                    isContactable: false,
                    contactabilityScore: 0,
                  });
                }
              }

              enrichedRecord.enrichmentStatus = "scored";
              scoredCount++;
            }

            // STAGE 4: FILTER - Find best contactable phone
            const bestScore = enrichedRecord.phoneScores
              .filter((s) => s.isContactable)
              .sort((a, b) => b.contactabilityScore - a.contactabilityScore)[0];

            if (bestScore) {
              enrichedRecord.bestPhone = bestScore.phone;
              enrichedRecord.bestPhoneGrade = bestScore.grade;
              enrichedRecord.bestPhoneActivity = bestScore.activityScore;
              enrichedRecord.enrichmentStatus = "qualified";
              qualifiedCount++;
            } else {
              enrichedRecord.enrichmentStatus = "rejected";
              enrichedRecord.rejectionReason = this.getRejectionReason(enrichedRecord);
              rejectedCount++;
            }

            enrichedRecord.totalCost =
              enrichedRecord.tracerfyCost + enrichedRecord.trestleCost;
          } catch (err) {
            enrichedRecord.enrichmentStatus = "rejected";
            enrichedRecord.rejectionReason =
              err instanceof Error ? err.message : "Processing error";
            rejectedCount++;
          }

          return enrichedRecord;
        })
      );

      // Collect results
      for (const record of batchResults) {
        enriched.push(record);
        tracerfyCost += record.tracerfyCost;
        trestleCost += record.trestleCost;

        // Create qualified lead if passed gates
        if (record.enrichmentStatus === "qualified" && record.bestPhone) {
          qualifiedLeads.push({
            id: `lead_${block.id}_${record.rowIndex}`,
            name: record.name || "",
            company: record.company,
            phone: record.bestPhone,
            email: record.emails[0],
            grade: record.bestPhoneGrade || "B",
            activityScore: record.bestPhoneActivity || 70,
            campaignId: this.campaign?.id || "",
            blockId: block.id,
          });
        }
      }

      // Progress callback
      this.config.onProgress?.(
        "processing",
        enriched.length,
        block.records.length
      );
    }

    return {
      enriched,
      qualifiedLeads,
      stats: {
        enriched: enrichedCount,
        scored: scoredCount,
        qualified: qualifiedCount,
        rejected: rejectedCount,
      },
      costs: { tracerfy: tracerfyCost, trestle: trestleCost },
    };
  }

  /**
   * CONTACTABILITY GATE - The filter that ensures SMS quality
   */
  private passesContactabilityGate(
    validation: TrestleRealContactResponse,
    isLitigator: boolean
  ): boolean {
    // Gate 1: Grade check
    const allowedGrades =
      this.config.minGrade === "A"
        ? ["A"]
        : this.config.minGrade === "B"
          ? ["A", "B"]
          : ["A", "B", "C"];
    if (
      !validation.phone.contactGrade ||
      !allowedGrades.includes(validation.phone.contactGrade)
    ) {
      return false;
    }

    // Gate 2: Activity score
    if (
      validation.phone.activityScore === null ||
      validation.phone.activityScore < this.config.minActivityScore
    ) {
      return false;
    }

    // Gate 3: Mobile only
    if (this.config.requireMobile) {
      if (validation.phone.lineType !== "Mobile") {
        return false;
      }
    }

    // Gate 4: Name match
    if (this.config.requireNameMatch) {
      if (validation.phone.nameMatch === false) {
        return false;
      }
    }

    // Gate 5: Litigator block
    if (this.config.blockLitigators && isLitigator) {
      return false;
    }

    return true;
  }

  /**
   * Get human-readable rejection reason
   */
  private getRejectionReason(record: EnrichedRecord): string {
    if (record.phones.length === 0) return "No phones found";
    if (record.phoneScores.length === 0) return "No phones scored";

    const reasons: string[] = [];
    for (const score of record.phoneScores) {
      if (score.isLitigator) {
        reasons.push("Litigator risk");
      } else if (score.grade && !["A", "B"].includes(score.grade)) {
        reasons.push(`Low grade (${score.grade})`);
      } else if (score.activityScore !== null && score.activityScore < 70) {
        reasons.push(`Low activity (${score.activityScore})`);
      } else if (score.lineType !== "Mobile") {
        reasons.push(`Not mobile (${score.lineType})`);
      } else if (score.nameMatch === false) {
        reasons.push("Name mismatch");
      }
    }

    return reasons.length > 0 ? reasons[0] : "Did not pass contactability gate";
  }

  /**
   * Map Trestle line type to our enum
   */
  private mapLineType(
    lineType: string
  ): "Mobile" | "Landline" | "VoIP" | "Unknown" {
    if (lineType === "Mobile") return "Mobile";
    if (lineType === "Landline") return "Landline";
    if (lineType.includes("VOIP") || lineType.includes("VoIP")) return "VoIP";
    return "Unknown";
  }

  /**
   * Get current campaign
   */
  getCampaign(): SMSCampaign | null {
    return this.campaign;
  }

  /**
   * Get manifest
   */
  getManifest(): CampaignManifest | null {
    return this.manifest;
  }

  /**
   * Export qualified leads to CSV
   */
  exportLeadsCSV(): string {
    if (!this.campaign) return "";

    const header = [
      "id",
      "name",
      "company",
      "phone",
      "email",
      "grade",
      "activity_score",
      "campaign_id",
    ].join(",");

    const rows = this.campaign.leads.map((lead) =>
      [
        lead.id,
        `"${lead.name}"`,
        lead.company ? `"${lead.company}"` : "",
        lead.phone,
        lead.email || "",
        lead.grade,
        lead.activityScore,
        lead.campaignId,
      ].join(",")
    );

    return [header, ...rows].join("\n");
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * One-shot: CSV → SMS-Ready Campaign
 */
export async function csvToSMSCampaign(
  csvContent: string,
  options: {
    name: string;
    sourceFile: string;
    config?: Partial<PipelineConfig>;
    onProgress?: (stage: string, processed: number, total: number) => void;
  }
): Promise<SMSCampaign> {
  // Parse CSV
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) throw new Error("CSV must have header and at least one row");

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
  const records: RawRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const record: RawRecord = {};

    header.forEach((col, idx) => {
      const value = values[idx]?.trim() || "";
      if (!value) return;

      // Map common column names
      if (["name", "full_name", "contact_name"].includes(col)) record.name = value;
      else if (["first_name", "firstname"].includes(col)) record.firstName = value;
      else if (["last_name", "lastname"].includes(col)) record.lastName = value;
      else if (["company", "company_name", "business_name"].includes(col)) record.company = value;
      else if (["phone", "phone_number", "mobile"].includes(col)) record.phone = value;
      else if (["email", "email_address"].includes(col)) record.email = value;
      else if (["address", "street"].includes(col)) record.address = value;
      else if (col === "city") record.city = value;
      else if (["state", "state_code"].includes(col)) record.state = value;
      else if (["zip", "zipcode", "postal_code"].includes(col)) record.zip = value;
      else if (["sic", "sic_code", "siccode"].includes(col)) record.sicCode = value;
    });

    // Build name from parts if not provided
    if (!record.name && (record.firstName || record.lastName)) {
      record.name = `${record.firstName || ""} ${record.lastName || ""}`.trim();
    }

    // Skip records without name
    if (record.name) {
      records.push(record);
    }
  }

  // Run pipeline
  const pipeline = new DataToSMSPipeline({
    ...options.config,
    onProgress: options.onProgress,
  });

  await pipeline.ingest(records, options);
  return await pipeline.processAllBlocks();
}

/**
 * Parse CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.replace(/^"|"$/g, "").trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.replace(/^"|"$/g, "").trim());

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTIMATE COSTS
// ═══════════════════════════════════════════════════════════════════════════════

export function estimatePipelineCost(recordCount: number): {
  tracerfy: number;
  trestle: number;
  enrichmentTotal: number;
  estimatedQualified: number;
  estimatedSMS: number;
  totalCost: number;
} {
  const tracerfy = recordCount * COSTS.TRACERFY_PER_RECORD;
  const trestle = recordCount * COSTS.AVG_PHONES_PER_RECORD * COSTS.TRESTLE_PER_PHONE;
  const enrichmentTotal = tracerfy + trestle;

  // Expect 27-40% qualify rate, use 33% as estimate
  const estimatedQualified = Math.floor(recordCount * 0.33);
  const estimatedSMS = estimatedQualified * COSTS.SMS_PER_MESSAGE;

  return {
    tracerfy,
    trestle,
    enrichmentTotal,
    estimatedQualified,
    estimatedSMS,
    totalCost: enrichmentTotal + estimatedSMS,
  };
}

console.log("[Data→SMS Pipeline] Loaded - Ready to process campaigns");
