import { z } from "zod";

// ============================================================
// DEAL TYPES & ENUMS
// ============================================================

export const DealTypeEnum = z.enum([
  // Real Estate Deals
  "b2b_exit",
  "commercial",
  "assemblage",
  "blue_collar_exit",
  "development",
  "residential_haos",
  // Nextier Consulting Deals
  "ai_system_design",
  "foundational_database",
  "tech_consulting",
  "data_architecture",
  "automation_build",
  "crm_integration",
  "nextier_implementation",
]);
export type DealType = z.infer<typeof DealTypeEnum>;

export const DealStageEnum = z.enum([
  "discovery",
  "qualification",
  "proposal",
  "negotiation",
  "contract",
  "closing",
  "closed_won",
  "closed_lost",
]);
export type DealStage = z.infer<typeof DealStageEnum>;

export const DealPriorityEnum = z.enum(["low", "medium", "high", "urgent"]);
export type DealPriority = z.infer<typeof DealPriorityEnum>;

export const MonetizationTypeEnum = z.enum([
  "commission",  // % of transaction value
  "advisory",    // % advisory fee
  "referral",    // Referral fee
  "equity",      // Equity stake
  "retainer",    // Monthly retainer
  "project",     // Fixed project fee
  "hourly",      // Hourly consulting rate
]);
export type MonetizationType = z.infer<typeof MonetizationTypeEnum>;

export const ClosedReasonEnum = z.enum([
  "price",
  "timing",
  "competition",
  "financing",
  "other",
]);
export type ClosedReason = z.infer<typeof ClosedReasonEnum>;

// ============================================================
// DEAL PARTY SCHEMAS
// ============================================================

export const DealPartySchema = z.object({
  name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  role: z.enum(["seller", "buyer", "broker", "attorney", "other"]).optional(),
});
export type DealParty = z.infer<typeof DealPartySchema>;

// ============================================================
// MONETIZATION SCHEMA
// ============================================================

export const MonetizationSchema = z.object({
  type: MonetizationTypeEnum,
  rate: z.number().min(0).max(100),
  estimatedEarnings: z.number().optional(),
  actualEarnings: z.number().optional(),
});
export type Monetization = z.infer<typeof MonetizationSchema>;

// ============================================================
// PROPERTY DATA SCHEMA (Snapshot for deals)
// ============================================================

export const DealPropertyDataSchema = z.object({
  id: z.string(),
  address: z.string(),
  type: z.string(),
  avm: z.number().optional(),
  equity: z.number().optional(),
  sqft: z.number().optional(),
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  yearBuilt: z.number().optional(),
  lotSize: z.number().optional(),
});
export type DealPropertyData = z.infer<typeof DealPropertyDataSchema>;

// ============================================================
// BUSINESS DATA SCHEMA (Snapshot for deals)
// ============================================================

export const DealBusinessDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  industry: z.string(),
  revenue: z.number().optional(),
  employees: z.number().optional(),
  yearFounded: z.number().optional(),
  sicCode: z.string().optional(),
});
export type DealBusinessData = z.infer<typeof DealBusinessDataSchema>;

// ============================================================
// DEAL DOCUMENT SCHEMA
// ============================================================

export const DealDocumentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.enum([
    "contract",
    "loi",
    "appraisal",
    "inspection",
    "title",
    "financials",
    "other",
  ]),
  url: z.string().url(),
  uploadedAt: z.string().datetime(),
  status: z.enum(["pending", "approved", "rejected", "signed"]).optional(),
  signedAt: z.string().datetime().optional(),
  signedBy: z.string().optional(),
});
export type DealDocument = z.infer<typeof DealDocumentSchema>;

// ============================================================
// DEAL ACTIVITY SCHEMA
// ============================================================

export const DealActivityTypeEnum = z.enum([
  "stage_change",
  "note",
  "call",
  "email",
  "meeting",
  "document",
  "price_change",
  "assignment",
]);
export type DealActivityType = z.infer<typeof DealActivityTypeEnum>;

export const DealActivitySchema = z.object({
  id: z.string().uuid(),
  dealId: z.string().uuid(),
  userId: z.string(),
  type: DealActivityTypeEnum,
  subtype: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
});
export type DealActivity = z.infer<typeof DealActivitySchema>;

// ============================================================
// MAIN DEAL SCHEMA
// ============================================================

export const DealSchema = z.object({
  id: z.string().uuid(),
  teamId: z.string(),
  userId: z.string(),
  leadId: z.string().uuid().optional(),
  propertyId: z.string().uuid().optional(),
  businessId: z.string().uuid().optional(),

  // Deal Info
  name: z.string().min(1),
  description: z.string().optional(),
  type: DealTypeEnum,
  stage: DealStageEnum,
  priority: DealPriorityEnum.default("medium"),

  // Financials
  estimatedValue: z.number().default(0),
  askingPrice: z.number().optional(),
  finalPrice: z.number().optional(),
  monetization: MonetizationSchema.optional(),

  // Parties
  seller: DealPartySchema.optional(),
  buyer: DealPartySchema.optional(),
  assignedTo: z.string().optional(),

  // Snapshots
  propertyData: DealPropertyDataSchema.optional(),
  businessData: DealBusinessDataSchema.optional(),

  // Timeline
  expectedCloseDate: z.string().datetime().optional(),
  actualCloseDate: z.string().datetime().optional(),
  lastActivityAt: z.string().datetime().optional(),
  stageChangedAt: z.string().datetime().optional(),

  // Close Info
  closedReason: ClosedReasonEnum.optional(),
  closedNotes: z.string().optional(),

  // Metadata
  documents: z.array(DealDocumentSchema).default([]),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),

  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Deal = z.infer<typeof DealSchema>;

// ============================================================
// CREATE DEAL INPUT
// ============================================================

export const CreateDealInputSchema = z.object({
  teamId: z.string(),
  userId: z.string(),
  leadId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  type: DealTypeEnum,
  priority: DealPriorityEnum.default("medium"),
  estimatedValue: z.number().min(0),
  monetization: MonetizationSchema.optional(),
  expectedCloseDate: z.string().datetime().optional(),
  tags: z.array(z.string()).default([]),
});
export type CreateDealInput = z.infer<typeof CreateDealInputSchema>;

// ============================================================
// UPDATE DEAL INPUT
// ============================================================

export const UpdateDealInputSchema = z.object({
  teamId: z.string(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: DealPriorityEnum.optional(),
  estimatedValue: z.number().min(0).optional(),
  askingPrice: z.number().min(0).optional(),
  monetization: MonetizationSchema.optional(),
  expectedCloseDate: z.string().datetime().optional(),
  seller: DealPartySchema.optional(),
  buyer: DealPartySchema.optional(),
  assignedTo: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});
export type UpdateDealInput = z.infer<typeof UpdateDealInputSchema>;

// ============================================================
// CHANGE STAGE INPUT
// ============================================================

export const ChangeStageInputSchema = z.object({
  teamId: z.string(),
  stage: DealStageEnum,
  reason: z.string().optional(),
  finalPrice: z.number().optional(), // Required for closed_won
  closedReason: ClosedReasonEnum.optional(), // Required for closed_lost
  closedNotes: z.string().optional(),
});
export type ChangeStageInput = z.infer<typeof ChangeStageInputSchema>;

// ============================================================
// PIPELINE STATS
// ============================================================

export const PipelineStatsSchema = z.object({
  totalDeals: z.number(),
  totalValue: z.number(),
  byStage: z.record(
    DealStageEnum,
    z.object({
      count: z.number(),
      value: z.number(),
    })
  ),
  byType: z.record(
    z.string(),
    z.object({
      count: z.number(),
      value: z.number(),
    })
  ),
  avgDaysInPipeline: z.number(),
  conversionRate: z.number(),
  expectedRevenue: z.number(),
});
export type PipelineStats = z.infer<typeof PipelineStatsSchema>;

// ============================================================
// PIPELINE COLUMN
// ============================================================

export const PipelineColumnSchema = z.object({
  stage: DealStageEnum,
  name: z.string(),
  deals: z.array(DealSchema),
  count: z.number(),
  value: z.number(),
});
export type PipelineColumn = z.infer<typeof PipelineColumnSchema>;

// ============================================================
// DEFAULT MONETIZATION RATES
// ============================================================

export const DEFAULT_MONETIZATION: Record<DealType, { type: MonetizationType; rate: number; description: string }> = {
  // === REAL ESTATE DEALS (percentage-based) ===
  b2b_exit: { type: "advisory", rate: 5, description: "5% advisory fee on transaction" },
  commercial: { type: "commission", rate: 3, description: "3% commission on sale" },
  assemblage: { type: "commission", rate: 4, description: "4% commission on assembled value" },
  blue_collar_exit: { type: "advisory", rate: 8, description: "8% advisory fee on exit value" },
  development: { type: "commission", rate: 2.5, description: "2.5% commission on development value" },
  residential_haos: { type: "commission", rate: 6, description: "6% commission on sale" },
  // === NEXTIER CONSULTING DEALS (project/retainer-based) ===
  ai_system_design: { type: "project", rate: 25000, description: "$25,000 project fee for AI system design" },
  foundational_database: { type: "project", rate: 15000, description: "$15,000 project fee for database architecture" },
  tech_consulting: { type: "retainer", rate: 5000, description: "$5,000/month retainer for ongoing consulting" },
  data_architecture: { type: "project", rate: 20000, description: "$20,000 project fee for data lake/warehouse" },
  automation_build: { type: "project", rate: 10000, description: "$10,000 project fee for automation build" },
  crm_integration: { type: "project", rate: 8000, description: "$8,000 project fee for CRM integration" },
  nextier_implementation: { type: "project", rate: 50000, description: "$50,000 full Nextier platform implementation" },
};

// ============================================================
// VALID STAGE TRANSITIONS
// ============================================================

export const VALID_STAGE_TRANSITIONS: Record<DealStage, DealStage[]> = {
  discovery: ["qualification", "closed_lost"],
  qualification: ["discovery", "proposal", "closed_lost"],
  proposal: ["qualification", "negotiation", "closed_lost"],
  negotiation: ["proposal", "contract", "closed_lost"],
  contract: ["negotiation", "closing", "closed_lost"],
  closing: ["contract", "closed_won", "closed_lost"],
  closed_won: [],
  closed_lost: ["discovery"], // Allow reopening
};
