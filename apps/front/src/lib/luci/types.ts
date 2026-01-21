/**
 * LUCI Types - Data Authority & Compliance Gatekeeper
 *
 * LUCI is the ONLY authority on:
 * - Skip trace data truth
 * - Contactability verification
 * - Compliance status
 * - Campaign readiness
 *
 * NEVA may NEVER override LUCI decisions.
 */

// =============================================================================
// STATUS ENUMS
// =============================================================================

export type LuciStatus =
  | "RAW"              // Imported, untouched
  | "PENDING_TRACE"    // Waiting for skip trace
  | "TRACED"           // Tracerfy complete
  | "PENDING_VERIFY"   // Waiting for Trestle verification
  | "VERIFIED"         // Trestle passed
  | "CAMPAIGN_READY"   // Cleared for outreach
  | "SUPPRESSED"       // Compliance block (DNC, litigator, opt-out)
  | "FAILED"           // Enrichment failed

export type LineType = "mobile" | "landline" | "voip" | "unknown";

export type SuppressionReason =
  | "DNC"              // Do Not Call registry
  | "LITIGATOR"        // Known TCPA litigator
  | "OPT_OUT"          // User sent STOP
  | "WRONG_NUMBER"     // Confirmed wrong number
  | "INVALID_PHONE"    // Phone validation failed
  | "COMPLIANCE_HOLD"  // Manual compliance hold

// =============================================================================
// CORE INTERFACES
// =============================================================================

export interface LuciContactability {
  line_type: LineType;
  carrier: string | null;
  is_valid: boolean;
  dnc: boolean;
  litigator: boolean;
  score: number; // 0-100, higher = more contactable
}

export interface LuciConstraints {
  no_contact_reasons: SuppressionReason[];
  compliance_locked: boolean;
  cooldown_until: Date | null;
}

export interface LuciApprovedLead {
  lead_id: string;
  team_id: string;
  tenant_slug: string;
  source: string;

  // Business info
  business: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    sic_code: string | null;
    industry: string | null;
  };

  // Owner/contact info
  owner: {
    first_name: string;
    last_name: string;
    name: string; // Full name
    mobile: string;
    email: string | null;
  };

  // Contactability assessment (LUCI authority)
  contactability: LuciContactability;

  // Campaign context for downstream
  campaign_context: {
    campaign_id: string | null;
    intent: string;
    channel: "sms" | "voice" | "email";
    worker_stage: "GIANNA" | "CATHY" | "SABRINA";
  };

  // Compliance constraints (LUCI authority)
  constraints: LuciConstraints;

  // Metadata
  status: LuciStatus;
  traced_at: Date | null;
  verified_at: Date | null;
  approved_at: Date | null;
}

// =============================================================================
// RECHECK INTERFACE (NEVA risk_flag → LUCI recheck)
// =============================================================================

export interface LuciRecheckRequest {
  lead_id: string;
  team_id: string;
  triggered_by: "NEVA_RISK_FLAG" | "MANUAL" | "WEBHOOK";
  risk_flags: {
    reputation: boolean;
    legal: boolean;
    financial_distress: boolean;
  };
  context?: string;
}

export interface LuciRecheckResult {
  lead_id: string;
  previous_status: LuciStatus;
  new_status: LuciStatus;
  suppression_reason: SuppressionReason | null;
  action_taken: "APPROVED" | "SUPPRESSED" | "HOLD_FOR_REVIEW";
  reviewed_at: Date;
}

// =============================================================================
// APPROVAL RESULT
// =============================================================================

export interface LuciApprovalResult {
  success: boolean;
  lead_id: string;
  status: LuciStatus;
  can_contact: boolean;
  reason?: string;
  approved_lead?: LuciApprovedLead;
}

// =============================================================================
// CAMPAIGN MANIFEST & EXECUTION BLOCKS (Data Pipeline)
// =============================================================================

export interface ExecutionBlock {
  id: string;
  index: number;
  records: RawIngestRecord[];
  status: "pending" | "processing" | "completed" | "failed";
  startedAt?: Date;
  completedAt?: Date;
}

export interface RawIngestRecord {
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  sicCode?: string;
}

export interface CampaignManifest {
  id: string;
  name: string;
  sourceFile: string;
  totalRecords: number;
  blocks: ExecutionBlock[];
  estimatedCost: {
    tracerfy: number;
    trestle: number;
    total: number;
  };
  createdAt: Date;
  status: "building" | "processing" | "completed" | "failed";
}
