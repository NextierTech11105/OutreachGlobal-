/**
 * B2B Ingestion Service
 * Reads CSVs from DO Spaces datalake, normalizes, and inserts into Postgres
 */
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { generateUlid } from "@/database/columns/ulid";
import { businesses, businessOwners, personas } from "@/database/schema";
import {
  normalizeName,
  normalizePhone,
  normalizeEmail,
  normalizeAddress,
} from "@nextier/common";

export interface B2BSectorConfig {
  sector: string;
  subSector: string;
  sicCode: string;
  bucketPath: string;
}

export interface B2BIngestionJob {
  teamId: string;
  config: B2BSectorConfig;
  fileName: string;
  bucketPath: string;
}

export interface B2BRecord {
  company_name?: string;
  company?: string;
  name?: string;
  dba?: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  title?: string;
  job_title?: string;
  email?: string;
  phone?: string;
  phone_number?: string;
  address?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  zip_code?: string;
  website?: string;
  employees?: string | number;
  employee_count?: string | number;
  revenue?: string | number;
  annual_revenue?: string | number;
  year_founded?: string | number;
  sic_code?: string;
  naics_code?: string;
  industry?: string;
  [key: string]: unknown;
}

@Injectable()
export class B2BIngestionService {
  private readonly logger = new Logger(B2BIngestionService.name);
  private s3Client: S3Client;
  private bucketName: string;

  constructor(
    private configService: ConfigService,
    @InjectDB() private db: DrizzleClient,
    @InjectQueue("b2b-ingestion") private ingestionQueue: Queue,
    @InjectQueue("skiptrace") private skipTraceQueue: Queue,
  ) {
    this.bucketName =
      this.configService.get("SPACES_BUCKET") || "nextier-datalake";

    this.s3Client = new S3Client({
      endpoint:
        this.configService.get("SPACES_ENDPOINT") ||
        "https://nyc3.digitaloceanspaces.com",
      region: this.configService.get("SPACES_REGION") || "nyc3",
      credentials: {
        accessKeyId: this.configService.get("SPACES_KEY") || "",
        secretAccessKey: this.configService.get("SPACES_SECRET") || "",
      },
    });
  }

  /**
   * Queue a B2B sector file for ingestion
   */
  async queueSectorIngestion(
    teamId: string,
    config: B2BSectorConfig,
  ): Promise<string> {
    const jobId = generateUlid("b2b");

    await this.ingestionQueue.add(
      "INGEST_SECTOR",
      {
        teamId,
        config,
        bucketPath: config.bucketPath,
      },
      {
        jobId,
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      },
    );

    this.logger.log(
      `Queued B2B ingestion job ${jobId} for ${config.sector}/${config.subSector}`,
    );
    return jobId;
  }

  /**
   * List files in a sector bucket path
   */
  async listSectorFiles(sectorPath: string): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: sectorPath,
      });

      const response = await this.s3Client.send(command);
      const files =
        response.Contents?.map((obj) => obj.Key || "").filter(
          (key) => key.endsWith(".csv") || key.endsWith(".json"),
        ) || [];

      return files;
    } catch (error) {
      this.logger.error(`Failed to list files in ${sectorPath}:`, error);
      throw error;
    }
  }

  /**
   * Read and parse a file from the bucket
   */
  async readBucketFile(filePath: string): Promise<B2BRecord[]> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: filePath,
      });

      const response = await this.s3Client.send(command);
      const content = await response.Body?.transformToString();

      if (!content) {
        throw new Error(`Empty file: ${filePath}`);
      }

      if (filePath.endsWith(".json")) {
        const parsed = JSON.parse(content);
        return Array.isArray(parsed)
          ? parsed
          : parsed.data || parsed.records || [];
      }

      // Parse CSV
      return this.parseCSV(content);
    } catch (error) {
      this.logger.error(`Failed to read file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Parse CSV content into records
   */
  private parseCSV(content: string): B2BRecord[] {
    const lines = content.split("\n").filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0]
      .split(",")
      .map((h) =>
        h.trim().replace(/^"|"$/g, "").toLowerCase().replace(/\s+/g, "_"),
      );
    const records: B2BRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === headers.length) {
        const record: B2BRecord = {};
        headers.forEach((header, idx) => {
          record[header] = values[idx];
        });
        records.push(record);
      }
    }

    return records;
  }

  /**
   * Parse a single CSV line handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    return values;
  }

  /**
   * Process a batch of B2B records
   */
  async processRecords(
    teamId: string,
    records: B2BRecord[],
    config: B2BSectorConfig,
  ): Promise<{
    businessesCreated: number;
    personasCreated: number;
    linksCreated: number;
    errors: string[];
  }> {
    const results = {
      businessesCreated: 0,
      personasCreated: 0,
      linksCreated: 0,
      errors: [] as string[],
    };

    for (const record of records) {
      try {
        await this.processRecord(teamId, record, config, results);
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        results.errors.push(`Record error: ${errorMsg}`);
      }
    }

    return results;
  }

  /**
   * Process a single B2B record
   */
  private async processRecord(
    teamId: string,
    record: B2BRecord,
    config: B2BSectorConfig,
    results: {
      businessesCreated: number;
      personasCreated: number;
      linksCreated: number;
      errors: string[];
    },
  ): Promise<void> {
    // Extract company info
    const companyName =
      record.company_name || record.company || record.name || "";
    if (!companyName) {
      results.errors.push("Skipped record: no company name");
      return;
    }

    // Normalize company name
    const normalizedName = companyName
      .toLowerCase()
      .replace(/[^\w\s&-]/g, "")
      .replace(/\s+(inc|llc|ltd|corp|corporation|company|co)\.?$/i, "")
      .trim();

    // Check for existing business
    const existingBusiness = await this.db.query.businesses.findFirst({
      where: (t, { eq, and }) =>
        and(eq(t.teamId, teamId), eq(t.normalizedName, normalizedName)),
    });

    let businessId: string;

    if (existingBusiness) {
      businessId = existingBusiness.id;
    } else {
      // Create new business
      businessId = generateUlid("biz");

      await this.db.insert(businesses).values({
        id: businessId,
        teamId,
        name: companyName,
        normalizedName,
        dba: record.dba as string,
        sicCode: config.sicCode || (record.sic_code as string),
        naicsCode: record.naics_code as string,
        sector: config.sector,
        subSector: config.subSector,
        phone: record.phone || (record.phone_number as string),
        email: record.email as string,
        website: record.website as string,
        street: record.street || (record.address as string),
        city: record.city as string,
        state: record.state as string,
        zip: (record.zip || record.zip_code) as string,
        employeeCount: this.parseNumber(
          record.employees || record.employee_count,
        ),
        annualRevenue: this.parseNumber(
          record.revenue || record.annual_revenue,
        ),
        yearFounded: this.parseNumber(record.year_founded),
        sourceFile: config.bucketPath,
        isActive: true,
      });

      results.businessesCreated++;
    }

    // Extract person info if available
    const firstName = record.first_name || record.firstName || "";
    const lastName = record.last_name || record.lastName || "";

    if (firstName && lastName) {
      await this.createPersonaLink(
        teamId,
        businessId,
        record,
        firstName,
        lastName,
        results,
      );
    }
  }

  /**
   * Create persona and link to business
   */
  private async createPersonaLink(
    teamId: string,
    businessId: string,
    record: B2BRecord,
    firstName: string,
    lastName: string,
    results: {
      businessesCreated: number;
      personasCreated: number;
      linksCreated: number;
      errors: string[];
    },
  ): Promise<void> {
    // Normalize name
    const nameInfo = normalizeName(`${firstName} ${lastName}`);

    // Check for existing persona
    const existingPersona = await this.db.query.personas.findFirst({
      where: (t, { eq, and }) =>
        and(
          eq(t.teamId, teamId),
          eq(t.normalizedFirstName, nameInfo.firstName),
          eq(t.normalizedLastName, nameInfo.lastName),
        ),
    });

    let personaId: string;

    if (existingPersona) {
      personaId = existingPersona.id;
    } else {
      // Create new persona
      personaId = generateUlid("persona");

      await this.db.insert(personas).values({
        id: personaId,
        teamId,
        firstName,
        lastName,
        middleName: nameInfo.middleName,
        suffix: nameInfo.suffix,
        fullName: `${firstName} ${lastName}`,
        normalizedFirstName: nameInfo.firstName,
        normalizedLastName: nameInfo.lastName,
        primarySource: "business",
        confidenceScore: 1.0,
        skipTraceCompleted: false,
        apolloCompleted: false,
        isActive: true,
      });

      results.personasCreated++;

      // Queue for SkipTrace enrichment
      await this.skipTraceQueue.add(
        "ENRICH_PERSONA",
        {
          teamId,
          personaId,
          sourceType: "business",
          sourceId: businessId,
          firstName,
          lastName,
          email: record.email,
          phone: record.phone || record.phone_number,
        },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 10000 },
        },
      );
    }

    // Classify role
    const title = record.title || record.job_title || "";
    const roleInfo = this.classifyRole(title);

    // Create business-persona link
    await this.db
      .insert(businessOwners)
      .values({
        id: generateUlid("bowner"),
        teamId,
        personaId,
        businessId,
        title,
        roleType: roleInfo.roleType,
        roleConfidence: roleInfo.confidence,
        isDecisionMaker: roleInfo.isDecisionMaker,
        isOwner: roleInfo.isOwner,
        isCLevel: roleInfo.isCLevel,
        isPartner: roleInfo.isPartner,
        isInvestor: roleInfo.isInvestor,
        isSalesLead: roleInfo.isSalesLead,
        source: "b2b_upload",
        isCurrent: true,
      })
      .onConflictDoNothing();

    results.linksCreated++;
  }

  /**
   * Classify role from title
   */
  private classifyRole(title: string): {
    roleType: string;
    confidence: number;
    isDecisionMaker: boolean;
    isOwner: boolean;
    isCLevel: boolean;
    isPartner: boolean;
    isInvestor: boolean;
    isSalesLead: boolean;
  } {
    const lowerTitle = (title || "").toLowerCase();

    // Owner patterns
    if (/owner|proprietor|founder|principal/i.test(lowerTitle)) {
      return {
        roleType: "owner",
        confidence: 0.95,
        isDecisionMaker: true,
        isOwner: true,
        isCLevel: false,
        isPartner: false,
        isInvestor: false,
        isSalesLead: false,
      };
    }

    // CEO patterns
    if (/ceo|president|chief\s+executive|coo|cfo|cto/i.test(lowerTitle)) {
      return {
        roleType: "ceo",
        confidence: 0.9,
        isDecisionMaker: true,
        isOwner: false,
        isCLevel: true,
        isPartner: false,
        isInvestor: false,
        isSalesLead: false,
      };
    }

    // Partner patterns
    if (/partner/i.test(lowerTitle)) {
      return {
        roleType: "partner",
        confidence: 0.85,
        isDecisionMaker: true,
        isOwner: false,
        isCLevel: false,
        isPartner: true,
        isInvestor: false,
        isSalesLead: false,
      };
    }

    // Sales patterns
    if (/sales\s+(manager|director|vp|lead)/i.test(lowerTitle)) {
      return {
        roleType: "sales_manager",
        confidence: 0.85,
        isDecisionMaker: false,
        isOwner: false,
        isCLevel: false,
        isPartner: false,
        isInvestor: false,
        isSalesLead: true,
      };
    }

    // Default
    return {
      roleType: "unknown",
      confidence: 0.1,
      isDecisionMaker: false,
      isOwner: false,
      isCLevel: false,
      isPartner: false,
      isInvestor: false,
      isSalesLead: false,
    };
  }

  /**
   * Parse a number from various formats
   */
  private parseNumber(value: unknown): number | undefined {
    if (value === undefined || value === null || value === "") return undefined;

    if (typeof value === "number") return value;

    const str = String(value).replace(/[$,\s]/g, "");
    const num = parseFloat(str);
    return isNaN(num) ? undefined : num;
  }
}
