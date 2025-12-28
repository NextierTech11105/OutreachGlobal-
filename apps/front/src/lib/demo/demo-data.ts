/**
 * DEMO DATA GENERATOR
 * ═══════════════════════════════════════════════════════════════════════════════
 * Simulated data for demo login showing "The Machine" in steady state
 *
 * Key Metrics:
 * - 2,000 SMS/day campaign blocks
 * - 10-20% positive inbound response rate
 * - 20,000 leads "in play" at any given month (stabilized)
 * - ~5,000 net new leads/month
 * - Natural churn as leads convert or drop off
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// SMS Stages
export type SMSStage =
  | "initial"
  | "retarget_1"
  | "retarget_2"
  | "retarget_3"
  | "follow_up_1"
  | "follow_up_2"
  | "follow_up_3"
  | "confirm"
  | "reminder_24h"
  | "reminder_1h";

export type LeadStatus =
  | "new"
  | "contacted"
  | "responded"
  | "interested"
  | "meeting_booked"
  | "converted"
  | "not_interested"
  | "unresponsive";

export interface DemoLead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  title: string;
  status: LeadStatus;
  tier: "A" | "B" | "C" | "D";
  lastContactedAt: Date;
  lastStage: SMSStage;
  responseCount: number;
  isGoldLabel: boolean;
  isGreenTag: boolean;
  createdAt: Date;
}

export interface DemoSMSRecord {
  id: string;
  leadId: string;
  direction: "outbound" | "inbound";
  stage: SMSStage;
  worker: "GIANNA" | "CATHY" | "SABRINA";
  message: string;
  sentAt: Date;
  deliveredAt: Date | null;
  responseReceivedAt: Date | null;
}

export interface DemoCampaignBlock {
  day: number;
  date: Date;
  leadsProcessed: number;
  tierBreakdown: { A: number; B: number; C: number; D: number };
  smsSetn: number;
  delivered: number;
  responses: number;
  responseRate: number;
  goldLabels: number;
  greenTags: number;
  meetingsBooked: number;
}

export interface DemoStats {
  // Overall
  totalLeadsInPlay: number;
  totalSMSSent: number;
  totalResponses: number;
  overallResponseRate: number;

  // Current Month
  monthlyNewLeads: number;
  monthlyChurnedLeads: number;
  monthlyNetGrowth: number;

  // By Stage
  stageBreakdown: Record<
    SMSStage,
    { sent: number; delivered: number; responses: number; rate: number }
  >;

  // By Tier
  tierBreakdown: Record<
    "A" | "B" | "C" | "D",
    { count: number; responseRate: number }
  >;

  // SignalHouse Metrics
  signalHouse: {
    balance: number;
    outboundSMS: number;
    inboundSMS: number;
    deliveryRate: number;
    optOutRate: number;
    responseRate: number;
    campaignStatus: "ACTIVE" | "PENDING" | "APPROVED";
  };

  // Campaign Blocks (10 days)
  campaignBlocks: DemoCampaignBlock[];

  // Workers
  workerStats: Record<
    "GIANNA" | "CATHY" | "SABRINA",
    { sent: number; responses: number; rate: number }
  >;
}

// Names for demo data generation
const FIRST_NAMES = [
  "James",
  "Mary",
  "John",
  "Patricia",
  "Robert",
  "Jennifer",
  "Michael",
  "Linda",
  "William",
  "Elizabeth",
  "David",
  "Barbara",
  "Richard",
  "Susan",
  "Joseph",
  "Jessica",
  "Thomas",
  "Sarah",
  "Charles",
  "Karen",
  "Christopher",
  "Nancy",
  "Daniel",
  "Lisa",
  "Matthew",
  "Betty",
  "Anthony",
  "Margaret",
  "Mark",
  "Sandra",
];

const LAST_NAMES = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Hernandez",
  "Lopez",
  "Gonzalez",
  "Wilson",
  "Anderson",
  "Thomas",
  "Taylor",
  "Moore",
  "Jackson",
  "Martin",
  "Lee",
  "Perez",
  "Thompson",
  "White",
  "Harris",
  "Sanchez",
  "Clark",
  "Ramirez",
  "Lewis",
  "Robinson",
];

const COMPANIES = [
  "Apex Realty",
  "Summit Properties",
  "Blue Sky Homes",
  "Golden State RE",
  "Premier Agents",
  "Coastal Living",
  "Metro Brokers",
  "Home First Realty",
  "Keystone Properties",
  "Horizon Real Estate",
  "Peak Performance Realty",
  "Sunrise Properties",
  "Diamond Real Estate",
  "Elite Home Group",
  "Trusted Realty",
];

const TITLES = [
  "Real Estate Agent",
  "Broker",
  "Associate Broker",
  "Realtor",
  "Managing Broker",
  "Sales Agent",
  "Listing Specialist",
  "Buyer's Agent",
  "Team Lead",
  "Owner/Broker",
];

// Generate a random lead
function generateLead(index: number): DemoLead {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const tierRoll = Math.random();
  const tier: "A" | "B" | "C" | "D" =
    tierRoll < 0.15 ? "A" : tierRoll < 0.4 ? "B" : tierRoll < 0.75 ? "C" : "D";

  // Status based on simulation
  const statusRoll = Math.random();
  let status: LeadStatus;
  if (statusRoll < 0.05) status = "converted";
  else if (statusRoll < 0.1) status = "meeting_booked";
  else if (statusRoll < 0.2) status = "interested";
  else if (statusRoll < 0.35) status = "responded";
  else if (statusRoll < 0.6) status = "contacted";
  else if (statusRoll < 0.75) status = "not_interested";
  else if (statusRoll < 0.9) status = "unresponsive";
  else status = "new";

  const stages: SMSStage[] = [
    "initial",
    "retarget_1",
    "retarget_2",
    "follow_up_1",
  ];
  const lastStage = stages[Math.floor(Math.random() * stages.length)];

  const isGoldLabel = tier === "A" && status === "interested";
  const isGreenTag =
    (tier === "A" || tier === "B") &&
    ["responded", "interested"].includes(status);

  const daysAgo = Math.floor(Math.random() * 30);

  return {
    id: `demo-lead-${index}`,
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
    phone: `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
    company: COMPANIES[Math.floor(Math.random() * COMPANIES.length)],
    title: TITLES[Math.floor(Math.random() * TITLES.length)],
    status,
    tier,
    lastContactedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
    lastStage,
    responseCount: [
      "responded",
      "interested",
      "meeting_booked",
      "converted",
    ].includes(status)
      ? Math.floor(Math.random() * 5) + 1
      : 0,
    isGoldLabel,
    isGreenTag,
    createdAt: new Date(
      Date.now() -
        (daysAgo + Math.floor(Math.random() * 30)) * 24 * 60 * 60 * 1000,
    ),
  };
}

// Generate demo stats
export function generateDemoStats(): DemoStats {
  const LEADS_IN_PLAY = 20000;
  const DAILY_BLOCK = 2000;
  const RESPONSE_RATE = 0.15; // 15% average

  // Generate campaign blocks for last 10 days
  const campaignBlocks: DemoCampaignBlock[] = [];
  for (let day = 1; day <= 10; day++) {
    const responses = Math.floor(DAILY_BLOCK * (0.1 + Math.random() * 0.1)); // 10-20%
    campaignBlocks.push({
      day,
      date: new Date(Date.now() - (10 - day) * 24 * 60 * 60 * 1000),
      leadsProcessed: DAILY_BLOCK,
      tierBreakdown: {
        A: Math.floor(DAILY_BLOCK * 0.15),
        B: Math.floor(DAILY_BLOCK * 0.25),
        C: Math.floor(DAILY_BLOCK * 0.35),
        D: Math.floor(DAILY_BLOCK * 0.25),
      },
      smsSetn: DAILY_BLOCK,
      delivered: Math.floor(DAILY_BLOCK * 0.97),
      responses,
      responseRate: Math.round((responses / DAILY_BLOCK) * 100),
      goldLabels: Math.floor(responses * 0.1),
      greenTags: Math.floor(responses * 0.3),
      meetingsBooked: Math.floor(responses * 0.05),
    });
  }

  const totalResponses = campaignBlocks.reduce(
    (sum, b) => sum + b.responses,
    0,
  );
  const totalSent = campaignBlocks.reduce((sum, b) => sum + b.smsSetn, 0);

  return {
    totalLeadsInPlay: LEADS_IN_PLAY,
    totalSMSSent: totalSent * 3, // Account for retargets
    totalResponses: totalResponses * 3,
    overallResponseRate: Math.round(RESPONSE_RATE * 100),

    monthlyNewLeads: 5000,
    monthlyChurnedLeads: 3000,
    monthlyNetGrowth: 2000,

    stageBreakdown: {
      initial: { sent: 20000, delivered: 19400, responses: 3000, rate: 15 },
      retarget_1: { sent: 12000, delivered: 11640, responses: 1440, rate: 12 },
      retarget_2: { sent: 8000, delivered: 7760, responses: 800, rate: 10 },
      retarget_3: { sent: 4000, delivered: 3880, responses: 280, rate: 7 },
      follow_up_1: { sent: 3000, delivered: 2910, responses: 900, rate: 30 },
      follow_up_2: { sent: 2000, delivered: 1940, responses: 500, rate: 25 },
      follow_up_3: { sent: 1000, delivered: 970, responses: 200, rate: 20 },
      confirm: { sent: 500, delivered: 485, responses: 400, rate: 80 },
      reminder_24h: { sent: 400, delivered: 388, responses: 200, rate: 50 },
      reminder_1h: { sent: 400, delivered: 388, responses: 300, rate: 75 },
    },

    tierBreakdown: {
      A: { count: 3000, responseRate: 25 },
      B: { count: 5000, responseRate: 18 },
      C: { count: 7000, responseRate: 12 },
      D: { count: 5000, responseRate: 8 },
    },

    signalHouse: {
      balance: 94.5,
      outboundSMS: totalSent * 3,
      inboundSMS: totalResponses * 3,
      deliveryRate: 97.0,
      optOutRate: 0.5,
      responseRate: Math.round(RESPONSE_RATE * 100),
      campaignStatus: "ACTIVE",
    },

    campaignBlocks,

    workerStats: {
      GIANNA: { sent: 20000, responses: 3000, rate: 15 },
      CATHY: { sent: 24000, responses: 2520, rate: 10.5 },
      SABRINA: { sent: 6300, responses: 2500, rate: 40 },
    },
  };
}

// Generate demo leads
export function generateDemoLeads(count: number = 100): DemoLead[] {
  return Array.from({ length: count }, (_, i) => generateLead(i));
}

// Demo user context
export interface DemoUser {
  id: string;
  email: string;
  name: string;
  isDemo: true;
  teamId: string;
  permissions: {
    canEdit: false;
    canSend: false;
    canDelete: false;
    canExport: false;
  };
}

export const DEMO_USER: DemoUser = {
  id: "demo-user",
  email: "demo@nextier.io",
  name: "Demo User",
  isDemo: true,
  teamId: "demo-team",
  permissions: {
    canEdit: false,
    canSend: false,
    canDelete: false,
    canExport: false,
  },
};

// Check if current session is demo
export function isDemoSession(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("demo_mode") === "true";
}

// Enable demo mode
export function enableDemoMode(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("demo_mode", "true");
}

// Disable demo mode
export function disableDemoMode(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("demo_mode");
}
