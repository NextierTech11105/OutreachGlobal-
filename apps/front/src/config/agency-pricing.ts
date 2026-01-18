/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AGENCY PRICING & MARGINS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Pricing configuration for white-label/agency reselling.
 * The killer stack: Tracerfy ($0.02) + Trestle ($0.03) = ML-ready leads
 *
 * PIPELINE FLOW:
 * Property CSV → Tracerfy Discovery → Trestle Verification → Pre-Queue Filter → SignalHouse SMS → GHL
 *
 * MARGIN TARGETS: 50-70% gross margin before platform fees
 */

// ═══════════════════════════════════════════════════════════════════════════════
// BASE COSTS (What we pay)
// ═══════════════════════════════════════════════════════════════════════════════

export const BASE_COSTS = {
  // Tracerfy Skip Trace
  tracerfy: {
    normal: 0.02, // $0.02/property - owner name, phones (up to 8), emails (up to 5)
    enhanced: 0.15, // $0.15/property - includes relatives, aliases, business associations
  },

  // Trestle Real Contact API
  trestle: {
    perLookup: 0.03, // $0.03/phone lookup - validation, activity score, contact grade
    averagePhonesPerProperty: 3, // Tracerfy returns ~3 phones per property on average
  },

  // SignalHouse SMS (10DLC)
  signalHouse: {
    perSMS: 0.0075, // $0.0075/SMS sent
    perMMS: 0.02, // $0.02/MMS sent
  },

  // Effective cost per property (Tracerfy + Trestle for 3 phones)
  get perPropertyTotal() {
    return (
      this.tracerfy.normal +
      this.trestle.perLookup * this.trestle.averagePhonesPerProperty
    );
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// AGENCY PRICING TIERS
// ═══════════════════════════════════════════════════════════════════════════════

export type AgencyTier = "data_only" | "ai_sdr_lite" | "full_stack";

export interface AgencyTierConfig {
  id: AgencyTier;
  name: string;
  description: string;

  // Per-lead pricing
  perLeadPrice: number; // What we charge agency per lead
  perLeadCost: number; // What it costs us

  // Per-lookup pricing (Trestle)
  perLookupPrice: number;
  perLookupCost: number;

  // Per-SMS pricing
  perSMSPrice: number;
  perSMSCost: number;

  // Monthly platform fee
  monthlyFee: number;

  // Included features
  features: string[];

  // Margin calculation
  get margin(): number;
}

export const AGENCY_TIERS: Record<AgencyTier, AgencyTierConfig> = {
  // Tier 1: Data Only - Tracerfy + Trestle (no SMS)
  data_only: {
    id: "data_only",
    name: "Data Only",
    description: "Skip trace + verification only, no SMS campaigns",

    perLeadPrice: 0.2, // $0.20/lead
    perLeadCost: 0.11, // $0.11/lead (Tracerfy + Trestle)

    perLookupPrice: 0.06, // $0.06/lookup
    perLookupCost: 0.03, // $0.03/lookup

    perSMSPrice: 0, // Not included
    perSMSCost: 0,

    monthlyFee: 0,

    features: [
      "Tracerfy skip trace (up to 8 phones, 5 emails per property)",
      "Trestle verification & scoring",
      "Contact grade A-F",
      "Activity score 0-100",
      "Name match verification",
      "Line type detection",
      "Litigator risk check",
      "CSV export",
    ],

    get margin() {
      return (this.perLeadPrice - this.perLeadCost) / this.perLeadPrice;
    },
  },

  // Tier 2: AI SDR Lite - Data + 1 SMS campaign + reply AI
  ai_sdr_lite: {
    id: "ai_sdr_lite",
    name: "AI SDR Lite",
    description: "Data + 1 campaign + AI reply classification",

    perLeadPrice: 0.25, // $0.25/lead
    perLeadCost: 0.11, // $0.11/lead

    perLookupPrice: 0.06,
    perLookupCost: 0.03,

    perSMSPrice: 0.015, // $0.015/SMS
    perSMSCost: 0.0075, // $0.0075/SMS

    monthlyFee: 500, // $500/month platform fee

    features: [
      "Everything in Data Only",
      "1 SMS campaign per list",
      "GIANNA AI opener",
      "AI reply classification",
      "Hot lead alerts",
      "GHL task creation",
      "10DLC compliant delivery",
    ],

    get margin() {
      return (this.perLeadPrice - this.perLeadCost) / this.perLeadPrice;
    },
  },

  // Tier 3: Full Stack - Unlimited campaigns + call routing
  full_stack: {
    id: "full_stack",
    name: "Full Stack",
    description: "Unlimited campaigns + full AI workforce + call routing",

    perLeadPrice: 0.3, // $0.30/lead
    perLeadCost: 0.11, // $0.11/lead

    perLookupPrice: 0.06,
    perLookupCost: 0.03,

    perSMSPrice: 0.015,
    perSMSCost: 0.0075,

    monthlyFee: 1500, // $1,500/month per sub-group

    features: [
      "Everything in AI SDR Lite",
      "Unlimited SMS campaigns",
      "GIANNA + CATHY + SABRINA AI workforce",
      "Call routing to GHL",
      "Appointment booking",
      "Nurture sequences",
      "Power dialer integration",
      "White label branding",
      "Custom sender ID",
      "Priority support",
    ],

    get margin() {
      return (this.perLeadPrice - this.perLeadCost) / this.perLeadPrice;
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MARGIN CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface MarginCalculation {
  properties: number;
  tier: AgencyTier;

  // Costs
  tracerfyCost: number;
  trestleCost: number;
  totalCost: number;

  // Revenue
  leadRevenue: number;
  lookupRevenue: number;
  platformFee: number;
  totalRevenue: number;

  // Margin
  grossProfit: number;
  grossMarginPercent: number;
}

export function calculateAgencyMargin(
  properties: number,
  tier: AgencyTier,
  phonesPerProperty: number = 3
): MarginCalculation {
  const config = AGENCY_TIERS[tier];
  const totalLookups = properties * phonesPerProperty;

  // Costs
  const tracerfyCost = properties * BASE_COSTS.tracerfy.normal;
  const trestleCost = totalLookups * BASE_COSTS.trestle.perLookup;
  const totalCost = tracerfyCost + trestleCost;

  // Revenue
  const leadRevenue = properties * config.perLeadPrice;
  const lookupRevenue = totalLookups * config.perLookupPrice;
  const platformFee = config.monthlyFee;
  const totalRevenue = leadRevenue + lookupRevenue + platformFee;

  // Margin
  const grossProfit = totalRevenue - totalCost;
  const grossMarginPercent = (grossProfit / totalRevenue) * 100;

  return {
    properties,
    tier,
    tracerfyCost,
    trestleCost,
    totalCost,
    leadRevenue,
    lookupRevenue,
    platformFee,
    totalRevenue,
    grossProfit,
    grossMarginPercent,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE DEMO THAT SELLS ITSELF
// ═══════════════════════════════════════════════════════════════════════════════

export const DEMO_FLOW = {
  properties: 100,
  steps: [
    {
      step: 1,
      action: "Upload 100 properties in Nextier Import",
      time: "0:00",
    },
    {
      step: 2,
      action: 'Click "Enrich" → Tracerfy job starts',
      time: "0:01",
    },
    {
      step: 3,
      action: "5 minutes later: 300 phones appear",
      time: "5:00",
    },
    {
      step: 4,
      action: 'Click "Verify" → Trestle scores populate (A, B, C, D, F)',
      time: "5:30",
    },
    {
      step: 5,
      action: "Filter to Grade A only: 80 phones remain",
      time: "6:00",
    },
    {
      step: 6,
      action: "Build campaign → Send 80 SMS via SignalHouse",
      time: "7:00",
    },
    {
      step: 7,
      action: "Get 12 replies (15% reply rate)",
      time: "10:00",
    },
    {
      step: 8,
      action: 'AI classifies 3 as "hot" → auto-create GHL tasks',
      time: "10:05",
    },
    {
      step: 9,
      action: "Agent calls, books 1 appointment",
      time: "15:00",
    },
  ],

  // Demo cost breakdown
  costs: {
    tracerfy: 2.0, // 100 × $0.02
    trestle: 9.0, // 300 × $0.03
    sms: 0.6, // 80 × $0.0075
    total: 11.6,
  },

  // Demo results
  results: {
    replies: 12,
    replyRate: 0.15, // 15%
    hotLeads: 3,
    appointments: 1,
    dealValue: 10000, // $10K wholesale fee
    roi: 86000, // 86,000% ROI
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PRE-QUEUE FILTER DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════════

export const PRE_QUEUE_FILTER_DEFAULTS = {
  // Only Grade A/B leads pass
  minContactGrade: "B" as const,
  allowedGrades: ["A", "B"] as const,

  // Activity score threshold
  minActivityScore: 70,

  // Line type filter
  allowedLineTypes: ["Mobile"] as const,
  blockLineTypes: ["Landline", "VoIP"] as const,

  // Name match required
  requireNameMatch: true,

  // Litigator check
  blockLitigators: true,

  // Expected filter rate (27-40% of phones qualify)
  expectedQualifyRate: {
    min: 0.27,
    max: 0.4,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPETITIVE COMPARISON
// ═══════════════════════════════════════════════════════════════════════════════

export const COMPETITIVE_COMPARISON = {
  ghlNative: {
    name: "GHL Lead Connector / TextGrid",
    perSMS: 0.015, // $0.01-0.02/SMS
    verification: false,
    scoring: false,
    wastedSends: 0.35, // 30-50% wasted on disconnected/wrong numbers
    mlReady: false,
    weakness:
      "Charges for SMS but doesn't verify numbers first - 30-50% waste",
  },

  nextierStack: {
    name: "Nextier + Tracerfy + Trestle + SignalHouse",
    perLead: 0.11, // Total enrichment cost
    perSMS: 0.0075,
    verification: true,
    scoring: true,
    wastedSends: 0.05, // <5% waste after Grade A/B filter
    mlReady: true,
    advantage:
      "Verifies before send - lower effective cost per conversation, ML-ready data",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

console.log("[Agency Pricing] Loaded pricing configuration");
console.log(
  `  - Base cost per property: $${BASE_COSTS.perPropertyTotal.toFixed(2)}`
);
console.log(
  `  - Data Only margin: ${(AGENCY_TIERS.data_only.margin * 100).toFixed(0)}%`
);
console.log(
  `  - AI SDR Lite margin: ${(AGENCY_TIERS.ai_sdr_lite.margin * 100).toFixed(0)}%`
);
console.log(
  `  - Full Stack margin: ${(AGENCY_TIERS.full_stack.margin * 100).toFixed(0)}%`
);
