/**
 * LUCI Data Engine Service
 * Pipeline: Import → Tracerfy → Trestle → Ready
 *
 * Daily targets: 2k / 1k / 500 campaign-ready leads
 * Campaign goal: 20,000 scored leads
 *
 * Speed. Fluidity. No fluff.
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import {
  leadsTable,
  dataLakeImportsTable,
  enrichmentJobsTable,
  enrichmentBlocksTable,
} from "@/database/schema-alias";
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  or,
  sql,
} from "drizzle-orm";
import { TracerfyClient, TracerfyRecord } from "./clients/tracerfy.client";
import { TrestleClient, TrestleContactScore } from "./clients/trestle.client";
import {
  LUCI_QUEUE,
  LuciJobs,
  TraceType,
  TraceTypeValue,
  PipelineStatus,
  PipelineStatusValue,
} from "./constants";

export interface PipelineConfig {
  teamId: string;
  dailyTarget: 500 | 1000 | 2000;
  campaignGoal: number; // Default 20000
  traceType: TraceTypeValue;
  minGrade: "A" | "B" | "C"; // Minimum grade for SMS ready
  autoStart: boolean; // Start campaigns immediately when ready
}

export interface PipelineBatch {
  id: string;
  teamId: string;
  status: PipelineStatusValue;
  createdAt: Date;
  completedAt?: Date;
  tracerfyQueueId?: number;
  totalRecords: number;
  tracedCount: number;
  scoredCount: number;
  smsReadyCount: number;
  errors: string[];
}

export interface LeadPipelineStatus {
  leadId: string;
  status: PipelineStatusValue;
  tracedAt?: Date;
  scoredAt?: Date;
  grade?: string;
  smsReady: boolean;
  nextStep: "sms" | "call" | "mail" | "skip" | "pending";
  bestPhone?: string;
  contactabilityScore: number;
  tags: string[];
  flags: string[];
}

@Injectable()
export class LuciService {
  private readonly logger = new Logger(LuciService.name);

  constructor(
    @InjectQueue(LUCI_QUEUE) private luciQueue: Queue,
    @InjectDB() private db: DrizzleClient,
    private tracerfy: TracerfyClient,
    private trestle: TrestleClient,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // PIPELINE CONTROL
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Start full pipeline from CSV upload
   * Plumbing list, consultant list, whatever you got
   */
  async startPipeline(
    teamId: string,
    csvBuffer: Buffer,
    columnMapping: {
      address: string;
      city: string;
      state: string;
      zip?: string;
      firstName: string;
      lastName: string;
      mailAddress: string;
      mailCity: string;
      mailState: string;
      mailingZip?: string;
    },
    config?: Partial<PipelineConfig>,
  ): Promise<PipelineBatch> {
    const batchId = crypto.randomUUID();
    const pipelineConfig: PipelineConfig = {
      teamId,
      dailyTarget: config?.dailyTarget || 2000,
      campaignGoal: config?.campaignGoal || 20000,
      traceType: config?.traceType || TraceType.NORMAL,
      minGrade: config?.minGrade || "B",
      autoStart: config?.autoStart ?? true,
    };

    this.logger.log(
      `Starting pipeline ${batchId} for team ${teamId} (target: ${pipelineConfig.dailyTarget}/day)`,
    );

    // Queue the full pipeline job
    await this.luciQueue.add(
      LuciJobs.FULL_PIPELINE,
      {
        batchId,
        teamId,
        csvBuffer: csvBuffer.toString("base64"),
        columnMapping,
        config: pipelineConfig,
      },
      {
        jobId: batchId,
        removeOnComplete: 50,
        removeOnFail: 20,
        attempts: 3,
        backoff: { type: "exponential", delay: 10000 },
      },
    );

    return {
      id: batchId,
      teamId,
      status: PipelineStatus.PENDING,
      createdAt: new Date(),
      totalRecords: 0,
      tracedCount: 0,
      scoredCount: 0,
      smsReadyCount: 0,
      errors: [],
    };
  }

  /**
   * Process Tracerfy skip trace
   * Returns traced records with contact info
   */
  async runSkipTrace(
    csvBuffer: Buffer,
    columnMapping: {
      address: string;
      city: string;
      state: string;
      zip?: string;
      firstName: string;
      lastName: string;
      mailAddress: string;
      mailCity: string;
      mailState: string;
      mailingZip?: string;
    },
    traceType: TraceTypeValue = TraceType.NORMAL,
  ): Promise<{ queueId: number; records: TracerfyRecord[] }> {
    // Start trace
    const traceResult = await this.tracerfy.beginTrace({
      csvBuffer,
      columnMapping,
      traceType,
    });

    this.logger.log(
      `Tracerfy queue ${traceResult.queue_id} created (${traceResult.rows_uploaded} rows)`,
    );

    // Wait for completion
    await this.tracerfy.waitForQueue(traceResult.queue_id);

    // Fetch results
    const records = await this.tracerfy.getQueue(traceResult.queue_id);

    this.logger.log(
      `Tracerfy trace complete: ${records.length} records returned`,
    );

    return {
      queueId: traceResult.queue_id,
      records,
    };
  }

  /**
   * Score traced records with Trestle
   * Returns contactability scores and grades
   */
  async runScoring(
    records: TracerfyRecord[],
    teamId: string,
  ): Promise<TrestleContactScore[]> {
    // Extract phones from Tracerfy records
    const phonesToScore = records.map((record, idx) => ({
      leadId: `${teamId}-${idx}`,
      phones: this.tracerfy.extractPhones(record),
    }));

    // Batch score with Trestle
    const scoreResult = await this.trestle.batchScore({
      phones: phonesToScore,
    });

    this.logger.log(
      `Trestle scoring complete: ${scoreResult.summary.smsReadyCount} SMS-ready of ${scoreResult.totalRecords}`,
    );

    return scoreResult.results;
  }

  /**
   * Execute full pipeline: Trace → Score → Tag → Route
   */
  async executePipeline(
    teamId: string,
    csvBuffer: Buffer,
    columnMapping: {
      address: string;
      city: string;
      state: string;
      zip?: string;
      firstName: string;
      lastName: string;
      mailAddress: string;
      mailCity: string;
      mailState: string;
      mailingZip?: string;
    },
    config: PipelineConfig,
  ): Promise<{
    traced: TracerfyRecord[];
    scored: TrestleContactScore[];
    smsReady: TrestleContactScore[];
    stats: {
      totalRecords: number;
      tracedCount: number;
      scoredCount: number;
      smsReadyCount: number;
      gradeDistribution: Record<string, number>;
    };
  }> {
    // Step 1: Skip Trace
    this.logger.log(`[LUCI] Step 1: Running Tracerfy skip trace...`);
    const { records: traced } = await this.runSkipTrace(
      csvBuffer,
      columnMapping,
      config.traceType,
    );

    // Step 2: Score
    this.logger.log(`[LUCI] Step 2: Running Trestle scoring...`);
    const scored = await this.runScoring(traced, teamId);

    // Step 3: Filter SMS-ready up to daily target
    this.logger.log(
      `[LUCI] Step 3: Filtering to daily target ${config.dailyTarget}...`,
    );
    const smsReady = this.trestle.getCampaignReady(scored, config.dailyTarget);

    // Step 4: Tag and flag
    this.logger.log(`[LUCI] Step 4: Tagging and flagging...`);
    await this.tagAndFlagLeads(teamId, traced, scored, smsReady);

    // Calculate stats
    const gradeDistribution: Record<string, number> = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      F: 0,
    };
    for (const score of scored) {
      gradeDistribution[score.overallGrade]++;
    }

    return {
      traced,
      scored,
      smsReady,
      stats: {
        totalRecords: traced.length,
        tracedCount: traced.length,
        scoredCount: scored.length,
        smsReadyCount: smsReady.length,
        gradeDistribution,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TAGGING & FLAGGING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Tag and flag leads based on scoring results
   * Flagged, tagged, and updated
   */
  async tagAndFlagLeads(
    teamId: string,
    traced: TracerfyRecord[],
    scored: TrestleContactScore[],
    smsReady: TrestleContactScore[],
  ): Promise<void> {
    const smsReadyIds = new Set(smsReady.map((s) => s.leadId));

    for (let i = 0; i < scored.length; i++) {
      const score = scored[i];
      const record = traced[i];

      // Determine tags
      const tags: string[] = [];
      tags.push(`grade:${score.overallGrade}`);
      tags.push(`score:${score.contactabilityScore}`);

      if (score.smsReady) tags.push("sms-ready");
      if (score.bestPhone?.type === "mobile") tags.push("has-mobile");
      if (score.contactabilityScore >= 80) tags.push("high-contactability");

      // Determine flags
      const flags: string[] = [];
      if (score.overallGrade === "F") flags.push("low-quality");
      if (!score.smsReady && !score.phones.some((p) => p.valid))
        flags.push("no-valid-phones");
      if (smsReadyIds.has(score.leadId)) flags.push("campaign-ready");

      // Next step logic
      const nextStep = this.determineNextStep(score);

      // Update lead in database (if exists)
      try {
        await this.db
          .update(leadsTable)
          .set({
            phoneActivityScore: score.contactabilityScore,
            phoneContactGrade: score.overallGrade,
            smsReady: score.smsReady,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(leadsTable.teamId, teamId),
              or(
                eq(leadsTable.phone, score.bestPhone?.phone || ""),
                eq(leadsTable.email, record?.email_1 || ""),
              ),
            ),
          );
      } catch (err) {
        // Lead might not exist yet - that's OK
        this.logger.debug(`Could not update lead ${score.leadId}: ${err}`);
      }
    }
  }

  /**
   * Determine next step for a lead
   */
  private determineNextStep(
    score: TrestleContactScore,
  ): "sms" | "call" | "mail" | "skip" {
    return score.recommendation;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROGRESS TRACKING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get campaign progress toward 20k goal
   */
  async getCampaignProgress(teamId: string): Promise<{
    goal: number;
    current: number;
    remaining: number;
    percentComplete: number;
    dailyTarget: number;
    daysRemaining: number;
    smsReadyCount: number;
    gradeDistribution: Record<string, number>;
  }> {
    // Count scored leads
    const [scoredResult] = await this.db
      .select({ total: count() })
      .from(leadsTable)
      .where(
        and(
          eq(leadsTable.teamId, teamId),
          isNotNull(leadsTable.phoneActivityScore),
        ),
      );

    const [smsReadyResult] = await this.db
      .select({ total: count() })
      .from(leadsTable)
      .where(and(eq(leadsTable.teamId, teamId), eq(leadsTable.smsReady, true)));

    // Get grade distribution
    const gradeResults = await this.db
      .select({
        grade: leadsTable.phoneContactGrade,
        count: count(),
      })
      .from(leadsTable)
      .where(
        and(
          eq(leadsTable.teamId, teamId),
          isNotNull(leadsTable.phoneContactGrade),
        ),
      )
      .groupBy(leadsTable.phoneContactGrade);

    const gradeDistribution: Record<string, number> = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      F: 0,
    };
    for (const row of gradeResults) {
      if (row.grade) {
        gradeDistribution[row.grade] = Number(row.count);
      }
    }

    const goal = 20000;
    const dailyTarget = 2000;
    const scored = Number(scoredResult?.total || 0);
    const remaining = Math.max(0, goal - scored);
    const daysRemaining = Math.ceil(remaining / dailyTarget);

    return {
      goal,
      current: scored,
      remaining,
      percentComplete: Math.round((scored / goal) * 100),
      dailyTarget,
      daysRemaining,
      smsReadyCount: Number(smsReadyResult?.total || 0),
      gradeDistribution,
    };
  }

  /**
   * Get batch status
   */
  async getBatchStatus(batchId: string): Promise<PipelineBatch | null> {
    const job = await this.luciQueue.getJob(batchId);
    if (!job) return null;

    const state = await job.getState();
    const data = job.data as {
      teamId: string;
      stats?: {
        totalRecords: number;
        tracedCount: number;
        scoredCount: number;
        smsReadyCount: number;
      };
    };

    return {
      id: batchId,
      teamId: data.teamId,
      status: this.mapJobState(state),
      createdAt: new Date(job.timestamp),
      completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      totalRecords: data.stats?.totalRecords || 0,
      tracedCount: data.stats?.tracedCount || 0,
      scoredCount: data.stats?.scoredCount || 0,
      smsReadyCount: data.stats?.smsReadyCount || 0,
      errors: job.failedReason ? [job.failedReason] : [],
    };
  }

  private mapJobState(state: string): PipelineStatusValue {
    switch (state) {
      case "waiting":
      case "delayed":
        return PipelineStatus.PENDING;
      case "active":
        return PipelineStatus.TRACING;
      case "completed":
        return PipelineStatus.READY;
      case "failed":
        return PipelineStatus.FAILED;
      default:
        return PipelineStatus.PENDING;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get Tracerfy account stats
   */
  async getTracerfyAnalytics(): Promise<{
    totalQueues: number;
    propertiesTraced: number;
    queuesPending: number;
    queuesCompleted: number;
    balance: number;
  }> {
    const analytics = await this.tracerfy.getAnalytics();

    return {
      totalQueues: analytics.total_queues,
      propertiesTraced: analytics.properties_traced,
      queuesPending: analytics.queues_pending,
      queuesCompleted: analytics.queues_completed,
      balance: analytics.balance,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEAD LAB - MANUAL REVIEW
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get leads for Lead Lab - sorted by priority
   * Highest scored mobiles first
   */
  async getLeadLabLeads(
    teamId: string,
    options?: {
      status?: "scored" | "ready" | "campaign";
      minGrade?: "A" | "B" | "C";
      limit?: number;
      offset?: number;
    },
  ): Promise<{
    leads: Array<{
      id: string;
      leadId: string | null;
      name: string;
      company: string | null;
      phone: string | null;
      phoneGrade: string | null;
      contactScore: number | null;
      smsReady: boolean;
      priorityTier: number;
      status: string;
    }>;
    total: number;
    stats: {
      gradeA: number;
      gradeB: number;
      gradeC: number;
      smsReady: number;
    };
  }> {
    // Build where conditions
    const conditions = [
      eq(leadsTable.teamId, teamId),
      isNotNull(leadsTable.phoneActivityScore),
    ];

    // Filter by grade
    if (options?.minGrade) {
      const grades =
        options.minGrade === "A"
          ? ["A"]
          : options.minGrade === "B"
            ? ["A", "B"]
            : ["A", "B", "C"];
      conditions.push(inArray(leadsTable.phoneContactGrade, grades));
    }

    // Filter by status
    if (options?.status === "ready") {
      conditions.push(eq(leadsTable.smsReady, true));
    }

    // Get leads sorted by priority (contactScore DESC, mobile phones first)
    const leads = await this.db
      .select({
        id: leadsTable.id,
        leadId: leadsTable.leadId,
        firstName: leadsTable.firstName,
        lastName: leadsTable.lastName,
        company: leadsTable.company,
        phone: leadsTable.phone,
        phoneGrade: leadsTable.phoneContactGrade,
        contactScore: leadsTable.phoneActivityScore,
        smsReady: leadsTable.smsReady,
        status: leadsTable.status,
      })
      .from(leadsTable)
      .where(and(...conditions))
      .orderBy(
        desc(leadsTable.phoneActivityScore),
        leadsTable.phoneContactGrade,
      )
      .limit(options?.limit || 100)
      .offset(options?.offset || 0);

    // Get total count
    const [totalResult] = await this.db
      .select({ total: count() })
      .from(leadsTable)
      .where(and(...conditions));

    // Get stats
    const [gradeAResult] = await this.db
      .select({ total: count() })
      .from(leadsTable)
      .where(
        and(
          eq(leadsTable.teamId, teamId),
          eq(leadsTable.phoneContactGrade, "A"),
        ),
      );

    const [gradeBResult] = await this.db
      .select({ total: count() })
      .from(leadsTable)
      .where(
        and(
          eq(leadsTable.teamId, teamId),
          eq(leadsTable.phoneContactGrade, "B"),
        ),
      );

    const [gradeCResult] = await this.db
      .select({ total: count() })
      .from(leadsTable)
      .where(
        and(
          eq(leadsTable.teamId, teamId),
          eq(leadsTable.phoneContactGrade, "C"),
        ),
      );

    const [smsReadyResult] = await this.db
      .select({ total: count() })
      .from(leadsTable)
      .where(and(eq(leadsTable.teamId, teamId), eq(leadsTable.smsReady, true)));

    return {
      leads: leads.map((lead) => ({
        id: lead.id,
        leadId: lead.leadId || null,
        name:
          `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || "Unknown",
        company: lead.company,
        phone: lead.phone,
        phoneGrade: lead.phoneGrade || null,
        contactScore: lead.contactScore || null,
        smsReady: lead.smsReady || false,
        priorityTier: this.calculatePriorityTier(
          lead.phoneGrade,
          lead.contactScore,
        ),
        status: lead.status || "scored",
      })),
      total: Number(totalResult?.total || 0),
      stats: {
        gradeA: Number(gradeAResult?.total || 0),
        gradeB: Number(gradeBResult?.total || 0),
        gradeC: Number(gradeCResult?.total || 0),
        smsReady: Number(smsReadyResult?.total || 0),
      },
    };
  }

  /**
   * Calculate priority tier for a lead
   * Tier 1: Grade A, score >= 90
   * Tier 2: Grade A, score >= 70
   * Tier 3: Grade B, score >= 70
   * Tier 4+: Everything else
   */
  private calculatePriorityTier(
    grade: string | null,
    score: number | null,
  ): number {
    if (!grade || score === null) return 6;

    if (grade === "A" && score >= 90) return 1;
    if (grade === "A" && score >= 70) return 2;
    if (grade === "B" && score >= 70) return 3;
    if (grade === "A") return 4;
    if (grade === "B") return 5;
    return 6;
  }

  /**
   * Push selected leads to campaign
   * Manual selection from Lead Lab
   */
  async pushToCampaign(
    teamId: string,
    leadIds: string[],
    campaignId: string,
  ): Promise<{
    pushed: number;
    failed: number;
    errors: string[];
  }> {
    let pushed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const leadId of leadIds) {
      try {
        // Update lead status
        const result = await this.db
          .update(leadsTable)
          .set({
            status: "campaign",
            campaignId,
            enrichmentStatus: "campaign",
            updatedAt: new Date(),
          })
          .where(and(eq(leadsTable.id, leadId), eq(leadsTable.teamId, teamId)))
          .returning({ id: leadsTable.id });

        if (result.length > 0) {
          pushed++;
        } else {
          failed++;
          errors.push(`Lead ${leadId}: Not found`);
        }
      } catch (err) {
        failed++;
        errors.push(
          `Lead ${leadId}: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      }
    }

    this.logger.log(
      `[LUCI] Pushed ${pushed} leads to campaign ${campaignId} (${failed} failed)`,
    );

    return { pushed, failed, errors };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // IMPORT - Parse CSV and Insert
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Import leads from CSV with USBizData column mapping
   */
  async importFromCSV(
    teamId: string,
    csvData: string,
    sectorTag: string,
    sicCode?: string,
  ): Promise<{
    imported: number;
    failed: number;
    jobId: string;
  }> {
    // Parse CSV
    const lines = csvData.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

    // USBizData column mapping
    const colMap = {
      companyName: headers.indexOf("company name"),
      address: headers.indexOf("address"),
      city: headers.indexOf("city"),
      state: headers.indexOf("state"),
      zip: headers.indexOf("zip"),
      county: headers.indexOf("county"),
      contactFirst: headers.indexOf("contact first"),
      contactLast: headers.indexOf("contact last"),
      title: headers.indexOf("title"),
      website: headers.indexOf("website"),
      employees: headers.indexOf("employees"),
      annualSales: headers.indexOf("annual sales"),
      sicCode: headers.indexOf("sic code"),
      industry: headers.indexOf("industry"),
    };

    let imported = 0;
    let failed = 0;
    const jobId = `import-${Date.now()}`;

    // Create enrichment job
    const [job] = await this.db
      .insert(enrichmentJobsTable)
      .values({
        teamId,
        jobType: "import",
        status: "importing",
        sourceFile: `csv-upload-${Date.now()}`,
        sectorTag,
        sicCode: sicCode || null,
        totalRecords: lines.length - 1,
      })
      .returning();

    // Process rows
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i]
          .split(",")
          .map((v) => v.trim().replace(/^"|"$/g, ""));

        const leadIdCode = sicCode || values[colMap.sicCode] || "0000";
        const uuid6 = crypto.randomUUID().slice(0, 6);

        await this.db.insert(leadsTable).values({
          teamId,
          leadId: `NXT-${leadIdCode}-${uuid6}`,
          enrichmentStatus: "raw",
          company: values[colMap.companyName] || null,
          firstName: values[colMap.contactFirst] || null,
          lastName: values[colMap.contactLast] || null,
          address: values[colMap.address] || null,
          city: values[colMap.city] || null,
          state: values[colMap.state] || null,
          zipCode: values[colMap.zip] || null,
          county: values[colMap.county] || null,
          website: values[colMap.website] || null,
          employees: values[colMap.employees] || null,
          annualSales: values[colMap.annualSales] || null,
          sicCode: values[colMap.sicCode] || sicCode || null,
          sicDescription: values[colMap.industry] || null,
          sourceTag: "usbizdata",
          sectorTag,
          sicTag: values[colMap.sicCode] || sicCode || null,
        });

        imported++;
      } catch (err) {
        this.logger.debug(`Failed to import row ${i}: ${err}`);
        failed++;
      }
    }

    // Update job status
    await this.db
      .update(enrichmentJobsTable)
      .set({
        status: "completed",
        processedRecords: imported,
        failedRecords: failed,
        completedAt: new Date(),
      })
      .where(eq(enrichmentJobsTable.id, job.id));

    this.logger.log(
      `[LUCI] Imported ${imported} leads (${failed} failed) for sector ${sectorTag}`,
    );

    return { imported, failed, jobId: job.id };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUALIFICATION - Apply Rules
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Qualify scored leads based on Trestle grades
   * Ready: Grade A/B, Activity >= 70
   * Reject: Grade D/F, Activity < 50, No phone
   */
  async qualifyLeads(teamId: string): Promise<{
    ready: number;
    rejected: number;
  }> {
    // Mark ready: Grade A/B with activity >= 70
    const readyResult = await this.db
      .update(leadsTable)
      .set({
        enrichmentStatus: "ready",
        smsReady: true,
        readyAt: new Date(),
      })
      .where(
        and(
          eq(leadsTable.teamId, teamId),
          eq(leadsTable.enrichmentStatus, "scored"),
          inArray(leadsTable.phoneContactGrade, ["A", "B"]),
          gte(leadsTable.phoneActivityScore, 70),
        ),
      )
      .returning({ id: leadsTable.id });

    // Mark rejected: Grade D/F OR activity < 50 OR no phone
    const rejectedResult = await this.db
      .update(leadsTable)
      .set({
        enrichmentStatus: "rejected",
        smsReady: false,
      })
      .where(
        and(
          eq(leadsTable.teamId, teamId),
          eq(leadsTable.enrichmentStatus, "scored"),
          or(
            inArray(leadsTable.phoneContactGrade, ["D", "F"]),
            sql`${leadsTable.phoneActivityScore} < 50`,
          ),
        ),
      )
      .returning({ id: leadsTable.id });

    this.logger.log(
      `[LUCI] Qualified: ${readyResult.length} ready, ${rejectedResult.length} rejected`,
    );

    return {
      ready: readyResult.length,
      rejected: rejectedResult.length,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENRICHMENT JOB MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get all enrichment jobs for a team
   */
  async getEnrichmentJobs(teamId: string): Promise<{
    jobs: Array<{
      id: string;
      jobType: string;
      status: string;
      totalRecords: number;
      processedRecords: number;
      createdAt: Date;
    }>;
  }> {
    const jobs = await this.db
      .select()
      .from(enrichmentJobsTable)
      .where(eq(enrichmentJobsTable.teamId, teamId))
      .orderBy(desc(enrichmentJobsTable.createdAt))
      .limit(50);

    return {
      jobs: jobs.map((j) => ({
        id: j.id,
        jobType: j.jobType,
        status: j.status || "pending",
        totalRecords: j.totalRecords || 0,
        processedRecords: j.processedRecords || 0,
        createdAt: j.createdAt,
      })),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA LAKE - Unlimited Imports
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Import to Data Lake - unlimited capacity with DEDUPLICATION
   * Import 300k, whatever. Dedupe before storing.
   *
   * Dedup Logic:
   * 1. In-file dedup: company + address + city + state (normalized)
   * 2. DB dedup: check against existing records for same team
   */
  async importToLake(
    teamId: string,
    csvData: string,
    fileName: string,
    sectorTag: string,
    sicCode?: string,
  ): Promise<{
    lakeId: string;
    imported: number;
    failed: number;
    rawCount: number;
    duplicates: number;
    duplicatesInFile: number;
    duplicatesInDb: number;
  }> {
    const lines = csvData.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

    // USBizData column mapping
    const colMap = {
      companyName: headers.indexOf("company name"),
      address: headers.indexOf("address"),
      city: headers.indexOf("city"),
      state: headers.indexOf("state"),
      zip: headers.indexOf("zip"),
      county: headers.indexOf("county"),
      contactFirst: headers.indexOf("contact first"),
      contactLast: headers.indexOf("contact last"),
      title: headers.indexOf("title"),
      website: headers.indexOf("website"),
      employees: headers.indexOf("employees"),
      annualSales: headers.indexOf("annual sales"),
      sicCode: headers.indexOf("sic code"),
      industry: headers.indexOf("industry"),
    };

    // Create lake import record
    const [lakeImport] = await this.db
      .insert(dataLakeImportsTable)
      .values({
        teamId,
        fileName,
        fileSize: csvData.length,
        totalRecords: lines.length - 1,
        sourceType: "usbizdata",
        sectorTag,
        sicCode: sicCode || null,
        status: "processing",
      })
      .returning();

    // ═══════════════════════════════════════════════════════════════════════════
    // DEDUPLICATION
    // ═══════════════════════════════════════════════════════════════════════════

    // Helper to create normalized dedup key
    const makeDedupeKey = (
      company: string,
      address: string,
      city: string,
      state: string,
    ): string => {
      return [
        (company || "").toLowerCase().replace(/[^a-z0-9]/g, ""),
        (address || "").toLowerCase().replace(/[^a-z0-9]/g, ""),
        (city || "").toLowerCase().replace(/[^a-z0-9]/g, ""),
        (state || "").toLowerCase().replace(/[^a-z]/g, ""),
      ].join("|");
    };

    // Step 1: In-file deduplication
    const seenInFile = new Set<string>();
    const uniqueRows: Array<{
      index: number;
      values: string[];
      dedupeKey: string;
    }> = [];
    let duplicatesInFile = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i]
        .split(",")
        .map((v) => v.trim().replace(/^"|"$/g, ""));
      const dedupeKey = makeDedupeKey(
        values[colMap.companyName],
        values[colMap.address],
        values[colMap.city],
        values[colMap.state],
      );

      if (seenInFile.has(dedupeKey)) {
        duplicatesInFile++;
        continue;
      }

      seenInFile.add(dedupeKey);
      uniqueRows.push({ index: i, values, dedupeKey });
    }

    this.logger.log(
      `[LUCI] In-file dedup: ${lines.length - 1} rows → ${uniqueRows.length} unique (${duplicatesInFile} dups removed)`,
    );

    // Step 2: DB deduplication - get existing records for this team
    const existingLeads = await this.db
      .select({
        company: leadsTable.company,
        address: leadsTable.address,
        city: leadsTable.city,
        state: leadsTable.state,
      })
      .from(leadsTable)
      .where(eq(leadsTable.teamId, teamId));

    const existingKeys = new Set(
      existingLeads.map((l) =>
        makeDedupeKey(
          l.company || "",
          l.address || "",
          l.city || "",
          l.state || "",
        ),
      ),
    );

    this.logger.log(
      `[LUCI] DB has ${existingKeys.size} existing records for dedup check`,
    );

    // Step 3: Import unique, non-duplicate rows
    let imported = 0;
    let failed = 0;
    let duplicatesInDb = 0;

    for (const row of uniqueRows) {
      // Skip if already in DB
      if (existingKeys.has(row.dedupeKey)) {
        duplicatesInDb++;
        continue;
      }

      try {
        const values = row.values;
        const leadIdCode = sicCode || values[colMap.sicCode] || "0000";
        const uuid6 = crypto.randomUUID().slice(0, 6);

        await this.db.insert(leadsTable).values({
          teamId,
          leadId: `NXT-${leadIdCode}-${uuid6}`,
          enrichmentStatus: "raw", // NOT enriched yet - in the lake
          company: values[colMap.companyName] || null,
          firstName: values[colMap.contactFirst] || null,
          lastName: values[colMap.contactLast] || null,
          address: values[colMap.address] || null,
          city: values[colMap.city] || null,
          state: values[colMap.state] || null,
          zipCode: values[colMap.zip] || null,
          county: values[colMap.county] || null,
          website: values[colMap.website] || null,
          employees: values[colMap.employees] || null,
          annualSales: values[colMap.annualSales] || null,
          sicCode: values[colMap.sicCode] || sicCode || null,
          sicDescription: values[colMap.industry] || null,
          sourceTag: "usbizdata",
          sectorTag,
          sicTag: values[colMap.sicCode] || sicCode || null,
        });

        imported++;
        // Add to existing keys to prevent dups within same batch
        existingKeys.add(row.dedupeKey);
      } catch (err) {
        this.logger.debug(`Failed to import row ${row.index}: ${err}`);
        failed++;
      }
    }

    const totalDuplicates = duplicatesInFile + duplicatesInDb;

    // Update lake import record with dedup stats
    await this.db
      .update(dataLakeImportsTable)
      .set({
        status: "completed",
        importedRecords: imported,
        failedRecords: failed,
        rawCount: imported,
      })
      .where(eq(dataLakeImportsTable.id, lakeImport.id));

    this.logger.log(
      `[LUCI] Import complete: ${imported} new | ${totalDuplicates} duplicates (${duplicatesInFile} in file, ${duplicatesInDb} in DB) | ${failed} failed`,
    );

    return {
      lakeId: lakeImport.id,
      imported,
      failed,
      rawCount: imported,
      duplicates: totalDuplicates,
      duplicatesInFile,
      duplicatesInDb,
    };
  }

  /**
   * Get Data Lake stats
   */
  async getLakeStats(teamId: string): Promise<{
    totalImports: number;
    totalRecords: number;
    rawCount: number;
    enrichedCount: number;
    bySector: Array<{ sector: string; count: number }>;
  }> {
    // Get import counts
    const imports = await this.db
      .select()
      .from(dataLakeImportsTable)
      .where(eq(dataLakeImportsTable.teamId, teamId));

    const totalImports = imports.length;
    const totalRecords = imports.reduce(
      (sum, i) => sum + (i.importedRecords || 0),
      0,
    );
    const rawCount = imports.reduce((sum, i) => sum + (i.rawCount || 0), 0);
    const enrichedCount = imports.reduce(
      (sum, i) => sum + (i.enrichedCount || 0),
      0,
    );

    // Group by sector
    const sectorCounts: Record<string, number> = {};
    for (const imp of imports) {
      const sector = imp.sectorTag || "unknown";
      sectorCounts[sector] =
        (sectorCounts[sector] || 0) + (imp.importedRecords || 0);
    }

    return {
      totalImports,
      totalRecords,
      rawCount,
      enrichedCount,
      bySector: Object.entries(sectorCounts).map(([sector, count]) => ({
        sector,
        count,
      })),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ON-DEMAND ENRICHMENT - Pull from Lake to Block
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Pull leads from Data Lake into enrichment block
   * On-demand - only enrich what you need for today's campaign
   *
   * @param dailyTarget - 500, 1000, or 2000 leads to enrich today
   */
  async pullFromLakeToBlock(
    teamId: string,
    dailyTarget: 500 | 1000 | 2000,
    sectorTag?: string,
  ): Promise<{
    blockId: string;
    pulled: number;
    readyForTrace: number;
  }> {
    // Get or create active enrichment block
    let [activeBlock] = await this.db
      .select()
      .from(enrichmentBlocksTable)
      .where(
        and(
          eq(enrichmentBlocksTable.teamId, teamId),
          eq(enrichmentBlocksTable.status, "active"),
        ),
      )
      .limit(1);

    if (!activeBlock) {
      // Create new block
      const blockNumber = 1;
      [activeBlock] = await this.db
        .insert(enrichmentBlocksTable)
        .values({
          teamId,
          blockNumber,
          blockId: `block-${String(blockNumber).padStart(3, "0")}`,
          capacity: 10000,
          status: "active",
        })
        .returning();
    }

    // Check block capacity
    const currentCount =
      (activeBlock.rawCount || 0) +
      (activeBlock.tracedCount || 0) +
      (activeBlock.scoredCount || 0) +
      (activeBlock.readyCount || 0);

    const remainingCapacity = (activeBlock.capacity || 10000) - currentCount;
    const pullCount = Math.min(dailyTarget, remainingCapacity);

    if (pullCount <= 0) {
      this.logger.warn(
        `[LUCI] Block ${activeBlock.blockId} is full. Create new block.`,
      );
      return {
        blockId: activeBlock.id,
        pulled: 0,
        readyForTrace: 0,
      };
    }

    // Build conditions for selecting raw leads
    const conditions = [
      eq(leadsTable.teamId, teamId),
      eq(leadsTable.enrichmentStatus, "raw"),
    ];

    if (sectorTag) {
      conditions.push(eq(leadsTable.sectorTag, sectorTag));
    }

    // Select leads from lake (raw status)
    const leadsToEnrich = await this.db
      .select({ id: leadsTable.id })
      .from(leadsTable)
      .where(and(...conditions))
      .limit(pullCount);

    if (leadsToEnrich.length === 0) {
      this.logger.log(
        `[LUCI] No raw leads available in lake for sector ${sectorTag || "all"}`,
      );
      return {
        blockId: activeBlock.id,
        pulled: 0,
        readyForTrace: 0,
      };
    }

    // Mark leads as "tracing" (pulled into block, ready for Tracerfy)
    const leadIds = leadsToEnrich.map((l) => l.id);
    await this.db
      .update(leadsTable)
      .set({ enrichmentStatus: "traced" }) // Will be "traced" after skip trace
      .where(inArray(leadsTable.id, leadIds));

    // Update block counts
    await this.db
      .update(enrichmentBlocksTable)
      .set({
        rawCount: sql`${enrichmentBlocksTable.rawCount} + ${leadsToEnrich.length}`,
      })
      .where(eq(enrichmentBlocksTable.id, activeBlock.id));

    this.logger.log(
      `[LUCI] Pulled ${leadsToEnrich.length} leads from lake to block ${activeBlock.blockId}`,
    );

    return {
      blockId: activeBlock.id,
      pulled: leadsToEnrich.length,
      readyForTrace: leadsToEnrich.length,
    };
  }

  /**
   * Get enrichment block status
   */
  async getBlockStatus(teamId: string): Promise<{
    activeBlock: {
      id: string;
      blockId: string;
      capacity: number;
      used: number;
      remaining: number;
      raw: number;
      traced: number;
      scored: number;
      ready: number;
    } | null;
    totalBlocks: number;
  }> {
    const blocks = await this.db
      .select()
      .from(enrichmentBlocksTable)
      .where(eq(enrichmentBlocksTable.teamId, teamId))
      .orderBy(desc(enrichmentBlocksTable.createdAt));

    const activeBlock = blocks.find((b) => b.status === "active");

    if (!activeBlock) {
      return { activeBlock: null, totalBlocks: blocks.length };
    }

    const used =
      (activeBlock.rawCount || 0) +
      (activeBlock.tracedCount || 0) +
      (activeBlock.scoredCount || 0) +
      (activeBlock.readyCount || 0);

    return {
      activeBlock: {
        id: activeBlock.id,
        blockId: activeBlock.blockId,
        capacity: activeBlock.capacity || 10000,
        used,
        remaining: (activeBlock.capacity || 10000) - used,
        raw: activeBlock.rawCount || 0,
        traced: activeBlock.tracedCount || 0,
        scored: activeBlock.scoredCount || 0,
        ready: activeBlock.readyCount || 0,
      },
      totalBlocks: blocks.length,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TRACERFY WEBHOOK PROCESSING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Process Tracerfy webhook results
   * Called when Tracerfy completes a queue and POSTs to our webhook
   *
   * @param queueId - Tracerfy queue ID
   * @param csvResults - CSV string from Tracerfy download_url
   * @param traceType - "normal" or "enhanced"
   */
  async processTracerfyResults(
    queueId: number,
    csvResults: string,
    traceType: "normal" | "enhanced",
  ): Promise<{
    updated: number;
    phones: number;
    mobiles: number;
    landlines: number;
    emails: number;
  }> {
    this.logger.log(`[LUCI] Processing Tracerfy results for queue ${queueId}`);

    // Parse CSV results
    const lines = csvResults.trim().split("\n");
    if (lines.length < 2) {
      this.logger.warn(`[LUCI] Empty results from Tracerfy queue ${queueId}`);
      return { updated: 0, phones: 0, mobiles: 0, landlines: 0, emails: 0 };
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

    // Column mapping for Tracerfy results
    const colMap = {
      address: headers.indexOf("address"),
      city: headers.indexOf("city"),
      state: headers.indexOf("state"),
      firstName: headers.indexOf("first_name"),
      lastName: headers.indexOf("last_name"),
      primaryPhone: headers.indexOf("primary_phone"),
      primaryPhoneType: headers.indexOf("primary_phone_type"),
      mobile1: headers.indexOf("mobile_1"),
      mobile2: headers.indexOf("mobile_2"),
      mobile3: headers.indexOf("mobile_3"),
      mobile4: headers.indexOf("mobile_4"),
      mobile5: headers.indexOf("mobile_5"),
      landline1: headers.indexOf("landline_1"),
      landline2: headers.indexOf("landline_2"),
      landline3: headers.indexOf("landline_3"),
      email1: headers.indexOf("email_1"),
      email2: headers.indexOf("email_2"),
      email3: headers.indexOf("email_3"),
      email4: headers.indexOf("email_4"),
      email5: headers.indexOf("email_5"),
    };

    let updated = 0;
    let totalPhones = 0;
    let totalMobiles = 0;
    let totalLandlines = 0;
    let totalEmails = 0;

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i]
        .split(",")
        .map((v) => v.trim().replace(/^"|"$/g, ""));

      const address = values[colMap.address] || "";
      const city = values[colMap.city] || "";
      const state = values[colMap.state] || "";
      const firstName = values[colMap.firstName] || "";
      const lastName = values[colMap.lastName] || "";

      // ═══════════════════════════════════════════════════════════════════════
      // PHONE HIERARCHY FOR SMS:
      // 1. Mobiles first (best for SMS) - mobile_1 through mobile_5
      // 2. Primary phone IF it's mobile type
      // 3. Landlines as fallback (call only)
      // ═══════════════════════════════════════════════════════════════════════
      const mobiles: string[] = [];
      const landlines: string[] = [];

      // Collect mobiles first (priority for SMS)
      for (let m = 1; m <= 5; m++) {
        const mobile =
          values[colMap[`mobile${m}` as keyof typeof colMap] as number];
        if (mobile && !mobiles.includes(mobile)) mobiles.push(mobile);
      }

      // Check if primary phone is mobile type - add to mobiles if so
      const primaryPhone = values[colMap.primaryPhone] || "";
      const primaryPhoneType = (
        values[colMap.primaryPhoneType] || ""
      ).toLowerCase();
      if (
        primaryPhone &&
        primaryPhoneType.includes("mobile") &&
        !mobiles.includes(primaryPhone)
      ) {
        mobiles.unshift(primaryPhone); // Put at front if mobile
      }

      // Collect landlines (fallback for calls)
      for (let l = 1; l <= 3; l++) {
        const landline =
          values[colMap[`landline${l}` as keyof typeof colMap] as number];
        if (landline && !landlines.includes(landline)) landlines.push(landline);
      }

      // If primary phone is landline, add to landlines
      if (
        primaryPhone &&
        !primaryPhoneType.includes("mobile") &&
        !landlines.includes(primaryPhone)
      ) {
        landlines.unshift(primaryPhone);
      }

      // Combined phones: mobiles first, then landlines
      const phones = [...mobiles, ...landlines];

      // Best phone for SMS = first mobile, fallback to primary, then any phone
      const bestPhoneForSms =
        mobiles[0] ||
        (primaryPhoneType.includes("mobile") ? primaryPhone : null) ||
        phones[0] ||
        null;

      // Collect emails
      const emails: string[] = [];
      for (let e = 1; e <= 5; e++) {
        const email =
          values[colMap[`email${e}` as keyof typeof colMap] as number];
        if (email && !emails.includes(email)) emails.push(email);
      }

      totalPhones += phones.length;
      totalMobiles += mobiles.length;
      totalLandlines += landlines.length;
      totalEmails += emails.length;

      // Find and update matching lead by address + name
      try {
        const result = await this.db
          .update(leadsTable)
          .set({
            enrichmentStatus: "traced",
            primaryPhone: values[colMap.primaryPhone] || null,
            primaryPhoneType: values[colMap.primaryPhoneType] || null,
            mobile1: values[colMap.mobile1] || null,
            mobile2: values[colMap.mobile2] || null,
            mobile3: values[colMap.mobile3] || null,
            mobile4: values[colMap.mobile4] || null,
            mobile5: values[colMap.mobile5] || null,
            landline1: values[colMap.landline1] || null,
            landline2: values[colMap.landline2] || null,
            landline3: values[colMap.landline3] || null,
            email1: values[colMap.email1] || null,
            email2: values[colMap.email2] || null,
            email3: values[colMap.email3] || null,
            email4: values[colMap.email4] || null,
            email5: values[colMap.email5] || null,
            // Set best phone for SMS (mobile-first hierarchy)
            phone: bestPhoneForSms,
            email: emails[0] || null,
            tracerfyQueueId: queueId,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(leadsTable.address, address),
              eq(leadsTable.city, city),
              eq(leadsTable.state, state),
              eq(leadsTable.firstName, firstName),
              eq(leadsTable.lastName, lastName),
            ),
          )
          .returning({ id: leadsTable.id });

        if (result.length > 0) {
          updated++;
        }
      } catch (err) {
        this.logger.debug(`Failed to update lead for row ${i}: ${err}`);
      }
    }

    this.logger.log(
      `[LUCI] Tracerfy webhook processed: ${updated} leads updated, ${totalMobiles} mobiles, ${totalLandlines} landlines, ${totalEmails} emails`,
    );

    return {
      updated,
      phones: totalPhones,
      mobiles: totalMobiles,
      landlines: totalLandlines,
      emails: totalEmails,
    };
  }

  /**
   * Minimum records for Tracerfy skip trace
   */
  static readonly TRACERFY_MIN_RECORDS = 10;

  // ═══════════════════════════════════════════════════════════════════════════
  // SELECTED LEAD ENRICHMENT (UI-triggered)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Enrich selected leads from Lead Lab UI
   * Chains: Tracerfy skip trace → Trestle scoring
   *
   * @param teamId - Team context
   * @param leadIds - Array of lead ULIDs to enrich
   * @param mode - 'full' (trace + score) or 'score_only'
   */
  async enrichSelectedLeads(
    teamId: string,
    leadIds: string[],
    mode: "full" | "validate_only" | "score_only",
  ): Promise<{ jobId: string; status: string }> {
    this.logger.log(
      `[LUCI] Starting enrichment for ${leadIds.length} leads, mode=${mode}`,
    );

    // Create enrichment job record
    const [job] = await this.db
      .insert(enrichmentJobsTable)
      .values({
        teamId,
        jobType:
          mode === "full" || mode === "validate_only"
            ? "full_pipeline"
            : "score",
        status: "active",
        totalRecords: leadIds.length,
        processedRecords: 0,
        successRecords: 0,
        failedRecords: 0,
      })
      .returning();

    // Queue the job for async processing
    await this.luciQueue.add(
      LuciJobs.ENRICH_SELECTED,
      {
        jobId: job.id,
        teamId,
        leadIds,
        mode,
        source: "lead_lab_ui",
      },
      {
        jobId: job.id,
        removeOnComplete: 50,
        removeOnFail: 20,
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      },
    );

    return { jobId: job.id, status: "pending" };
  }

  /**
   * Get enrichment job status for polling
   */
  async getEnrichmentJobStatus(
    jobId: string,
    teamId: string,
  ): Promise<{
    jobId: string;
    status: string;
    total: number;
    traced: number;
    scored: number;
    smsReady: number;
    tracerfyQueueId: number | null;
    startedAt: Date | null;
    completedAt: Date | null;
    error: string | null;
  } | null> {
    const [job] = await this.db
      .select()
      .from(enrichmentJobsTable)
      .where(
        and(
          eq(enrichmentJobsTable.id, jobId),
          eq(enrichmentJobsTable.teamId, teamId),
        ),
      );

    if (!job) return null;

    return {
      jobId: job.id,
      status: job.status || "pending",
      total: job.totalRecords || 0,
      traced: job.processedRecords || 0,
      scored: job.successRecords || 0,
      smsReady: job.successRecords || 0, // Simplified - actual SMS-ready count
      tracerfyQueueId: job.tracerfyQueueId || null,
      startedAt: job.startedAt || null,
      completedAt: job.completedAt || null,
      error: job.errorMessage || null,
    };
  }

  /**
   * Execute enrichment for selected leads (called by consumer)
   * Full pipeline: Tracerfy → Trestle → Update DB
   */
  async executeSelectedLeadEnrichment(
    jobId: string,
    teamId: string,
    leadIds: string[],
    mode: "full" | "validate_only" | "score_only",
  ): Promise<{
    traced: number;
    scored: number;
    smsReady: number;
  }> {
    this.logger.log(`[LUCI] Executing enrichment job ${jobId}`);

    // Get leads from DB
    const leads = await this.db
      .select()
      .from(leadsTable)
      .where(
        and(eq(leadsTable.teamId, teamId), inArray(leadsTable.id, leadIds)),
      );

    if (leads.length === 0) {
      throw new Error("No leads found for enrichment");
    }

    let tracedCount = 0;
    let scoredCount = 0;
    let smsReadyCount = 0;

    // Step 1: Tracerfy skip trace (if full or validate_only mode)
    if (mode === "full" || mode === "validate_only") {
      await this.db
        .update(enrichmentJobsTable)
        .set({ status: "tracing" })
        .where(eq(enrichmentJobsTable.id, jobId));

      // Prepare data for Tracerfy
      const traceInput = leads.map((l) => ({
        first_name: l.firstName || "",
        last_name: l.lastName || "",
        address: l.address || "",
        city: l.city || "",
        state: l.state || "",
        zip: l.zipCode || "",
        mail_address: l.address || "",
        mail_city: l.city || "",
        mail_state: l.state || "",
        mailing_zip: l.zipCode || "",
      }));

      // Start trace via Tracerfy client
      const traceResult = await this.tracerfy.beginTrace({
        jsonData: traceInput,
        columnMapping: {
          address: "address",
          city: "city",
          state: "state",
          zip: "zip",
          firstName: "first_name",
          lastName: "last_name",
          mailAddress: "mail_address",
          mailCity: "mail_city",
          mailState: "mail_state",
          mailingZip: "mailing_zip",
        },
        traceType: "normal",
      });

      // Update job with queue ID
      await this.db
        .update(enrichmentJobsTable)
        .set({ tracerfyQueueId: traceResult.queue_id })
        .where(eq(enrichmentJobsTable.id, jobId));

      this.logger.log(
        `[LUCI] Tracerfy queue ${traceResult.queue_id} created for job ${jobId}`,
      );

      // Wait for Tracerfy to complete
      await this.tracerfy.waitForQueue(traceResult.queue_id);

      // Get results
      const tracedRecords = await this.tracerfy.getQueue(traceResult.queue_id);

      // Update leads with phone/email data
      for (const record of tracedRecords) {
        const phones = this.tracerfy.extractPhones(record);
        const emails = this.tracerfy.extractEmails(record);
        const bestPhone = phones[0] || null;

        // Match by address + name
        await this.db
          .update(leadsTable)
          .set({
            enrichmentStatus: "traced",
            primaryPhone: record.primary_phone || null,
            primaryPhoneType: record.primary_phone_type || null,
            mobile1: record.mobile_1 || null,
            mobile2: record.mobile_2 || null,
            mobile3: record.mobile_3 || null,
            landline1: record.landline_1 || null,
            landline2: record.landline_2 || null,
            landline3: record.landline_3 || null,
            email1: record.email_1 || null,
            email2: record.email_2 || null,
            email3: record.email_3 || null,
            phone: bestPhone,
            email: emails[0] || null,
            tracerfyQueueId: traceResult.queue_id,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(leadsTable.teamId, teamId),
              eq(leadsTable.address, record.address || ""),
              eq(leadsTable.firstName, record.first_name || ""),
              eq(leadsTable.lastName, record.last_name || ""),
            ),
          );

        tracedCount++;
      }

      // Update job progress
      await this.db
        .update(enrichmentJobsTable)
        .set({ processedRecords: tracedCount })
        .where(eq(enrichmentJobsTable.id, jobId));
    }

    // Step 2: Trestle scoring/validation
    await this.db
      .update(enrichmentJobsTable)
      .set({ status: "scoring" })
      .where(eq(enrichmentJobsTable.id, jobId));

    // Re-fetch leads to get phone data
    const leadsToScore = await this.db
      .select()
      .from(leadsTable)
      .where(
        and(eq(leadsTable.teamId, teamId), inArray(leadsTable.id, leadIds)),
      );

    // Build phone list
    const phonesToScore = leadsToScore
      .filter((l) => l.phone || l.mobile1)
      .map((l) => ({
        leadId: l.id,
        phones: [l.phone, l.mobile1, l.mobile2, l.mobile3].filter(
          Boolean,
        ) as string[],
      }));

    if (phonesToScore.length > 0) {
      if (mode === "validate_only") {
        // Use cheaper Phone Validation API ($0.015/phone)
        for (const item of phonesToScore) {
          const bestPhone = item.phones[0];
          if (!bestPhone) continue;

          try {
            const validation = await this.trestle.validatePhone(bestPhone);

            // Determine SMS ready: mobile + valid + activity >= 70
            const smsReady =
              validation.valid &&
              validation.type === "mobile" &&
              validation.activityScore >= 70;

            await this.db
              .update(leadsTable)
              .set({
                phoneActivityScore: validation.activityScore,
                primaryPhoneType: validation.lineType,
                smsReady,
                enrichmentStatus: "scored",
                updatedAt: new Date(),
              })
              .where(eq(leadsTable.id, item.leadId));

            scoredCount++;
            if (smsReady) smsReadyCount++;
          } catch (err) {
            this.logger.warn(
              `[LUCI] Failed to validate phone for lead ${item.leadId}: ${err}`,
            );
          }
        }
      } else {
        // Use Real Contact API for full scoring ($0.03/phone)
        const scoreResult = await this.trestle.batchScore({
          phones: phonesToScore,
        });

        // Update leads with scores
        for (const score of scoreResult.results) {
          await this.db
            .update(leadsTable)
            .set({
              phoneActivityScore: score.contactabilityScore,
              phoneContactGrade: score.overallGrade,
              smsReady: score.smsReady,
              enrichmentStatus: "scored",
              updatedAt: new Date(),
            })
            .where(eq(leadsTable.id, score.leadId));

          scoredCount++;
          if (score.smsReady) smsReadyCount++;
        }
      }
    }

    // Complete job
    await this.db
      .update(enrichmentJobsTable)
      .set({
        status: "completed",
        successRecords: scoredCount,
        completedAt: new Date(),
      })
      .where(eq(enrichmentJobsTable.id, jobId));

    this.logger.log(
      `[LUCI] Enrichment job ${jobId} complete: ${tracedCount} traced, ${scoredCount} scored, ${smsReadyCount} SMS-ready`,
    );

    return {
      traced: tracedCount,
      scored: scoredCount,
      smsReady: smsReadyCount,
    };
  }
}
