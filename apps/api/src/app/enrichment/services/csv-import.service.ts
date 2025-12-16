import { Injectable, Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { leads } from "@/database/schema/leads.schema";
import { parse } from "csv-parse/sync";
import {
  USBizDataRow,
  US_BIZ_DATA_HEADERS,
} from "../interfaces/us-biz-data.interface";

export type CsvFormat = "us_biz_data" | "generic" | "unknown";

export interface CsvImportResult {
  format: CsvFormat;
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  errors: string[];
}

export interface LeadInsertData {
  teamId: string;
  externalId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  source: string;
  metadata: Record<string, unknown>;
}

@Injectable()
export class CsvImportService {
  private readonly logger = new Logger(CsvImportService.name);
  private readonly BATCH_SIZE = 500;

  constructor(@InjectDB() private db: DrizzleClient) {}

  /**
   * Detect the CSV format based on headers
   */
  detectFormat(headers: string[]): CsvFormat {
    const headerSet = new Set(headers.map((h) => h.trim()));

    // Check for USBizData format
    const usBizDataMatch = US_BIZ_DATA_HEADERS.filter((h) =>
      headerSet.has(h),
    ).length;
    if (usBizDataMatch >= US_BIZ_DATA_HEADERS.length * 0.8) {
      return "us_biz_data";
    }

    // Check for generic format (has basic lead fields)
    const genericFields = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "first_name",
      "last_name",
    ];
    const genericMatch = genericFields.filter((f) => headerSet.has(f)).length;
    if (genericMatch >= 2) {
      return "generic";
    }

    return "unknown";
  }

  /**
   * Import CSV data for a team
   */
  async importCsv(
    teamId: string,
    csvContent: string,
    integrationId?: string,
  ): Promise<CsvImportResult> {
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];

    if (records.length === 0) {
      return {
        format: "unknown",
        totalRows: 0,
        importedCount: 0,
        skippedCount: 0,
        errors: ["CSV file is empty or has no data rows"],
      };
    }

    const headers = Object.keys(records[0]);
    const format = this.detectFormat(headers);

    this.logger.log(
      `Detected CSV format: ${format} with ${records.length} rows`,
    );

    switch (format) {
      case "us_biz_data":
        return this.importUSBizData(
          teamId,
          records as unknown as USBizDataRow[],
          integrationId,
        );
      case "generic":
        return this.importGeneric(teamId, records, integrationId);
      default:
        return {
          format: "unknown",
          totalRows: records.length,
          importedCount: 0,
          skippedCount: records.length,
          errors: ["Unknown CSV format. Headers did not match any known format."],
        };
    }
  }

  /**
   * Import USBizData format CSV
   */
  private async importUSBizData(
    teamId: string,
    rows: USBizDataRow[],
    integrationId?: string,
  ): Promise<CsvImportResult> {
    const errors: string[] = [];
    let importedCount = 0;
    let skippedCount = 0;

    const leadsToInsert: LeadInsertData[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const lead = this.mapUSBizDataToLead(row, teamId, integrationId);
        if (lead) {
          leadsToInsert.push(lead);
        } else {
          skippedCount++;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`Row ${i + 2}: ${message}`);
        skippedCount++;
      }
    }

    // Batch insert
    const chunks = this.chunkArray(leadsToInsert, this.BATCH_SIZE);
    for (const chunk of chunks) {
      try {
        await this.db
          .insert(leads)
          .values(chunk)
          .onConflictDoNothing();
        importedCount += chunk.length;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`Batch insert error: ${message}`);
        skippedCount += chunk.length;
      }
    }

    return {
      format: "us_biz_data",
      totalRows: rows.length,
      importedCount,
      skippedCount,
      errors,
    };
  }

  /**
   * Import generic CSV format
   */
  private async importGeneric(
    teamId: string,
    rows: Record<string, string>[],
    integrationId?: string,
  ): Promise<CsvImportResult> {
    const errors: string[] = [];
    let importedCount = 0;
    let skippedCount = 0;

    const leadsToInsert: LeadInsertData[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const lead = this.mapGenericToLead(row, teamId, integrationId);
        if (lead) {
          leadsToInsert.push(lead);
        } else {
          skippedCount++;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`Row ${i + 2}: ${message}`);
        skippedCount++;
      }
    }

    // Batch insert
    const chunks = this.chunkArray(leadsToInsert, this.BATCH_SIZE);
    for (const chunk of chunks) {
      try {
        await this.db
          .insert(leads)
          .values(chunk)
          .onConflictDoNothing();
        importedCount += chunk.length;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`Batch insert error: ${message}`);
        skippedCount += chunk.length;
      }
    }

    return {
      format: "generic",
      totalRows: rows.length,
      importedCount,
      skippedCount,
      errors,
    };
  }

  /**
   * Map USBizData row to lead schema
   */
  private mapUSBizDataToLead(
    row: USBizDataRow,
    teamId: string,
    integrationId?: string,
  ): LeadInsertData | null {
    // Must have at least company name or contact name
    if (!row["Company Name"] && !row["Contact Name"]) {
      return null;
    }

    // Parse contact name into first/last
    const { firstName, lastName } = this.splitContactName(row["Contact Name"]);

    // Normalize phone number
    const phone = this.normalizePhone(row["Area Code"], row["Phone Number"]);

    // Parse numeric fields
    const employees = this.parseNumeric(row["Number of Employees"]);
    const revenue = this.parseRevenue(row["Annual Revenue"]);

    // Generate external ID from email or company+contact
    const externalId =
      row["Email Address"] ||
      `${row["Company Name"]}-${row["Contact Name"]}`.replace(/\s+/g, "-").toLowerCase();

    return {
      teamId,
      externalId,
      firstName,
      lastName,
      email: row["Email Address"] || null,
      phone,
      company: row["Company Name"] || null,
      address: row["Street Address"] || null,
      city: row["City"] || null,
      state: row["State"] || null,
      zipCode: row["Zip Code"] || null,
      source: "us_biz_data",
      metadata: {
        sicCode: row["SIC Code"] || null,
        sicDescription: row["SIC Description"] || null,
        county: row["County"] || null,
        website: row["Website URL"] || null,
        employees,
        annualRevenue: revenue,
        importedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Map generic CSV row to lead schema
   */
  private mapGenericToLead(
    row: Record<string, string>,
    teamId: string,
    integrationId?: string,
  ): LeadInsertData | null {
    // Normalize keys to handle various formats
    const normalizedRow: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      normalizedRow[key.toLowerCase().replace(/[_\s]/g, "")] = value;
    }

    const firstName =
      normalizedRow["firstname"] || normalizedRow["first"] || null;
    const lastName =
      normalizedRow["lastname"] || normalizedRow["last"] || null;
    const email =
      normalizedRow["email"] || normalizedRow["emailaddress"] || null;
    const phone =
      normalizedRow["phone"] ||
      normalizedRow["phonenumber"] ||
      normalizedRow["mobile"] ||
      null;

    if (!firstName && !lastName && !email && !phone) {
      return null;
    }

    const externalId =
      email ||
      `${firstName || ""}-${lastName || ""}-${Date.now()}`.toLowerCase();

    return {
      teamId,
      externalId,
      firstName,
      lastName,
      email,
      phone: phone ? this.normalizePhoneSimple(phone) : null,
      company: normalizedRow["company"] || normalizedRow["companyname"] || null,
      address:
        normalizedRow["address"] || normalizedRow["streetaddress"] || null,
      city: normalizedRow["city"] || null,
      state: normalizedRow["state"] || null,
      zipCode:
        normalizedRow["zipcode"] ||
        normalizedRow["zip"] ||
        normalizedRow["postalcode"] ||
        null,
      source: "csv_import",
      metadata: {
        importedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Split contact name into first and last name
   */
  private splitContactName(contactName: string | null | undefined): {
    firstName: string | null;
    lastName: string | null;
  } {
    if (!contactName || !contactName.trim()) {
      return { firstName: null, lastName: null };
    }

    const parts = contactName.trim().split(/\s+/);
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: null };
    }

    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(" "),
    };
  }

  /**
   * Normalize phone number to E.164 format
   */
  private normalizePhone(
    areaCode: string | null | undefined,
    phoneNumber: string | null | undefined,
  ): string | null {
    if (!phoneNumber) return null;

    // Remove non-digits
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    const cleanArea = areaCode?.replace(/\D/g, "") || "";

    if (!cleanPhone) return null;

    // Combine area code and phone
    const fullNumber = cleanArea + cleanPhone;

    // Format as E.164 (assuming US)
    if (fullNumber.length === 10) {
      return `+1${fullNumber}`;
    } else if (fullNumber.length === 11 && fullNumber.startsWith("1")) {
      return `+${fullNumber}`;
    }

    // Return as-is if already formatted or unusual length
    return fullNumber.length > 6 ? `+1${fullNumber.slice(-10)}` : null;
  }

  /**
   * Simple phone normalization for generic imports
   */
  private normalizePhoneSimple(phone: string): string | null {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7) return null;

    if (digits.length === 10) {
      return `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith("1")) {
      return `+${digits}`;
    }

    return `+${digits}`;
  }

  /**
   * Parse numeric string to number
   */
  private parseNumeric(value: string | null | undefined): number | null {
    if (!value) return null;
    const parsed = parseInt(value.replace(/\D/g, ""), 10);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Parse revenue string (handles formats like "$1,000,000" or "1M")
   */
  private parseRevenue(value: string | null | undefined): number | null {
    if (!value) return null;

    // Remove $ and commas
    let cleaned = value.replace(/[$,]/g, "").trim().toUpperCase();

    // Handle K/M/B suffixes
    let multiplier = 1;
    if (cleaned.endsWith("K")) {
      multiplier = 1000;
      cleaned = cleaned.slice(0, -1);
    } else if (cleaned.endsWith("M")) {
      multiplier = 1000000;
      cleaned = cleaned.slice(0, -1);
    } else if (cleaned.endsWith("B")) {
      multiplier = 1000000000;
      cleaned = cleaned.slice(0, -1);
    }

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed * multiplier;
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
