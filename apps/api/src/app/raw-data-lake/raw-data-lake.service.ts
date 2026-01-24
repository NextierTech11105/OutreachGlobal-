import { Injectable, Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import type { DrizzleClient } from "@/database/types";
import { leadsTable as leads } from "@/database/schema-alias";
import { eq, and, sql, count } from "drizzle-orm";
import { ulid } from "ulid";

/**
 * FIXED USBizData CSV Column Mapping
 * All CSVs have the exact same format:
 * Company Name, Address, City, State, Zip, County, Phone, Contact First, Contact Last,
 * Title, Direct Phone, Email, Website, Employee Range, Annual Sales, SIC Code, Industry
 */
const USBIZDATA_COLUMNS: Record<string, string> = {
  "Company Name": "company",
  "Address": "address",
  "City": "city",
  "State": "state",
  "Zip": "zipCode",
  "County": "county",
  "Phone": "phone",
  "Contact First": "firstName",
  "Contact Last": "lastName",
  "Title": "title",
  "Direct Phone": "primaryPhone",
  "Email": "email",
  "Website": "website",
  "Employee Range": "employees",
  "Annual Sales": "annualSales",
  "SIC Code": "sicCode",
  "Industry": "sicDescription",
};

// Vertical detection from SIC codes
const SIC_TO_VERTICAL: Record<string, string> = {
  "1711": "plumbing",
  "8742": "consultants",
  "8748": "consultants",
  "6531": "realtors",
};

export interface ImportStats {
  total: number;
  imported: number;
  skipped: number;
  errors: number;
  vertical?: string;
  sampleCompanies: string[];
}

export interface VerticalStats {
  vertical: string;
  total: number;
  raw: number;
  traced: number;
  scored: number;
  ready: number;
  smsReady: number;
}

@Injectable()
export class RawDataLakeService {
  private readonly logger = new Logger(RawDataLakeService.name);

  constructor(@InjectDB() private db: DrizzleClient) {}

  /**
   * Import CSV buffer into leads table
   * Returns stats about the import
   */
  async importCSV(
    teamId: string,
    csvBuffer: Buffer | string,
    options?: {
      vertical?: string;
      sourceTag?: string;
      fileName?: string;
    }
  ): Promise<ImportStats> {
    const stats: ImportStats = {
      total: 0,
      imported: 0,
      skipped: 0,
      errors: 0,
      sampleCompanies: [],
    };

    try {
      // Parse CSV using built-in parser (USBizData format)
      const content = typeof csvBuffer === "string" ? csvBuffer : csvBuffer.toString("utf-8");
      const records = this.parseCSV(content);

      stats.total = records.length;
      if (records.length === 0) {
        return stats;
      }

      // USBizData uses fixed column mapping - no detection needed
      // Process in batches
      const BATCH_SIZE = 500;
      const leadInserts: any[] = [];
      let detectedVertical: string | undefined;

      for (const record of records) {
        try {
          const lead = this.mapRecordToLead(record, teamId, {
            ...options,
            vertical: options?.vertical || detectedVertical,
          });

          // Detect vertical from first record's SIC code
          if (!detectedVertical && lead.sicCode) {
            const sicPrefix = lead.sicCode.substring(0, 4);
            detectedVertical = SIC_TO_VERTICAL[sicPrefix];
          }

          // Sample companies for preview
          if (stats.sampleCompanies.length < 5 && lead.company) {
            stats.sampleCompanies.push(lead.company);
          }

          leadInserts.push(lead);

          // Batch insert
          if (leadInserts.length >= BATCH_SIZE) {
            await this.insertBatch(leadInserts, stats);
            leadInserts.length = 0;
          }
        } catch (err: any) {
          this.logger.debug(`Row error: ${err.message}`);
          stats.errors++;
        }
      }

      // Insert remaining
      if (leadInserts.length > 0) {
        await this.insertBatch(leadInserts, stats);
      }

      stats.vertical = detectedVertical || options?.vertical;
      this.logger.log(
        `Imported ${stats.imported}/${stats.total} leads (${stats.errors} errors)`
      );

      return stats;
    } catch (err: any) {
      this.logger.error(`CSV import failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Get stats by vertical for the data lake dashboard
   */
  async getVerticalStats(teamId: string): Promise<VerticalStats[]> {
    const result = await this.db
      .select({
        vertical: leads.sectorTag,
        total: count(),
        raw: sql<number>`COUNT(*) FILTER (WHERE ${leads.enrichmentStatus} = 'raw')`,
        traced: sql<number>`COUNT(*) FILTER (WHERE ${leads.enrichmentStatus} = 'traced')`,
        scored: sql<number>`COUNT(*) FILTER (WHERE ${leads.enrichmentStatus} = 'scored')`,
        ready: sql<number>`COUNT(*) FILTER (WHERE ${leads.enrichmentStatus} = 'ready')`,
        smsReady: sql<number>`COUNT(*) FILTER (WHERE ${leads.smsReady} = true)`,
      })
      .from(leads)
      .where(and(eq(leads.teamId, teamId), sql`${leads.sectorTag} IS NOT NULL`))
      .groupBy(leads.sectorTag);

    return result.map((r) => ({
      vertical: r.vertical || "unknown",
      total: Number(r.total),
      raw: Number(r.raw),
      traced: Number(r.traced),
      scored: Number(r.scored),
      ready: Number(r.ready),
      smsReady: Number(r.smsReady),
    }));
  }

  /**
   * Get all verticals with counts
   */
  async getVerticals(teamId: string): Promise<{ vertical: string; count: number }[]> {
    const result = await this.db
      .select({
        vertical: leads.sectorTag,
        count: count(),
      })
      .from(leads)
      .where(and(eq(leads.teamId, teamId), sql`${leads.sectorTag} IS NOT NULL`))
      .groupBy(leads.sectorTag)
      .orderBy(sql`count(*) DESC`);

    return result.map((r) => ({
      vertical: r.vertical || "unknown",
      count: Number(r.count),
    }));
  }

  /**
   * Browse raw leads by vertical with pagination and filters
   */
  async browseLeads(
    teamId: string,
    options: {
      vertical?: string;
      state?: string;
      city?: string;
      status?: string;
      page?: number;
      perPage?: number;
    }
  ): Promise<{ leads: any[]; total: number; page: number; perPage: number }> {
    const page = options.page || 1;
    const perPage = Math.min(options.perPage || 100, 500);
    const offset = (page - 1) * perPage;

    // Build where conditions
    const conditions = [eq(leads.teamId, teamId)];

    if (options.vertical) {
      conditions.push(eq(leads.sectorTag, options.vertical));
    }
    if (options.state) {
      conditions.push(eq(leads.state, options.state));
    }
    if (options.city) {
      conditions.push(eq(leads.city, options.city));
    }
    if (options.status) {
      conditions.push(eq(leads.enrichmentStatus, options.status as any));
    }

    // Get total count
    const [{ total }] = await this.db
      .select({ total: count() })
      .from(leads)
      .where(and(...conditions));

    // Get leads
    const result = await this.db
      .select({
        id: leads.id,
        company: leads.company,
        firstName: leads.firstName,
        lastName: leads.lastName,
        title: leads.title,
        city: leads.city,
        state: leads.state,
        employees: leads.employees,
        annualSales: leads.annualSales,
        sicCode: leads.sicCode,
        sectorTag: leads.sectorTag,
        enrichmentStatus: leads.enrichmentStatus,
        phoneContactGrade: leads.phoneContactGrade,
        smsReady: leads.smsReady,
        // Hide phone/email until enriched
        phone: sql<string>`CASE WHEN ${leads.enrichmentStatus} IN ('scored', 'ready', 'campaign') THEN ${leads.phone} ELSE '(raw - enrich to reveal)' END`,
        email: sql<string>`CASE WHEN ${leads.enrichmentStatus} IN ('scored', 'ready', 'campaign') THEN ${leads.email} ELSE '(raw - enrich to reveal)' END`,
      })
      .from(leads)
      .where(and(...conditions))
      .limit(perPage)
      .offset(offset)
      .orderBy(leads.company);

    return {
      leads: result,
      total: Number(total),
      page,
      perPage,
    };
  }

  /**
   * Create a block from selected leads or by filter criteria
   */
  async createBlock(
    teamId: string,
    options: {
      vertical?: string;
      state?: string;
      city?: string;
      leadIds?: string[];
      blockSize: 10 | 50 | 100 | 500 | 1000 | 2000;
    }
  ): Promise<{ blockId: string; count: number; estimatedCost: number }> {
    const blockId = `block_${ulid()}`;
    let updatedCount = 0;

    if (options.leadIds && options.leadIds.length > 0) {
      // Update specific leads
      const toUpdate = options.leadIds.slice(0, options.blockSize);
      for (const leadId of toUpdate) {
        await this.db
          .update(leads)
          .set({
            metadata: sql`COALESCE(${leads.metadata}, '{}'::jsonb) || jsonb_build_object('blockId', ${blockId})`,
            updatedAt: new Date(),
          })
          .where(and(eq(leads.id, leadId), eq(leads.teamId, teamId)));
        updatedCount++;
      }
    } else {
      // Update by filter criteria
      const conditions = [
        eq(leads.teamId, teamId),
        eq(leads.enrichmentStatus, "raw"),
      ];

      if (options.vertical) {
        conditions.push(eq(leads.sectorTag, options.vertical));
      }
      if (options.state) {
        conditions.push(eq(leads.state, options.state));
      }
      if (options.city) {
        conditions.push(eq(leads.city, options.city));
      }

      // Get lead IDs to update
      const toUpdate = await this.db
        .select({ id: leads.id })
        .from(leads)
        .where(and(...conditions))
        .limit(options.blockSize);

      for (const lead of toUpdate) {
        await this.db
          .update(leads)
          .set({
            metadata: sql`COALESCE(${leads.metadata}, '{}'::jsonb) || jsonb_build_object('blockId', ${blockId})`,
            updatedAt: new Date(),
          })
          .where(eq(leads.id, lead.id));
        updatedCount++;
      }
    }

    // NEXTIER COST: $0.02 Tracerfy (min) | $0.035 w/Trestle | $0.05 full enrichment (max)
    const estimatedCost = updatedCount * 0.05; // Show max cost for safety

    return {
      blockId,
      count: updatedCount,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
    };
  }

  // Private helpers

  /**
   * Simple CSV parser (handles quoted fields with commas)
   */
  private parseCSV(content: string): Record<string, string>[] {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = this.parseCSVLine(lines[0]);
    const records: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === 0) continue;

      const record: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        record[headers[j]] = values[j] || "";
      }
      records.push(record);
    }

    return records;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  private mapRecordToLead(
    record: Record<string, string>,
    teamId: string,
    options?: { sourceTag?: string; fileName?: string; vertical?: string }
  ): Record<string, any> {
    const lead: Record<string, any> = {
      id: `lead_${ulid()}`,
      teamId,
      enrichmentStatus: "raw",
      pipelineStatus: "raw",
      sourceTag: options?.sourceTag || "usbizdata",
      source: options?.fileName ? `import:${options.fileName}` : "csv_import",
      score: 0,
      smsReady: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Map using FIXED USBizData columns
    for (const [csvColumn, dbField] of Object.entries(USBIZDATA_COLUMNS)) {
      const value = record[csvColumn];
      if (value !== undefined && value !== "") {
        lead[dbField] = value.trim();
      }
    }

    // Extract SIC tag and auto-detect vertical
    if (lead.sicCode) {
      lead.sicTag = lead.sicCode.substring(0, 4);
      // Auto-detect vertical from SIC if not provided
      if (!options?.vertical) {
        lead.sectorTag = SIC_TO_VERTICAL[lead.sicTag] || "b2b";
      }
    }

    // Apply provided vertical
    if (options?.vertical) {
      lead.sectorTag = options.vertical;
    }

    // Normalize phone numbers (keep raw phone from CSV - Tracerfy will find the real ones)
    if (lead.phone) {
      const digits = lead.phone.replace(/\D/g, "");
      if (digits.length === 10) {
        lead.phone = `+1${digits}`;
      } else if (digits.length === 11 && digits.startsWith("1")) {
        lead.phone = `+${digits}`;
      }
    }
    if (lead.primaryPhone) {
      const digits = lead.primaryPhone.replace(/\D/g, "");
      if (digits.length === 10) {
        lead.primaryPhone = digits;
      }
    }

    return lead;
  }

  private async insertBatch(batch: any[], stats: ImportStats): Promise<void> {
    try {
      await this.db.insert(leads).values(batch).onConflictDoNothing();
      stats.imported += batch.length;
    } catch (err: any) {
      this.logger.error(`Batch insert failed: ${err.message}`);
      stats.errors += batch.length;
    }
  }
}
