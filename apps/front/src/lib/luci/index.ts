/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LUCI — Data Structure & Governance Engine
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * LUCI enforces structure BEFORE enrichment or scoring.
 *
 * RESPONSIBILITIES:
 * - Scan raw USBizData directories or uploaded lists
 * - Normalize schema (names, roles, geo, industry)
 * - Output deterministic execution blocks
 *
 * ALLOWED ATOMIC BLOCK SIZES:
 * - 1,000 records
 * - 2,000 records
 *
 * CAMPAIGN INVARIANT:
 * - 10,000 records = 1 Whole Campaign Block
 * - Billing, pacing, reporting, and compliance always roll up to 10k
 *
 * PIPELINE FLOW:
 * Raw CSV → LUCI (structure) → Tracerfy ($0.02) → Trestle ($0.03) → Decision Engine → SignalHouse
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type BlockSize = 1000 | 2000;
export type BlockStatus = "pending" | "enriching" | "scoring" | "ready" | "executing" | "completed";

export interface RawRecord {
  // USBizData fields
  company_name?: string;
  contact_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
  sic_code?: string;
  sic_description?: string;
  employees?: string | number;
  revenue?: string | number;
  website?: string;
  // Allow additional fields
  [key: string]: unknown;
}

export interface NormalizedRecord {
  // Identity
  id: string; // Generated ULID
  rowIndex: number; // Original row position

  // Contact
  firstName: string;
  lastName: string;
  fullName: string;
  company: string;

  // Location
  address: string;
  city: string;
  state: string;
  zip: string;
  county: string;

  // Industry
  sicCode: string;
  sicDescription: string;
  sector: string;
  subsector: string;

  // Business info
  employees: number | null;
  revenue: number | null;
  website: string;

  // Contact channels (to be enriched)
  phone: string | null;
  email: string | null;

  // Enrichment status
  tracerfyStatus: "pending" | "completed" | "failed";
  trestleStatus: "pending" | "completed" | "failed";

  // Contactability (from Trestle)
  contactabilityScore: number | null;
  contactGrade: string | null;
  activityScore: number | null;
  lineType: string | null;
  nameMatch: boolean | null;
  litigatorRisk: boolean | null;

  // Validation
  isValid: boolean;
  validationErrors: string[];
}

export interface ExecutionBlock {
  id: string; // Block ID (e.g., "blk_01ABC123")
  campaignId: string; // Parent campaign ID
  blockNumber: number; // Block sequence (1-10 for 10k campaign)
  size: BlockSize; // 1000 or 2000
  status: BlockStatus;

  // Records
  records: NormalizedRecord[];
  recordCount: number;

  // Stats
  validCount: number;
  enrichedCount: number;
  scoredCount: number;
  readyCount: number; // Passed all gates

  // Timing
  createdAt: Date;
  enrichmentStartedAt: Date | null;
  enrichmentCompletedAt: Date | null;
  scoringStartedAt: Date | null;
  scoringCompletedAt: Date | null;
  executionStartedAt: Date | null;
  executionCompletedAt: Date | null;
}

export interface CampaignManifest {
  id: string; // Campaign ID
  name: string;
  sector: string;
  sicCodes: string[];

  // Source
  sourceFile: string;
  totalRawRecords: number;

  // Blocks
  blocks: ExecutionBlock[];
  totalBlocks: number;
  blockSize: BlockSize;

  // Progress
  blocksCompleted: number;
  recordsProcessed: number;
  recordsReady: number;

  // Cost tracking
  tracerfyCost: number;
  trestleCost: number;
  totalCost: number;

  // Timing
  createdAt: Date;
  completedAt: Date | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const LUCI_CONFIG = {
  // Block sizes
  ALLOWED_BLOCK_SIZES: [1000, 2000] as const,
  DEFAULT_BLOCK_SIZE: 2000 as BlockSize,

  // Campaign invariant
  RECORDS_PER_CAMPAIGN: 10000,
  BLOCKS_PER_CAMPAIGN_1K: 10, // 10 × 1000 = 10,000
  BLOCKS_PER_CAMPAIGN_2K: 5, // 5 × 2000 = 10,000

  // Enrichment costs
  TRACERFY_COST_PER_RECORD: 0.02,
  TRESTLE_COST_PER_LOOKUP: 0.03,
  AVG_PHONES_PER_RECORD: 3,

  // Validation
  MIN_NAME_LENGTH: 2,
  VALID_STATES: [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"
  ],
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ULID GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${timestamp}${random}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse a full name into first and last name
 */
function parseName(fullName: string): { firstName: string; lastName: string } {
  const cleaned = fullName.trim().replace(/\s+/g, " ");
  const parts = cleaned.split(" ");

  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  // Handle common patterns
  // "John Smith" → first: John, last: Smith
  // "John A. Smith" → first: John, last: Smith
  // "John Smith Jr." → first: John, last: Smith Jr.
  const suffixes = ["Jr.", "Jr", "Sr.", "Sr", "II", "III", "IV"];
  const lastPart = parts[parts.length - 1];

  if (suffixes.includes(lastPart) && parts.length > 2) {
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(" "),
    };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

/**
 * Clean and normalize a phone number
 */
function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return digits;
  return null;
}

/**
 * Clean and normalize an email
 */
function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const cleaned = email.trim().toLowerCase();
  if (!cleaned.includes("@") || !cleaned.includes(".")) return null;
  return cleaned;
}

/**
 * Clean and normalize a state code
 */
function normalizeState(state: string | null | undefined): string {
  if (!state) return "";
  const cleaned = state.trim().toUpperCase();
  if (LUCI_CONFIG.VALID_STATES.includes(cleaned)) return cleaned;

  // Handle full state names
  const stateMap: Record<string, string> = {
    "ALABAMA": "AL", "ALASKA": "AK", "ARIZONA": "AZ", "ARKANSAS": "AR",
    "CALIFORNIA": "CA", "COLORADO": "CO", "CONNECTICUT": "CT", "DELAWARE": "DE",
    "FLORIDA": "FL", "GEORGIA": "GA", "HAWAII": "HI", "IDAHO": "ID",
    "ILLINOIS": "IL", "INDIANA": "IN", "IOWA": "IA", "KANSAS": "KS",
    "KENTUCKY": "KY", "LOUISIANA": "LA", "MAINE": "ME", "MARYLAND": "MD",
    "MASSACHUSETTS": "MA", "MICHIGAN": "MI", "MINNESOTA": "MN", "MISSISSIPPI": "MS",
    "MISSOURI": "MO", "MONTANA": "MT", "NEBRASKA": "NE", "NEVADA": "NV",
    "NEW HAMPSHIRE": "NH", "NEW JERSEY": "NJ", "NEW MEXICO": "NM", "NEW YORK": "NY",
    "NORTH CAROLINA": "NC", "NORTH DAKOTA": "ND", "OHIO": "OH", "OKLAHOMA": "OK",
    "OREGON": "OR", "PENNSYLVANIA": "PA", "RHODE ISLAND": "RI", "SOUTH CAROLINA": "SC",
    "SOUTH DAKOTA": "SD", "TENNESSEE": "TN", "TEXAS": "TX", "UTAH": "UT",
    "VERMONT": "VT", "VIRGINIA": "VA", "WASHINGTON": "WA", "WEST VIRGINIA": "WV",
    "WISCONSIN": "WI", "WYOMING": "WY", "DISTRICT OF COLUMBIA": "DC",
  };

  return stateMap[cleaned] || "";
}

/**
 * Normalize a ZIP code to 5 digits
 */
function normalizeZip(zip: string | null | undefined): string {
  if (!zip) return "";
  const cleaned = zip.replace(/\D/g, "");
  return cleaned.slice(0, 5).padStart(5, "0");
}

/**
 * Map SIC code to sector/subsector
 */
function mapSICToSector(sicCode: string): { sector: string; subsector: string } {
  const code = sicCode.replace(/\D/g, "");

  // Construction (15xx-17xx)
  if (code >= "1500" && code <= "1799") {
    if (code === "1711") return { sector: "construction", subsector: "plumbing-hvac" };
    if (code === "1731") return { sector: "construction", subsector: "electrical" };
    if (code === "1761") return { sector: "construction", subsector: "roofing" };
    return { sector: "construction", subsector: "general" };
  }

  // Transportation (40xx-47xx)
  if (code >= "4000" && code <= "4799") {
    if (["4212", "4213", "4214"].includes(code)) {
      return { sector: "transportation", subsector: "trucking" };
    }
    return { sector: "transportation", subsector: "logistics" };
  }

  // Default
  return { sector: "other", subsector: "general" };
}

/**
 * Normalize a raw record into structured format
 */
export function normalizeRecord(raw: RawRecord, rowIndex: number): NormalizedRecord {
  const validationErrors: string[] = [];

  // Parse name
  let firstName = raw.first_name?.trim() || "";
  let lastName = raw.last_name?.trim() || "";

  if (!firstName && !lastName && raw.contact_name) {
    const parsed = parseName(raw.contact_name);
    firstName = parsed.firstName;
    lastName = parsed.lastName;
  }

  const fullName = `${firstName} ${lastName}`.trim();

  // Validate name
  if (fullName.length < LUCI_CONFIG.MIN_NAME_LENGTH) {
    validationErrors.push("Name too short or missing");
  }

  // Check for business entities (skip these for person lookup)
  const businessPatterns = /\b(LLC|INC|CORP|LTD|LP|LLP|TRUST|ESTATE|HOLDINGS|GROUP|PARTNERS|ASSOCIATES)\b/i;
  if (businessPatterns.test(fullName)) {
    validationErrors.push("Business entity name - not a person");
  }

  // Normalize location
  const state = normalizeState(raw.state);
  const zip = normalizeZip(raw.zip);

  if (!state) {
    validationErrors.push("Invalid or missing state");
  }

  if (!raw.address?.trim()) {
    validationErrors.push("Missing address");
  }

  // Map SIC code
  const sicCode = raw.sic_code?.replace(/\D/g, "") || "";
  const { sector, subsector } = mapSICToSector(sicCode);

  // Parse numeric fields
  const employees = raw.employees
    ? parseInt(String(raw.employees).replace(/\D/g, ""), 10) || null
    : null;

  const revenue = raw.revenue
    ? parseInt(String(raw.revenue).replace(/\D/g, ""), 10) || null
    : null;

  return {
    id: generateId("rec"),
    rowIndex,

    firstName,
    lastName,
    fullName,
    company: raw.company_name?.trim() || "",

    address: raw.address?.trim() || "",
    city: raw.city?.trim() || "",
    state,
    zip,
    county: raw.county?.trim() || "",

    sicCode,
    sicDescription: raw.sic_description?.trim() || "",
    sector,
    subsector,

    employees,
    revenue,
    website: raw.website?.trim() || "",

    phone: normalizePhone(raw.phone),
    email: normalizeEmail(raw.email),

    tracerfyStatus: "pending",
    trestleStatus: "pending",

    contactabilityScore: null,
    contactGrade: null,
    activityScore: null,
    lineType: null,
    nameMatch: null,
    litigatorRisk: null,

    isValid: validationErrors.length === 0,
    validationErrors,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCK CREATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Split records into execution blocks
 */
export function createBlocks(
  records: NormalizedRecord[],
  campaignId: string,
  blockSize: BlockSize = LUCI_CONFIG.DEFAULT_BLOCK_SIZE
): ExecutionBlock[] {
  const blocks: ExecutionBlock[] = [];
  const validRecords = records.filter((r) => r.isValid);

  for (let i = 0; i < validRecords.length; i += blockSize) {
    const blockRecords = validRecords.slice(i, i + blockSize);
    const blockNumber = Math.floor(i / blockSize) + 1;

    blocks.push({
      id: generateId("blk"),
      campaignId,
      blockNumber,
      size: blockSize,
      status: "pending",

      records: blockRecords,
      recordCount: blockRecords.length,

      validCount: blockRecords.length,
      enrichedCount: 0,
      scoredCount: 0,
      readyCount: 0,

      createdAt: new Date(),
      enrichmentStartedAt: null,
      enrichmentCompletedAt: null,
      scoringStartedAt: null,
      scoringCompletedAt: null,
      executionStartedAt: null,
      executionCompletedAt: null,
    });
  }

  return blocks;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAMPAIGN MANIFEST
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a campaign manifest from raw records
 */
export function createCampaignManifest(
  rawRecords: RawRecord[],
  options: {
    name: string;
    sourceFile: string;
    blockSize?: BlockSize;
  }
): CampaignManifest {
  const campaignId = generateId("cmp");
  const blockSize = options.blockSize || LUCI_CONFIG.DEFAULT_BLOCK_SIZE;

  // Normalize all records
  const normalizedRecords = rawRecords.map((raw, index) =>
    normalizeRecord(raw, index)
  );

  // Extract unique SIC codes
  const sicCodes = [...new Set(normalizedRecords.map((r) => r.sicCode).filter(Boolean))];

  // Determine primary sector
  const sectorCounts = normalizedRecords.reduce((acc, r) => {
    acc[r.sector] = (acc[r.sector] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const primarySector = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "other";

  // Create blocks
  const blocks = createBlocks(normalizedRecords, campaignId, blockSize);

  // Calculate costs
  const validCount = normalizedRecords.filter((r) => r.isValid).length;
  const tracerfyCost = validCount * LUCI_CONFIG.TRACERFY_COST_PER_RECORD;
  const trestleCost = validCount * LUCI_CONFIG.AVG_PHONES_PER_RECORD * LUCI_CONFIG.TRESTLE_COST_PER_LOOKUP;

  return {
    id: campaignId,
    name: options.name,
    sector: primarySector,
    sicCodes,

    sourceFile: options.sourceFile,
    totalRawRecords: rawRecords.length,

    blocks,
    totalBlocks: blocks.length,
    blockSize,

    blocksCompleted: 0,
    recordsProcessed: 0,
    recordsReady: 0,

    tracerfyCost,
    trestleCost,
    totalCost: tracerfyCost + trestleCost,

    createdAt: new Date(),
    completedAt: null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATS & REPORTING
// ═══════════════════════════════════════════════════════════════════════════════

export interface ManifestStats {
  totalRawRecords: number;
  validRecords: number;
  invalidRecords: number;
  validationRate: number;

  totalBlocks: number;
  blocksSize: BlockSize;
  campaignsNeeded: number;

  estimatedTracerfyCost: number;
  estimatedTrestleCost: number;
  estimatedTotalCost: number;

  validationErrors: { error: string; count: number }[];
}

/**
 * Generate stats for a campaign manifest
 */
export function getManifestStats(manifest: CampaignManifest): ManifestStats {
  const allRecords = manifest.blocks.flatMap((b) => b.records);
  const validRecords = allRecords.filter((r) => r.isValid);
  const invalidRecords = manifest.totalRawRecords - validRecords.length;

  // Count validation errors
  const errorCounts: Record<string, number> = {};
  for (const record of allRecords) {
    for (const error of record.validationErrors) {
      errorCounts[error] = (errorCounts[error] || 0) + 1;
    }
  }

  const validationErrors = Object.entries(errorCounts)
    .map(([error, count]) => ({ error, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalRawRecords: manifest.totalRawRecords,
    validRecords: validRecords.length,
    invalidRecords,
    validationRate: validRecords.length / manifest.totalRawRecords,

    totalBlocks: manifest.totalBlocks,
    blocksSize: manifest.blockSize,
    campaignsNeeded: Math.ceil(manifest.totalBlocks / (LUCI_CONFIG.RECORDS_PER_CAMPAIGN / manifest.blockSize)),

    estimatedTracerfyCost: manifest.tracerfyCost,
    estimatedTrestleCost: manifest.trestleCost,
    estimatedTotalCost: manifest.totalCost,

    validationErrors,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LUCI CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class LUCI {
  private manifests: Map<string, CampaignManifest> = new Map();

  /**
   * Ingest raw records and create a campaign manifest
   */
  ingest(
    rawRecords: RawRecord[],
    options: {
      name: string;
      sourceFile: string;
      blockSize?: BlockSize;
    }
  ): CampaignManifest {
    console.log(`[LUCI] Ingesting ${rawRecords.length} raw records...`);

    const manifest = createCampaignManifest(rawRecords, options);
    this.manifests.set(manifest.id, manifest);

    const stats = getManifestStats(manifest);
    console.log(`[LUCI] Created manifest ${manifest.id}:`);
    console.log(`  - Valid records: ${stats.validRecords}/${stats.totalRawRecords} (${(stats.validationRate * 100).toFixed(1)}%)`);
    console.log(`  - Blocks: ${stats.totalBlocks} × ${stats.blocksSize}`);
    console.log(`  - Campaigns needed: ${stats.campaignsNeeded}`);
    console.log(`  - Estimated cost: $${stats.estimatedTotalCost.toFixed(2)}`);

    if (stats.validationErrors.length > 0) {
      console.log(`  - Top validation errors:`);
      for (const { error, count } of stats.validationErrors.slice(0, 3)) {
        console.log(`    • ${error}: ${count}`);
      }
    }

    return manifest;
  }

  /**
   * Get a manifest by ID
   */
  getManifest(id: string): CampaignManifest | null {
    return this.manifests.get(id) || null;
  }

  /**
   * Get all manifests
   */
  getAllManifests(): CampaignManifest[] {
    return Array.from(this.manifests.values());
  }

  /**
   * Get the next block to process for a manifest
   */
  getNextBlock(manifestId: string): ExecutionBlock | null {
    const manifest = this.manifests.get(manifestId);
    if (!manifest) return null;

    return manifest.blocks.find((b) => b.status === "pending") || null;
  }

  /**
   * Update block status
   */
  updateBlockStatus(
    manifestId: string,
    blockId: string,
    status: BlockStatus
  ): boolean {
    const manifest = this.manifests.get(manifestId);
    if (!manifest) return false;

    const block = manifest.blocks.find((b) => b.id === blockId);
    if (!block) return false;

    block.status = status;

    // Update timestamps
    const now = new Date();
    switch (status) {
      case "enriching":
        block.enrichmentStartedAt = now;
        break;
      case "scoring":
        block.enrichmentCompletedAt = now;
        block.scoringStartedAt = now;
        break;
      case "ready":
        block.scoringCompletedAt = now;
        break;
      case "executing":
        block.executionStartedAt = now;
        break;
      case "completed":
        block.executionCompletedAt = now;
        manifest.blocksCompleted++;
        break;
    }

    return true;
  }

  /**
   * Update records in a block with enrichment data
   */
  updateBlockRecords(
    manifestId: string,
    blockId: string,
    updates: Partial<NormalizedRecord>[]
  ): boolean {
    const manifest = this.manifests.get(manifestId);
    if (!manifest) return false;

    const block = manifest.blocks.find((b) => b.id === blockId);
    if (!block) return false;

    for (let i = 0; i < updates.length && i < block.records.length; i++) {
      Object.assign(block.records[i], updates[i]);
    }

    // Recalculate stats
    block.enrichedCount = block.records.filter((r) => r.tracerfyStatus === "completed").length;
    block.scoredCount = block.records.filter((r) => r.trestleStatus === "completed").length;
    block.readyCount = block.records.filter(
      (r) =>
        r.tracerfyStatus === "completed" &&
        r.trestleStatus === "completed" &&
        r.contactGrade &&
        ["A", "B"].includes(r.contactGrade) &&
        !r.litigatorRisk
    ).length;

    // Update manifest totals
    manifest.recordsProcessed = manifest.blocks.reduce((sum, b) => sum + b.enrichedCount, 0);
    manifest.recordsReady = manifest.blocks.reduce((sum, b) => sum + b.readyCount, 0);

    return true;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════

let luciInstance: LUCI | null = null;

export function getLUCI(): LUCI {
  if (!luciInstance) {
    luciInstance = new LUCI();
  }
  return luciInstance;
}

console.log("[LUCI] Data Structure & Governance Engine loaded");
console.log(`  - Block sizes: ${LUCI_CONFIG.ALLOWED_BLOCK_SIZES.join(", ")}`);
console.log(`  - Records per campaign: ${LUCI_CONFIG.RECORDS_PER_CAMPAIGN}`);
