// Deal Pipeline Types - Nextier Platform
// The monetization core of the 5-machine pipeline
//
// Nextier = Business Advisory & Technology Solutions Consulting
// Service Lines:
// 1. Real Estate Advisory (HAOS, Commercial, Development)
// 2. Business Exit Advisory (B2B, Blue Collar exits)
// 3. Technology Solutions (AI Systems, Data Architecture)

export type DealType =
  // === REAL ESTATE DEALS ===
  | "b2b_exit" // Business sale/exit
  | "commercial" // Commercial property
  | "assemblage" // Land assembly
  | "blue_collar_exit" // Small business exit
  | "development" // Development opportunity
  | "residential_haos" // Homeowner advisor deal
  // === NEXTIER CONSULTING DEALS ===
  | "ai_system_design" // AI System Design & Implementation
  | "foundational_database" // Foundational Database for AI
  | "tech_consulting" // Technology Solutions Consulting
  | "data_architecture" // Data Lake/Warehouse Architecture
  | "automation_build" // Business Process Automation
  | "crm_integration" // CRM Integration (Zoho, Salesforce, HubSpot)
  | "nextier_implementation"; // Full Nextier Platform Implementation

export type DealStage =
  | "discovery" // Initial qualification
  | "qualification" // Confirmed interest
  | "proposal" // Sent proposal/offer
  | "negotiation" // Active negotiation
  | "contract" // Contract signed
  | "closing" // In closing process
  | "closed_won" // Deal closed successfully
  | "closed_lost"; // Deal lost

export type DealPriority = "hot" | "warm" | "standard";

export type MonetizationType =
  | "commission" // % of transaction value
  | "advisory" // % advisory fee
  | "referral" // Referral fee
  | "equity" // Equity stake
  | "retainer" // Monthly retainer
  | "project" // Fixed project fee
  | "hourly"; // Hourly consulting rate

export interface Deal {
  id: string;
  leadId: string;
  teamId: string;
  assignedTo?: string;

  // Classification
  type: DealType;
  stage: DealStage;
  priority: DealPriority;
  name: string;
  description?: string;

  // Value
  estimatedValue: number;
  askingPrice?: number;
  offerPrice?: number;
  finalPrice?: number;

  // Monetization
  monetization: {
    type: MonetizationType;
    rate: number; // Percentage or flat amount
    estimatedEarnings: number;
    actualEarnings?: number;
  };

  // Property Details (if applicable)
  property?: {
    id: string;
    address: string;
    type: string;
    avm: number;
    equity: number;
    sqft?: number;
    bedrooms?: number;
    bathrooms?: number;
  };

  // Business Details (if applicable)
  business?: {
    id: string;
    name: string;
    industry: string;
    revenue: number;
    employees: number;
    foundedYear?: number;
  };

  // Parties
  seller?: Party;
  buyer?: Party;
  agents?: Party[];

  // Dates
  createdAt: string;
  updatedAt: string;
  expectedCloseDate?: string;
  actualCloseDate?: string;

  // Outcome
  outcome?: {
    result: "won" | "lost";
    reason?: string;
    feedback?: string;
    closedAt: string;
  };

  // Metadata
  tags: string[];
  source?: string;
}

export interface Party {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  role: "seller" | "buyer" | "agent" | "attorney" | "lender" | "other";
  company?: string;
}

export interface DealDocument {
  id: string;
  dealId: string;
  type:
    | "valuation"
    | "proposal"
    | "contract"
    | "research"
    | "financials"
    | "disclosure"
    | "other";
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface DealActivity {
  id: string;
  dealId: string;
  type:
    | "note"
    | "call"
    | "email"
    | "sms"
    | "meeting"
    | "stage_change"
    | "document"
    | "task";
  description: string;
  metadata?: Record<string, unknown>;
  userId: string;
  createdAt: string;
}

export interface DealStageChange {
  dealId: string;
  fromStage: DealStage;
  toStage: DealStage;
  reason?: string;
  changedBy: string;
  changedAt: string;
}

export interface PipelineStats {
  totalDeals: number;
  totalValue: number;
  byStage: Record<DealStage, { count: number; value: number }>;
  byType: Record<DealType, { count: number; value: number }>;
  avgDaysInPipeline: number;
  conversionRate: number;
  expectedRevenue: number;
}

// Input types for API
export interface CreateDealInput {
  leadId: string;
  type: DealType;
  name: string;
  description?: string;
  estimatedValue: number;
  priority?: DealPriority;
  monetization?: {
    type: MonetizationType;
    rate: number;
  };
  expectedCloseDate?: string;
  tags?: string[];
}

export interface UpdateDealInput {
  name?: string;
  description?: string;
  type?: DealType;
  priority?: DealPriority;
  estimatedValue?: number;
  askingPrice?: number;
  offerPrice?: number;
  expectedCloseDate?: string;
  assignedTo?: string;
  tags?: string[];
  seller?: Party;
  buyer?: Party;
  monetization?: {
    type: MonetizationType;
    rate: number;
  };
}

export interface ChangeStageInput {
  stage: DealStage;
  reason?: string;
  finalPrice?: number; // Required when closing
  outcomeReason?: string; // Required when closing lost
}

// Stage transition rules
export const VALID_STAGE_TRANSITIONS: Record<DealStage, DealStage[]> = {
  discovery: ["qualification", "closed_lost"],
  qualification: ["proposal", "discovery", "closed_lost"],
  proposal: ["negotiation", "qualification", "closed_lost"],
  negotiation: ["contract", "proposal", "closed_lost"],
  contract: ["closing", "negotiation", "closed_lost"],
  closing: ["closed_won", "contract", "closed_lost"],
  closed_won: [],
  closed_lost: [],
};

// Monetization defaults by deal type
export const DEFAULT_MONETIZATION: Record<
  DealType,
  { type: MonetizationType; rate: number; description: string }
> = {
  // === REAL ESTATE DEALS ===
  b2b_exit: {
    type: "advisory",
    rate: 5,
    description: "5% advisory fee on transaction",
  },
  commercial: {
    type: "commission",
    rate: 3,
    description: "3% commission on sale",
  },
  assemblage: {
    type: "commission",
    rate: 4,
    description: "4% commission on assembled value",
  },
  blue_collar_exit: {
    type: "advisory",
    rate: 8,
    description: "8% advisory fee on exit value",
  },
  development: {
    type: "commission",
    rate: 2.5,
    description: "2.5% commission on development value",
  },
  residential_haos: {
    type: "commission",
    rate: 6,
    description: "6% commission on sale",
  },
  // === NEXTIER CONSULTING DEALS ===
  ai_system_design: {
    type: "project",
    rate: 25000,
    description: "$25,000 project fee for AI system design",
  },
  foundational_database: {
    type: "project",
    rate: 15000,
    description: "$15,000 project fee for database architecture",
  },
  tech_consulting: {
    type: "retainer",
    rate: 5000,
    description: "$5,000/month retainer for ongoing consulting",
  },
  data_architecture: {
    type: "project",
    rate: 20000,
    description: "$20,000 project fee for data lake/warehouse",
  },
  automation_build: {
    type: "project",
    rate: 10000,
    description: "$10,000 project fee for automation build",
  },
  crm_integration: {
    type: "project",
    rate: 8000,
    description: "$8,000 project fee for CRM integration",
  },
  nextier_implementation: {
    type: "project",
    rate: 50000,
    description: "$50,000 full Nextier platform implementation",
  },
};
