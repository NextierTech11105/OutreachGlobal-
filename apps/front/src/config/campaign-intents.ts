/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CAMPAIGN INTENTS - Purpose-Driven Campaign Architecture
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PHILOSOPHY:
 * - Each campaign has its own ID and INTENT
 * - Intent defines the OUTCOME we seek
 * - Groups are built based on STAGE + INTENT
 * - All roads lead to: 15-MIN DISCOVERY → QUALIFICATION → DEAL
 *
 * SCALE FORMULA:
 * High-Impact Interactions = Automation Capacity × Numbers Game
 *
 * We scale the automation that does the activities and actions
 * to pump out the numbers that feed high-impact meetings.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { SIGNALHOUSE_10DLC, THE_LOOP } from "./constants";

// ═══════════════════════════════════════════════════════════════════════════════
// CAMPAIGN INTENT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type CampaignIntent =
  | "DISCOVERY" // Get them on a 15-min call
  | "QUALIFICATION" // Qualify interest and fit
  | "NURTURE" // Stay top of mind
  | "REACTIVATION" // Wake up cold leads
  | "RETENTION" // Keep existing relationships warm
  | "REFERRAL"; // Ask for introductions

export type CampaignOutcome =
  | "15_MIN_MEETING"
  | "EMAIL_CAPTURE"
  | "MOBILE_CONFIRMED"
  | "PERMISSION_GRANTED"
  | "QUALIFIED_LEAD"
  | "DEAL_CLOSED";

export type LeadTemperature = "COLD" | "WARM" | "HOT";

// ═══════════════════════════════════════════════════════════════════════════════
// CAMPAIGN DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

export interface Campaign {
  id: string;
  name: string;
  signalhouseCampaignId: string;
  intent: CampaignIntent;
  primaryOutcome: CampaignOutcome;
  secondaryOutcomes: CampaignOutcome[];
  vertical: string;
  personaIds: string[];
  stages: CampaignStage[];
  loopDays: readonly number[];
  worker: "GIANNA" | "CATHY" | "SABRINA";
  active: boolean;
  createdAt: Date;
}

export interface CampaignStage {
  id: string;
  name: string;
  order: number;
  intent: CampaignIntent;
  templateStage: "opener" | "nudge" | "value" | "close";
  escalateOn: string[];
  escalateTo?: string;
  maxTouches: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEAD GROUP (Stage + Intent)
// ═══════════════════════════════════════════════════════════════════════════════

export interface LeadGroup {
  id: string;
  campaignId: string;
  stageId: string;
  intent: CampaignIntent;
  temperature: LeadTemperature;
  leadCount: number;
  lastTouchAt?: Date;
  nextTouchAt?: Date;
  outcomes: {
    meetings: number;
    emails: number;
    mobiles: number;
    permissions: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREDEFINED CAMPAIGNS - Each with ID + Intent
// ═══════════════════════════════════════════════════════════════════════════════

export const CAMPAIGNS: Record<string, Campaign> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // B2B DISCOVERY - CEOs, Founders, Decision Makers
  // ═══════════════════════════════════════════════════════════════════════════
  B2B_DISCOVERY: {
    id: "b2b_discovery",
    name: "B2B Discovery Campaign",
    signalhouseCampaignId: SIGNALHOUSE_10DLC.campaignId,
    intent: "DISCOVERY",
    primaryOutcome: "15_MIN_MEETING",
    secondaryOutcomes: ["EMAIL_CAPTURE", "MOBILE_CONFIRMED"],
    vertical: "B2B",
    personaIds: ["busy_ceo", "growth_marketer", "sales_leader"],
    stages: [
      {
        id: "b2b_cold_opener",
        name: "Cold Opener",
        order: 1,
        intent: "DISCOVERY",
        templateStage: "opener",
        escalateOn: ["POSITIVE", "QUESTION"],
        escalateTo: "b2b_warm_nudge",
        maxTouches: 3,
      },
      {
        id: "b2b_warm_nudge",
        name: "Warm Nudge",
        order: 2,
        intent: "DISCOVERY",
        templateStage: "nudge",
        escalateOn: ["BOOKING_REQUEST"],
        escalateTo: "b2b_hot_close",
        maxTouches: 3,
      },
      {
        id: "b2b_hot_close",
        name: "Hot Close",
        order: 3,
        intent: "QUALIFICATION",
        templateStage: "close",
        escalateOn: ["APPOINTMENT_SET"],
        maxTouches: 2,
      },
    ],
    loopDays: THE_LOOP.TOUCH_SCHEDULE,
    worker: "GIANNA",
    active: true,
    createdAt: new Date("2026-01-06"),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // REAL ESTATE DISCOVERY - Agents, Investors, Brokers
  // ═══════════════════════════════════════════════════════════════════════════
  RE_DISCOVERY: {
    id: "re_discovery",
    name: "Real Estate Discovery Campaign",
    signalhouseCampaignId: SIGNALHOUSE_10DLC.campaignId,
    intent: "DISCOVERY",
    primaryOutcome: "15_MIN_MEETING",
    secondaryOutcomes: ["EMAIL_CAPTURE", "PERMISSION_GRANTED"],
    vertical: "REAL_ESTATE",
    personaIds: ["hungry_agent", "deal_hunter"],
    stages: [
      {
        id: "re_cold_opener",
        name: "Cold Opener",
        order: 1,
        intent: "DISCOVERY",
        templateStage: "opener",
        escalateOn: ["POSITIVE", "QUESTION"],
        escalateTo: "re_warm_value",
        maxTouches: 3,
      },
      {
        id: "re_warm_value",
        name: "Warm Value",
        order: 2,
        intent: "DISCOVERY",
        templateStage: "value",
        escalateOn: ["BOOKING_REQUEST"],
        escalateTo: "re_hot_close",
        maxTouches: 3,
      },
      {
        id: "re_hot_close",
        name: "Hot Close",
        order: 3,
        intent: "QUALIFICATION",
        templateStage: "close",
        escalateOn: ["APPOINTMENT_SET"],
        maxTouches: 2,
      },
    ],
    loopDays: THE_LOOP.TOUCH_SCHEDULE,
    worker: "GIANNA",
    active: true,
    createdAt: new Date("2026-01-06"),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HOME SERVICES DISCOVERY - Roofing, HVAC, Solar, etc.
  // ═══════════════════════════════════════════════════════════════════════════
  HOME_SERVICES_DISCOVERY: {
    id: "home_services_discovery",
    name: "Home Services Discovery Campaign",
    signalhouseCampaignId: SIGNALHOUSE_10DLC.campaignId,
    intent: "DISCOVERY",
    primaryOutcome: "15_MIN_MEETING",
    secondaryOutcomes: ["EMAIL_CAPTURE", "MOBILE_CONFIRMED"],
    vertical: "HOME_SERVICES",
    personaIds: ["homeservices_owner"],
    stages: [
      {
        id: "hs_cold_opener",
        name: "Cold Opener",
        order: 1,
        intent: "DISCOVERY",
        templateStage: "opener",
        escalateOn: ["POSITIVE", "QUESTION"],
        escalateTo: "hs_warm_nudge",
        maxTouches: 3,
      },
      {
        id: "hs_warm_nudge",
        name: "Warm Nudge",
        order: 2,
        intent: "DISCOVERY",
        templateStage: "nudge",
        escalateOn: ["BOOKING_REQUEST"],
        maxTouches: 3,
      },
    ],
    loopDays: [1, 3, 7, 14, 21],
    worker: "GIANNA",
    active: true,
    createdAt: new Date("2026-01-06"),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TRUCKING DISCOVERY - Fleet Owners, Logistics
  // ═══════════════════════════════════════════════════════════════════════════
  TRUCKING_DISCOVERY: {
    id: "trucking_discovery",
    name: "Trucking Discovery Campaign",
    signalhouseCampaignId: SIGNALHOUSE_10DLC.campaignId,
    intent: "DISCOVERY",
    primaryOutcome: "15_MIN_MEETING",
    secondaryOutcomes: ["EMAIL_CAPTURE"],
    vertical: "TRUCKING",
    personaIds: ["fleet_owner"],
    stages: [
      {
        id: "trucking_cold_opener",
        name: "Cold Opener",
        order: 1,
        intent: "DISCOVERY",
        templateStage: "opener",
        escalateOn: ["POSITIVE"],
        escalateTo: "trucking_warm_nudge",
        maxTouches: 3,
      },
      {
        id: "trucking_warm_nudge",
        name: "Warm Nudge",
        order: 2,
        intent: "DISCOVERY",
        templateStage: "nudge",
        escalateOn: ["BOOKING_REQUEST"],
        maxTouches: 3,
      },
    ],
    loopDays: [1, 3, 7, 14],
    worker: "GIANNA",
    active: true,
    createdAt: new Date("2026-01-06"),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NURTURE CAMPAIGN - Stay top of mind
  // ═══════════════════════════════════════════════════════════════════════════
  NURTURE: {
    id: "nurture",
    name: "Nurture Campaign",
    signalhouseCampaignId: SIGNALHOUSE_10DLC.campaignId,
    intent: "NURTURE",
    primaryOutcome: "PERMISSION_GRANTED",
    secondaryOutcomes: ["15_MIN_MEETING"],
    vertical: "ALL",
    personaIds: ["busy_ceo", "growth_marketer", "hungry_agent"],
    stages: [
      {
        id: "nurture_value",
        name: "Value Touch",
        order: 1,
        intent: "NURTURE",
        templateStage: "value",
        escalateOn: ["POSITIVE", "BOOKING_REQUEST"],
        maxTouches: 5,
      },
    ],
    loopDays: [30, 60, 90],
    worker: "CATHY",
    active: true,
    createdAt: new Date("2026-01-06"),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // REACTIVATION CAMPAIGN - Wake up cold leads
  // ═══════════════════════════════════════════════════════════════════════════
  REACTIVATION: {
    id: "reactivation",
    name: "Reactivation Campaign",
    signalhouseCampaignId: SIGNALHOUSE_10DLC.campaignId,
    intent: "REACTIVATION",
    primaryOutcome: "15_MIN_MEETING",
    secondaryOutcomes: ["MOBILE_CONFIRMED"],
    vertical: "ALL",
    personaIds: ["busy_ceo", "deal_hunter"],
    stages: [
      {
        id: "reactivate_opener",
        name: "Reactivation Opener",
        order: 1,
        intent: "REACTIVATION",
        templateStage: "opener",
        escalateOn: ["POSITIVE"],
        escalateTo: "reactivate_close",
        maxTouches: 2,
      },
      {
        id: "reactivate_close",
        name: "Reactivation Close",
        order: 2,
        intent: "DISCOVERY",
        templateStage: "close",
        escalateOn: ["BOOKING_REQUEST"],
        maxTouches: 2,
      },
    ],
    loopDays: [1, 7, 14],
    worker: "GIANNA",
    active: true,
    createdAt: new Date("2026-01-06"),
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// OUTCOME TRACKING - What we're manufacturing
// ═══════════════════════════════════════════════════════════════════════════════

export interface OutcomeMetrics {
  campaignId: string;
  period: "daily" | "weekly" | "monthly";
  date: Date;
  metrics: {
    // Primary goal
    meetingsBooked: number;
    meetingsCompleted: number;

    // Captures
    emailsCaptured: number;
    mobilesConfirmed: number;
    permissionsGranted: number;

    // Qualification
    qualifiedLeads: number;
    dealsWon: number;

    // Activity (automation capacity)
    smsSent: number;
    responsesReceived: number;
    responseRate: number;

    // Funnel
    coldLeads: number;
    warmLeads: number;
    hotLeads: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS - Campaign Intent Logic
// ═══════════════════════════════════════════════════════════════════════════════

export function getCampaignByIntent(intent: CampaignIntent): Campaign[] {
  return Object.values(CAMPAIGNS).filter(
    (c) => c.intent === intent && c.active,
  );
}

export function getCampaignByVertical(vertical: string): Campaign[] {
  return Object.values(CAMPAIGNS).filter(
    (c) => (c.vertical === vertical || c.vertical === "ALL") && c.active,
  );
}

export function getStageForLead(
  campaignId: string,
  temperature: LeadTemperature,
): CampaignStage | undefined {
  const campaign = CAMPAIGNS[campaignId];
  if (!campaign) return undefined;

  // Map temperature to stage order
  const orderMap: Record<LeadTemperature, number> = {
    COLD: 1,
    WARM: 2,
    HOT: 3,
  };

  return campaign.stages.find((s) => s.order === orderMap[temperature]);
}

export function shouldEscalate(
  stageId: string,
  classification: string,
): { escalate: boolean; nextStageId?: string } {
  for (const campaign of Object.values(CAMPAIGNS)) {
    const stage = campaign.stages.find((s) => s.id === stageId);
    if (stage && stage.escalateOn.includes(classification)) {
      return {
        escalate: true,
        nextStageId: stage.escalateTo,
      };
    }
  }
  return { escalate: false };
}

export function getWorkerForCampaign(campaignId: string): string {
  const campaign = CAMPAIGNS[campaignId];
  return campaign?.worker || "GIANNA";
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCALE METRICS - Numbers Game
// ═══════════════════════════════════════════════════════════════════════════════

export const SCALE_TARGETS = {
  // Daily automation capacity (pump out the numbers)
  dailySmsCapacity: 2000,
  dailyEnrichCapacity: 2000,

  // Weekly targets
  weeklyMeetings: 20, // 4 meetings/day target
  weeklyNewLeads: 10000,

  // Monthly goals
  monthlyActivePool: 20000,
  monthlyMeetings: 80,
  monthlyDeals: 8, // 10% close rate

  // Conversion funnel
  smsToResponse: 0.05, // 5% response rate
  responseToMeeting: 0.2, // 20% of responses book
  meetingToQualified: 0.5, // 50% qualify
  qualifiedToDeal: 0.2, // 20% close

  // Formula: 2000 SMS → 100 responses → 20 meetings → 10 qualified → 2 deals/day
} as const;

console.log("[CampaignIntents] Loaded - Purpose-driven campaign architecture");
