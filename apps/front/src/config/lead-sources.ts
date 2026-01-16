/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LEAD SOURCES - Folder-Based Lead Source Architecture
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Each lead source folder has:
 * - Unique ID
 * - Tags & Labels for organization
 * - Sub-folders for CSV batches
 * - Auto-batching to 1K blocks for skip trace → SMS
 *
 * Flow: Upload CSV → Batch 1K → Skip Trace (Tracerfy) → SMS Blocks → Deploy
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { B2B_SECTORS, PARTNERSHIP_CATEGORIES } from "@/lib/datalake/schemas";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LeadSourceFolder {
  id: string;
  name: string;
  description: string;
  tags: string[];
  labels: LeadSourceLabel[];
  parentId: string | null;
  sector?: string;
  sicCodes?: string[];
  storagePath: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadSourceLabel {
  id: string;
  name: string;
  color: "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "gray";
}

export interface LeadSourceBatch {
  id: string;
  folderId: string;
  name: string;
  fileName: string;
  totalRecords: number;
  status: "uploaded" | "processing" | "enriched" | "deployed" | "error";
  blocks: SkipTraceBlock[];
  createdAt: Date;
  uploadedBy: string;
}

export interface SkipTraceBlock {
  id: string;
  batchId: string;
  blockNumber: number;
  size: number; // 1000 max
  status: "pending" | "tracing" | "traced" | "sms_ready" | "deployed" | "error";
  tracedAt?: Date;
  mobileCount: number;
  emailCount: number;
  smsBlockId?: string;
}

export interface SMSTemplateGroup {
  id: string;
  name: string;
  description: string;
  tags: string[];
  labels: LeadSourceLabel[];
  templates: SMSTemplate[];
  autoTags: AutoTag[];
  sector?: string;
  intent: "DISCOVERY" | "NURTURE" | "REACTIVATION" | "RETENTION";
  active: boolean;
  createdAt: Date;
}

export interface SMSTemplate {
  id: string;
  groupId: string;
  name: string;
  stage: "opener" | "nudge" | "value" | "close";
  message: string;
  charCount: number;
  variables: string[];
  active: boolean;
}

export interface AutoTag {
  id: string;
  trigger: "import" | "enrich" | "response" | "booking" | "classification";
  condition: string;
  tagToApply: string;
  labelToApply?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREDEFINED LABELS
// ═══════════════════════════════════════════════════════════════════════════════

export const LEAD_LABELS: Record<string, LeadSourceLabel> = {
  HOT: { id: "hot", name: "HOT", color: "red" },
  WARM: { id: "warm", name: "WARM", color: "orange" },
  COLD: { id: "cold", name: "COLD", color: "blue" },
  PRIORITY: { id: "priority", name: "PRIORITY", color: "purple" },
  DECISION_MAKER: { id: "dm", name: "Decision Maker", color: "green" },
  MOBILE_VERIFIED: { id: "mobile", name: "Mobile Verified", color: "green" },
  EMAIL_VERIFIED: { id: "email", name: "Email Verified", color: "green" },
  SMS_SENT: { id: "sms_sent", name: "SMS Sent", color: "yellow" },
  RESPONDED: { id: "responded", name: "Responded", color: "green" },
  BOOKED: { id: "booked", name: "Booked", color: "green" },
  SKIP_TRACED: { id: "skip_traced", name: "Skip Traced", color: "blue" },
  NEEDS_ENRICH: { id: "needs_enrich", name: "Needs Enrich", color: "gray" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PREDEFINED FOLDERS - Industry Lead Sources
// ═══════════════════════════════════════════════════════════════════════════════

export const LEAD_SOURCE_FOLDERS: Record<string, LeadSourceFolder> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // HOME SERVICES (Plumbing, HVAC, Electrical, etc.)
  // ═══════════════════════════════════════════════════════════════════════════
  HOME_SERVICES: {
    id: "hs_root",
    name: "Home Services",
    description: "Plumbing, HVAC, Electrical, Roofing contractors",
    tags: ["home-services", "trades", "contractors"],
    labels: [LEAD_LABELS.PRIORITY],
    parentId: null,
    sector: "construction-contractors",
    sicCodes: ["1711", "1721", "1731", "1751", "1761"],
    storagePath: "lead-sources/home-services/",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-14"),
  },

  PLUMBING_HVAC: {
    id: "hs_plumbing_hvac",
    name: "Plumbing & HVAC",
    description: "Plumbing and HVAC contractors - highest demand trades",
    tags: ["plumbing", "hvac", "essential-services"],
    labels: [LEAD_LABELS.HOT, LEAD_LABELS.PRIORITY],
    parentId: "hs_root",
    sector: "business-brokering-trades",
    sicCodes: ["1711"],
    storagePath: "lead-sources/home-services/plumbing-hvac/",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-14"),
  },

  ELECTRICAL: {
    id: "hs_electrical",
    name: "Electrical Contractors",
    description: "Commercial and residential electrical contractors",
    tags: ["electrical", "contractors"],
    labels: [LEAD_LABELS.WARM],
    parentId: "hs_root",
    sector: "construction-contractors",
    sicCodes: ["1731"],
    storagePath: "lead-sources/home-services/electrical/",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-14"),
  },

  ROOFING: {
    id: "hs_roofing",
    name: "Roofing Contractors",
    description: "Roofing contractors and repair services",
    tags: ["roofing", "contractors"],
    labels: [LEAD_LABELS.WARM],
    parentId: "hs_root",
    sector: "construction-contractors",
    sicCodes: ["1761"],
    storagePath: "lead-sources/home-services/roofing/",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-14"),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // REAL ESTATE
  // ═══════════════════════════════════════════════════════════════════════════
  REAL_ESTATE: {
    id: "re_root",
    name: "Real Estate",
    description: "Real estate agents, brokers, investors",
    tags: ["real-estate", "agents", "brokers"],
    labels: [LEAD_LABELS.PRIORITY],
    parentId: null,
    sector: "real-estate",
    sicCodes: ["6531", "6552"],
    storagePath: "lead-sources/real-estate/",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-14"),
  },

  RE_AGENTS: {
    id: "re_agents",
    name: "Real Estate Agents",
    description: "Licensed real estate agents and brokers",
    tags: ["agents", "brokers", "licensed"],
    labels: [LEAD_LABELS.HOT],
    parentId: "re_root",
    sector: "real-estate",
    sicCodes: ["6531"],
    storagePath: "lead-sources/real-estate/agents/",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-14"),
  },

  RE_INVESTORS: {
    id: "re_investors",
    name: "Real Estate Investors",
    description: "Property investors and flippers",
    tags: ["investors", "flippers", "acquisitions"],
    labels: [LEAD_LABELS.HOT, LEAD_LABELS.DECISION_MAKER],
    parentId: "re_root",
    sector: "real-estate",
    sicCodes: ["6552"],
    storagePath: "lead-sources/real-estate/investors/",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-14"),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // B2B TECH & CONSULTING
  // ═══════════════════════════════════════════════════════════════════════════
  B2B_TECH: {
    id: "b2b_root",
    name: "B2B Technology",
    description: "Tech companies, SaaS, consultants",
    tags: ["b2b", "technology", "saas"],
    labels: [LEAD_LABELS.PRIORITY],
    parentId: null,
    sector: "management-consulting-crm",
    sicCodes: ["8742", "8748", "7371", "7372"],
    storagePath: "lead-sources/b2b-tech/",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-14"),
  },

  CRM_CONSULTANTS: {
    id: "b2b_crm",
    name: "CRM Consultants",
    description: "Zoho, Salesforce, HubSpot consultants for partnerships",
    tags: ["crm", "zoho", "salesforce", "hubspot", "partnerships"],
    labels: [LEAD_LABELS.HOT, LEAD_LABELS.DECISION_MAKER],
    parentId: "b2b_root",
    sector: "management-consulting-crm",
    sicCodes: ["8742"],
    storagePath: "lead-sources/b2b-tech/crm-consultants/",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-14"),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TRUCKING & LOGISTICS
  // ═══════════════════════════════════════════════════════════════════════════
  TRUCKING: {
    id: "trucking_root",
    name: "Trucking & Logistics",
    description: "Trucking companies, fleet owners, logistics",
    tags: ["trucking", "logistics", "fleet"],
    labels: [],
    parentId: null,
    sector: "transportation-logistics",
    sicCodes: ["4212", "4213", "4214"],
    storagePath: "lead-sources/trucking/",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-14"),
  },

  FLEET_OWNERS: {
    id: "trucking_fleet",
    name: "Fleet Owners",
    description: "Trucking fleet owners 5+ trucks",
    tags: ["fleet", "owners", "decision-makers"],
    labels: [LEAD_LABELS.DECISION_MAKER],
    parentId: "trucking_root",
    sector: "transportation-logistics",
    sicCodes: ["4212", "4213"],
    storagePath: "lead-sources/trucking/fleet-owners/",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-14"),
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SMS TEMPLATE GROUPS - With IDs, Tags, Auto-Tags
// ═══════════════════════════════════════════════════════════════════════════════

export const SMS_TEMPLATE_GROUPS: Record<string, SMSTemplateGroup> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // HOME SERVICES SMS GROUP
  // ═══════════════════════════════════════════════════════════════════════════
  HOME_SERVICES_DISCOVERY: {
    id: "sms_hs_discovery",
    name: "Home Services Discovery",
    description: "SMS templates for Plumbing, HVAC, trades outreach",
    tags: ["home-services", "trades", "discovery"],
    labels: [LEAD_LABELS.PRIORITY],
    intent: "DISCOVERY",
    sector: "construction-contractors",
    active: true,
    createdAt: new Date("2026-01-01"),
    autoTags: [
      {
        id: "at_hs_response",
        trigger: "response",
        condition: "classification:POSITIVE",
        tagToApply: "engaged",
        labelToApply: "warm",
      },
      {
        id: "at_hs_booking",
        trigger: "booking",
        condition: "booking:confirmed",
        tagToApply: "meeting-booked",
        labelToApply: "hot",
      },
    ],
    templates: [
      {
        id: "hs_opener_1",
        groupId: "sms_hs_discovery",
        name: "Trade Owner Opener",
        stage: "opener",
        message:
          "Hi {firstName}, grow your {industry} biz without hiring sales? Our AI books jobs while you work. 15-min demo? Respond STOP to opt out from NEXTIER",
        charCount: 145,
        variables: ["firstName", "industry"],
        active: true,
      },
      {
        id: "hs_opener_2",
        groupId: "sms_hs_discovery",
        name: "HVAC/Plumbing Specific",
        stage: "opener",
        message:
          "Hi {firstName}, HVAC & plumbing owners are booking 20+ jobs/month with our AI. Quick call to show you? Respond STOP to opt out from NEXTIER",
        charCount: 142,
        variables: ["firstName"],
        active: true,
      },
      {
        id: "hs_nudge_1",
        groupId: "sms_hs_discovery",
        name: "Trade Nudge",
        stage: "nudge",
        message:
          "Hi {firstName}, still interested in automating lead follow-up? Can show you in 15 min. Respond STOP to opt out from NEXTIER",
        charCount: 125,
        variables: ["firstName"],
        active: true,
      },
      {
        id: "hs_close_1",
        groupId: "sms_hs_discovery",
        name: "Trade Close",
        stage: "close",
        message:
          "{firstName}, got a slot open today. Book here: {link} Respond STOP to opt out from NEXTIER",
        charCount: 85,
        variables: ["firstName", "link"],
        active: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // B2B DISCOVERY SMS GROUP
  // ═══════════════════════════════════════════════════════════════════════════
  B2B_DISCOVERY: {
    id: "sms_b2b_discovery",
    name: "B2B Discovery",
    description: "SMS templates for B2B tech, consultants, SaaS",
    tags: ["b2b", "tech", "discovery"],
    labels: [LEAD_LABELS.PRIORITY],
    intent: "DISCOVERY",
    sector: "management-consulting-crm",
    active: true,
    createdAt: new Date("2026-01-01"),
    autoTags: [
      {
        id: "at_b2b_response",
        trigger: "response",
        condition: "classification:POSITIVE",
        tagToApply: "engaged",
        labelToApply: "warm",
      },
      {
        id: "at_b2b_booking",
        trigger: "booking",
        condition: "booking:confirmed",
        tagToApply: "meeting-booked",
        labelToApply: "hot",
      },
    ],
    templates: [
      {
        id: "b2b_opener_1",
        groupId: "sms_b2b_discovery",
        name: "CEO Opener",
        stage: "opener",
        message:
          "Hi {firstName}, save 20+ hrs/week on outbound with AI. Quick call to show you? Respond STOP to opt out from NEXTIER",
        charCount: 113,
        variables: ["firstName"],
        active: true,
      },
      {
        id: "b2b_opener_2",
        groupId: "sms_b2b_discovery",
        name: "CRM Partner Opener",
        stage: "opener",
        message:
          "Hi {firstName}, offer your clients 10X CRM performance without changing systems. Partnership call? Respond STOP to opt out from NEXTIER",
        charCount: 138,
        variables: ["firstName"],
        active: true,
      },
      {
        id: "b2b_nudge_1",
        groupId: "sms_b2b_discovery",
        name: "B2B Nudge",
        stage: "nudge",
        message:
          "{firstName}, following up on AI outbound. CEOs saving 20 hrs/week. Worth 15 min? Respond STOP to opt out from NEXTIER",
        charCount: 117,
        variables: ["firstName"],
        active: true,
      },
      {
        id: "b2b_close_1",
        groupId: "sms_b2b_discovery",
        name: "B2B Close",
        stage: "close",
        message:
          "{firstName}, final reach out. Book 15 min here: {link} Respond STOP to opt out from NEXTIER",
        charCount: 90,
        variables: ["firstName", "link"],
        active: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // REAL ESTATE DISCOVERY SMS GROUP
  // ═══════════════════════════════════════════════════════════════════════════
  REAL_ESTATE_DISCOVERY: {
    id: "sms_re_discovery",
    name: "Real Estate Discovery",
    description: "SMS templates for real estate agents, brokers, investors",
    tags: ["real-estate", "agents", "discovery"],
    labels: [LEAD_LABELS.PRIORITY],
    intent: "DISCOVERY",
    sector: "real-estate",
    active: true,
    createdAt: new Date("2026-01-01"),
    autoTags: [
      {
        id: "at_re_response",
        trigger: "response",
        condition: "classification:POSITIVE",
        tagToApply: "engaged",
        labelToApply: "warm",
      },
      {
        id: "at_re_booking",
        trigger: "booking",
        condition: "booking:confirmed",
        tagToApply: "meeting-booked",
        labelToApply: "hot",
      },
    ],
    templates: [
      {
        id: "re_opener_1",
        groupId: "sms_re_discovery",
        name: "Agent Opener",
        stage: "opener",
        message:
          "Hi {firstName}, agents using AI are closing 3x more deals. 15-min demo to show you? Respond STOP to opt out from NEXTIER",
        charCount: 120,
        variables: ["firstName"],
        active: true,
      },
      {
        id: "re_opener_2",
        groupId: "sms_re_discovery",
        name: "Investor Opener",
        stage: "opener",
        message:
          "Hi {firstName}, find off-market deals before anyone else with AI lead gen. Quick call? Respond STOP to opt out from NEXTIER",
        charCount: 124,
        variables: ["firstName"],
        active: true,
      },
      {
        id: "re_nudge_1",
        groupId: "sms_re_discovery",
        name: "RE Nudge",
        stage: "nudge",
        message:
          "{firstName}, still interested in AI-powered lead gen? Can show you in 15 min. Respond STOP to opt out from NEXTIER",
        charCount: 114,
        variables: ["firstName"],
        active: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NURTURE SMS GROUP (Cross-sector)
  // ═══════════════════════════════════════════════════════════════════════════
  NURTURE: {
    id: "sms_nurture",
    name: "Nurture Campaign",
    description: "Stay top of mind - value-first touches",
    tags: ["nurture", "value", "long-term"],
    labels: [],
    intent: "NURTURE",
    active: true,
    createdAt: new Date("2026-01-01"),
    autoTags: [
      {
        id: "at_nurture_response",
        trigger: "response",
        condition: "classification:POSITIVE",
        tagToApply: "re-engaged",
        labelToApply: "warm",
      },
    ],
    templates: [
      {
        id: "nurture_value_1",
        groupId: "sms_nurture",
        name: "Value Touch",
        stage: "value",
        message:
          "Hi {firstName}, thought of you - businesses are saving 20 hrs/week with AI outbound. Let me know if helpful. Respond STOP to opt out from NEXTIER",
        charCount: 146,
        variables: ["firstName"],
        active: true,
      },
      {
        id: "nurture_value_2",
        groupId: "sms_nurture",
        name: "Check-in",
        stage: "value",
        message:
          "{firstName}, checking in. Any challenges with lead gen I can help with? Respond STOP to opt out from NEXTIER",
        charCount: 106,
        variables: ["firstName"],
        active: true,
      },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH CONFIGURATION - 1K Block Settings
// ═══════════════════════════════════════════════════════════════════════════════

export const BATCH_CONFIG = {
  // Skip trace block size
  SKIP_TRACE_BLOCK_SIZE: 1000,

  // SMS campaign block size
  SMS_BLOCK_SIZE: 2000,

  // Sub-blocks for staggered sending
  SMS_SUB_BLOCK_SIZE: 500,

  // Rate limits (from 10DLC)
  SMS_PER_MINUTE: 75,
  SMS_PER_SECOND: 1,

  // Cost per skip trace
  COST_PER_TRACE: 0.02,

  // Daily limits
  DAILY_TRACE_LIMIT: 2000,
  DAILY_SMS_LIMIT: 2000,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function getFolderById(id: string): LeadSourceFolder | undefined {
  return Object.values(LEAD_SOURCE_FOLDERS).find((f) => f.id === id);
}

export function getFoldersByParent(
  parentId: string | null,
): LeadSourceFolder[] {
  return Object.values(LEAD_SOURCE_FOLDERS).filter(
    (f) => f.parentId === parentId,
  );
}

export function getFoldersBySector(sector: string): LeadSourceFolder[] {
  return Object.values(LEAD_SOURCE_FOLDERS).filter((f) => f.sector === sector);
}

export function getTemplateGroupById(id: string): SMSTemplateGroup | undefined {
  return Object.values(SMS_TEMPLATE_GROUPS).find((g) => g.id === id);
}

export function getTemplateGroupsBySector(sector: string): SMSTemplateGroup[] {
  return Object.values(SMS_TEMPLATE_GROUPS).filter((g) => g.sector === sector);
}

export function getTemplatesByStage(
  groupId: string,
  stage: SMSTemplate["stage"],
): SMSTemplate[] {
  const group = getTemplateGroupById(groupId);
  if (!group) return [];
  return group.templates.filter((t) => t.stage === stage && t.active);
}

export function calculateBatchBlocks(recordCount: number): number {
  return Math.ceil(recordCount / BATCH_CONFIG.SKIP_TRACE_BLOCK_SIZE);
}

export function calculateBatchCost(recordCount: number): number {
  return recordCount * BATCH_CONFIG.COST_PER_TRACE;
}

console.log("[LeadSources] Loaded - Folder-based lead source architecture");
