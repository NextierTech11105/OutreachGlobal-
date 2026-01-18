/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TRESTLE BATCH UPLOAD - FREE LEAD ASSESSMENT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Trestle's Free Lead Assessment allows up to 10,000 records per batch.
 * This wraps their batch upload for bulk contactability scoring.
 *
 * FEATURES:
 * - Free verification for up to 10,000 records
 * - No signup required for the free assessment
 * - Aggregated report via email
 * - Lead grading system (A-F)
 *
 * FLOW:
 * 1. Upload CSV with phone + name columns
 * 2. Trestle processes and sends email with report
 * 3. Report includes grade distribution, activity scores, peer comparison
 *
 * FOR PAID API (Real Contact API):
 * - $0.03/query
 * - Real-time individual lookups
 * - Full response data (not just aggregates)
 */

import {
  getTrestleClient,
  isPhoneContactable,
  calculateContactabilityScore,
  type TrestleRealContactResponse,
  type TrestleContactGrade,
} from "@/lib/trestle";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface BatchRecord {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface BatchResult {
  record: BatchRecord;
  rowIndex: number;

  // Trestle results
  response: TrestleRealContactResponse | null;
  error: string | null;

  // Computed
  isContactable: boolean;
  contactabilityScore: number;
  contactGrade: TrestleContactGrade | null;
  activityScore: number | null;
  lineType: string | null;
  nameMatch: boolean | null;
  litigatorRisk: boolean;
}

export interface BatchStats {
  total: number;
  processed: number;
  successful: number;
  failed: number;

  // Grade distribution
  gradeA: number;
  gradeB: number;
  gradeC: number;
  gradeD: number;
  gradeF: number;

  // Activity distribution
  highActivity: number; // 70+
  mediumActivity: number; // 30-69
  lowActivity: number; // <30

  // Line types
  mobile: number;
  landline: number;
  voip: number;
  other: number;

  // Risks
  litigatorRisk: number;
  noNameMatch: number;

  // Contactability
  contactable: number;
  notContactable: number;
  contactabilityRate: number;

  // Cost
  totalCost: number;
  costPerLead: number;
}

export interface BatchUploadConfig {
  maxRecords?: number; // Default 10,000 for free tier
  concurrency?: number; // Parallel API calls
  delayMs?: number; // Delay between batches
  onProgress?: (processed: number, total: number) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const BATCH_CONFIG = {
  // Free tier limit
  FREE_TIER_MAX_RECORDS: 10000,

  // Paid tier settings
  COST_PER_QUERY: 0.03,
  DEFAULT_CONCURRENCY: 10,
  DEFAULT_DELAY_MS: 100,

  // Contactability thresholds (matching Trestle philosophy)
  MIN_ACTIVITY_SCORE: 70,
  PASSING_GRADES: ["A", "B"] as const,

  // Rate limits
  MAX_QPS: 10, // Self-service tier
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH PROCESSING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Process a batch of records through Trestle Real Contact API
 *
 * This is the PAID API path ($0.03/query) that returns full data.
 * For free assessment, use the Trestle web upload at:
 * https://trestle.com/products/real-contact-api/free-assessment
 */
export async function processBatch(
  records: BatchRecord[],
  config: BatchUploadConfig = {}
): Promise<{ results: BatchResult[]; stats: BatchStats }> {
  const maxRecords = config.maxRecords || BATCH_CONFIG.FREE_TIER_MAX_RECORDS;
  const concurrency = config.concurrency || BATCH_CONFIG.DEFAULT_CONCURRENCY;
  const delayMs = config.delayMs || BATCH_CONFIG.DEFAULT_DELAY_MS;

  // Limit records
  const limitedRecords = records.slice(0, maxRecords);

  console.log(`[Trestle Batch] Processing ${limitedRecords.length} records...`);

  const client = getTrestleClient();
  const results: BatchResult[] = [];

  // Process in batches with concurrency
  for (let i = 0; i < limitedRecords.length; i += concurrency) {
    const batch = limitedRecords.slice(i, i + concurrency);

    const batchPromises = batch.map(async (record, batchIndex) => {
      const rowIndex = i + batchIndex;

      try {
        const response = await client.realContact({
          name: record.name,
          phone: record.phone,
          email: record.email,
          address: record.address
            ? {
                street_line_1: record.address,
                city: record.city,
                state_code: record.state,
                postal_code: record.zip,
                country_code: "US",
              }
            : undefined,
          addOns: ["litigator_checks", "email_checks_deliverability"],
        });

        const isContactable = isPhoneContactable(
          response,
          BATCH_CONFIG.MIN_ACTIVITY_SCORE,
          [...BATCH_CONFIG.PASSING_GRADES]
        );

        const litigatorRisk =
          response.addOns?.litigatorChecks?.phoneIsLitigatorRisk === true;

        return {
          record,
          rowIndex,
          response,
          error: null,
          isContactable: isContactable && !litigatorRisk,
          contactabilityScore: calculateContactabilityScore(response),
          contactGrade: response.phone.contactGrade,
          activityScore: response.phone.activityScore,
          lineType: response.phone.lineType,
          nameMatch: response.phone.nameMatch,
          litigatorRisk,
        };
      } catch (err) {
        return {
          record,
          rowIndex,
          response: null,
          error: err instanceof Error ? err.message : "Unknown error",
          isContactable: false,
          contactabilityScore: 0,
          contactGrade: null,
          activityScore: null,
          lineType: null,
          nameMatch: null,
          litigatorRisk: false,
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Progress callback
    if (config.onProgress) {
      config.onProgress(results.length, limitedRecords.length);
    }

    // Delay between batches to respect rate limits
    if (i + concurrency < limitedRecords.length && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // Calculate stats
  const stats = calculateBatchStats(results);

  console.log(`[Trestle Batch] Complete:`);
  console.log(`  - Processed: ${stats.processed}/${stats.total}`);
  console.log(`  - Contactable: ${stats.contactable} (${(stats.contactabilityRate * 100).toFixed(1)}%)`);
  console.log(`  - Grade A: ${stats.gradeA}, Grade B: ${stats.gradeB}`);
  console.log(`  - Total cost: $${stats.totalCost.toFixed(2)}`);

  return { results, stats };
}

/**
 * Calculate aggregate stats from batch results
 */
export function calculateBatchStats(results: BatchResult[]): BatchStats {
  const successful = results.filter((r) => r.response !== null);
  const failed = results.filter((r) => r.error !== null);

  // Grade distribution
  const gradeA = successful.filter((r) => r.contactGrade === "A").length;
  const gradeB = successful.filter((r) => r.contactGrade === "B").length;
  const gradeC = successful.filter((r) => r.contactGrade === "C").length;
  const gradeD = successful.filter((r) => r.contactGrade === "D").length;
  const gradeF = successful.filter((r) => r.contactGrade === "F").length;

  // Activity distribution
  const highActivity = successful.filter(
    (r) => r.activityScore !== null && r.activityScore >= 70
  ).length;
  const mediumActivity = successful.filter(
    (r) => r.activityScore !== null && r.activityScore >= 30 && r.activityScore < 70
  ).length;
  const lowActivity = successful.filter(
    (r) => r.activityScore !== null && r.activityScore < 30
  ).length;

  // Line types
  const mobile = successful.filter((r) => r.lineType === "Mobile").length;
  const landline = successful.filter((r) => r.lineType === "Landline").length;
  const voip = successful.filter(
    (r) => r.lineType === "FixedVOIP" || r.lineType === "NonFixedVOIP"
  ).length;
  const other = successful.length - mobile - landline - voip;

  // Risks
  const litigatorRisk = successful.filter((r) => r.litigatorRisk).length;
  const noNameMatch = successful.filter((r) => r.nameMatch === false).length;

  // Contactability
  const contactable = results.filter((r) => r.isContactable).length;
  const notContactable = results.length - contactable;

  // Cost
  const totalCost = successful.length * BATCH_CONFIG.COST_PER_QUERY;

  return {
    total: results.length,
    processed: successful.length,
    successful: successful.length,
    failed: failed.length,

    gradeA,
    gradeB,
    gradeC,
    gradeD,
    gradeF,

    highActivity,
    mediumActivity,
    lowActivity,

    mobile,
    landline,
    voip,
    other,

    litigatorRisk,
    noNameMatch,

    contactable,
    notContactable,
    contactabilityRate: contactable / results.length,

    totalCost,
    costPerLead: totalCost / results.length,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CSV PARSING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse CSV content into batch records
 */
export function parseCSVForBatch(
  csvContent: string,
  columnMapping?: {
    name?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  }
): BatchRecord[] {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) return [];

  // Parse header
  const header = lines[0].split(",").map((col) => col.trim().toLowerCase().replace(/['"]/g, ""));

  // Default column mappings
  const mapping = {
    name: columnMapping?.name || findColumn(header, ["name", "full_name", "contact_name", "fullname"]),
    firstName: columnMapping?.firstName || findColumn(header, ["first_name", "firstname", "first"]),
    lastName: columnMapping?.lastName || findColumn(header, ["last_name", "lastname", "last"]),
    phone: columnMapping?.phone || findColumn(header, ["phone", "phone_number", "phonenumber", "mobile", "cell"]),
    email: columnMapping?.email || findColumn(header, ["email", "email_address", "emailaddress"]),
    address: columnMapping?.address || findColumn(header, ["address", "street", "street_address"]),
    city: columnMapping?.city || findColumn(header, ["city"]),
    state: columnMapping?.state || findColumn(header, ["state", "state_code"]),
    zip: columnMapping?.zip || findColumn(header, ["zip", "zipcode", "postal_code", "zip_code"]),
  };

  // Parse rows
  const records: BatchRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const getValue = (colName: string | null): string => {
      if (!colName) return "";
      const index = header.indexOf(colName);
      return index >= 0 ? (values[index] || "").trim() : "";
    };

    // Build name
    let name = getValue(mapping.name);
    if (!name) {
      const firstName = getValue(mapping.firstName);
      const lastName = getValue(mapping.lastName);
      name = `${firstName} ${lastName}`.trim();
    }

    const phone = getValue(mapping.phone);

    // Skip if no name or phone
    if (!name || !phone) continue;

    records.push({
      name,
      phone,
      email: getValue(mapping.email) || undefined,
      address: getValue(mapping.address) || undefined,
      city: getValue(mapping.city) || undefined,
      state: getValue(mapping.state) || undefined,
      zip: getValue(mapping.zip) || undefined,
    });
  }

  return records;
}

/**
 * Find a column in the header
 */
function findColumn(header: string[], candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (header.includes(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

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
// EXPORT FOR REPORTING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Export batch results to CSV
 */
export function exportResultsToCSV(results: BatchResult[]): string {
  const header = [
    "row_index",
    "name",
    "phone",
    "email",
    "is_contactable",
    "contactability_score",
    "contact_grade",
    "activity_score",
    "line_type",
    "name_match",
    "litigator_risk",
    "error",
  ].join(",");

  const rows = results.map((r) =>
    [
      r.rowIndex,
      `"${r.record.name}"`,
      r.record.phone,
      r.record.email || "",
      r.isContactable,
      r.contactabilityScore,
      r.contactGrade || "",
      r.activityScore ?? "",
      r.lineType || "",
      r.nameMatch ?? "",
      r.litigatorRisk,
      r.error ? `"${r.error}"` : "",
    ].join(",")
  );

  return [header, ...rows].join("\n");
}

console.log("[Trestle Batch] Batch upload module loaded");
console.log(`  - Free tier max: ${BATCH_CONFIG.FREE_TIER_MAX_RECORDS} records`);
console.log(`  - Paid tier cost: $${BATCH_CONFIG.COST_PER_QUERY}/query`);
