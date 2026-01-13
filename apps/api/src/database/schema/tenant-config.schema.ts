import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  varchar,
} from "drizzle-orm/pg-core";
import { primaryUlid } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";

/**
 * TENANT CONFIGURATION SCHEMA
 * ═══════════════════════════════════════════════════════════════════════════════
 * Universal white-label config system for multi-tenant deployment.
 *
 * Philosophy:
 * - Core execution loop is UNIVERSAL (data → outbound → inbound → booking → deal)
 * - Tenant config SHAPES the experience to user's business intent
 * - Onboarding COLLECTS intent, this schema STORES it
 *
 * "The engine is the same. The driver programs the destination."
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type WorkerRole =
  | "data_prep"
  | "intelligence"
  | "opener"
  | "nudger"
  | "closer";

export interface WorkerConfig {
  id: string;
  role: WorkerRole;
  name: string;
  description: string;
  avatarUrl?: string;
  color: string;
  enabled: boolean;
  // Channel this worker operates on
  channel: "none" | "sms" | "voice" | "email" | "multi";
  // Optional human overseer name (the real person behind the AI)
  humanOverseer?: string;
}

export interface BrandingConfig {
  name: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  // Custom CSS or theme overrides
  customTheme?: Record<string, string>;
}

export interface MessagingConfig {
  // Tone settings
  tone: "professional" | "friendly" | "casual" | "aggressive" | "custom";
  // Humor level (0-100)
  humorLevel: number;
  // Urgency default (0-100)
  urgencyDefault: number;
  // Default signature
  signature?: string;
  // Company name to use in messages
  companyName: string;
  // Sender name for outbound
  senderName: string;
}

export interface IcpConfig {
  // Industry vertical
  industry: string;
  industryLabel: string;
  // Target roles/titles
  targetRoles: string[];
  // Geography
  geography: {
    countries: string[];
    states: string[];
    cities: string[];
    zips: string[];
  };
  // Company filters
  companySize: {
    min?: number;
    max?: number;
    label: string;
  };
  revenue: {
    min?: number;
    max?: number;
    label: string;
  };
  // SIC/NAICS codes
  sicCodes: string[];
  naicsCodes: string[];
  // Custom ICP description (for AI context)
  description?: string;
}

export interface CapacityConfig {
  // Daily SMS limit
  dailySmsLimit: number;
  // Daily call limit
  dailyCallLimit: number;
  // Max concurrent workers
  maxConcurrentWorkers: number;
  // Operating hours (24h format)
  operatingHours: {
    start: string; // "09:00"
    end: string; // "17:00"
    timezone: string; // "America/New_York"
    daysOfWeek: number[]; // [1,2,3,4,5] = Mon-Fri
  };
}

export interface IntegrationConfig {
  // CRM integration
  crm?: {
    type: "zoho" | "salesforce" | "hubspot" | "pipedrive" | "custom";
    apiKey?: string;
    instanceUrl?: string;
    enabled: boolean;
  };
  // Calendar integration
  calendar?: {
    type: "google" | "outlook" | "calendly" | "custom";
    enabled: boolean;
  };
  // Email integration
  email?: {
    type: "gmail" | "outlook" | "sendgrid" | "custom";
    senderEmail?: string;
    enabled: boolean;
  };
}

export interface TenantConfigData {
  // Version for migrations
  version: number;
  // Branding
  branding: BrandingConfig;
  // Worker personas (the AI team)
  workers: WorkerConfig[];
  // Messaging style
  messaging: MessagingConfig;
  // Ideal Customer Profile
  icp: IcpConfig;
  // Capacity limits
  capacity: CapacityConfig;
  // External integrations
  integrations: IntegrationConfig;
  // Onboarding completion
  onboardingCompleted: boolean;
  onboardingCompletedAt?: string;
  // Feature flags
  features: {
    aiAutoReply: boolean;
    voiceCalls: boolean;
    emailOutreach: boolean;
    nevaResearch: boolean;
    luciDataPrep: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIG (Universal Starting Point)
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_TENANT_CONFIG: TenantConfigData = {
  version: 1,
  branding: {
    name: "My Company",
    primaryColor: "#6366f1", // Indigo
    secondaryColor: "#8b5cf6", // Violet
    accentColor: "#f59e0b", // Amber
  },
  workers: [
    {
      id: "data_prep",
      role: "data_prep",
      name: "Data Agent",
      description: "Scans databases, enriches leads, prepares batches",
      color: "from-red-500 to-orange-500",
      enabled: true,
      channel: "none",
    },
    {
      id: "intelligence",
      role: "intelligence",
      name: "Research Agent",
      description: "Deep research, lead personalization, call prep",
      color: "from-cyan-500 to-blue-500",
      enabled: true,
      channel: "none",
    },
    {
      id: "opener",
      role: "opener",
      name: "Opener",
      description: "Initial outreach, first contact, email capture",
      color: "from-purple-500 to-indigo-500",
      enabled: true,
      channel: "sms",
    },
    {
      id: "nudger",
      role: "nudger",
      name: "Follow-Up Agent",
      description: "Ghost revival, friendly follow-ups",
      color: "from-pink-500 to-rose-500",
      enabled: true,
      channel: "sms",
    },
    {
      id: "closer",
      role: "closer",
      name: "Closer",
      description: "Booking calls, appointment setting, objection handling",
      color: "from-green-500 to-emerald-500",
      enabled: true,
      channel: "voice",
    },
  ],
  messaging: {
    tone: "professional",
    humorLevel: 20,
    urgencyDefault: 50,
    companyName: "My Company",
    senderName: "Team",
  },
  icp: {
    industry: "general",
    industryLabel: "General Business",
    targetRoles: [],
    geography: {
      countries: ["US"],
      states: [],
      cities: [],
      zips: [],
    },
    companySize: {
      label: "All sizes",
    },
    revenue: {
      label: "All revenue",
    },
    sicCodes: [],
    naicsCodes: [],
  },
  capacity: {
    dailySmsLimit: 500,
    dailyCallLimit: 100,
    maxConcurrentWorkers: 5,
    operatingHours: {
      start: "09:00",
      end: "17:00",
      timezone: "America/New_York",
      daysOfWeek: [1, 2, 3, 4, 5],
    },
  },
  integrations: {},
  onboardingCompleted: false,
  features: {
    aiAutoReply: false,
    voiceCalls: true,
    emailOutreach: true,
    nevaResearch: true,
    luciDataPrep: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE TABLE
// ═══════════════════════════════════════════════════════════════════════════════

export const tenantConfig = pgTable(
  "tenant_config",
  {
    id: primaryUlid("tc"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull().unique(),
    // Full config as JSONB (flexible, versionable)
    config: jsonb().$type<TenantConfigData>().notNull(),
    // Quick access fields for queries
    industry: varchar(),
    onboardingCompleted: boolean().default(false),
    // Timestamps
    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.teamId),
    index("tenant_config_industry_idx").on(t.industry),
    index("tenant_config_onboarding_idx").on(t.onboardingCompleted),
  ],
);

// ═══════════════════════════════════════════════════════════════════════════════
// INDUSTRY PRESETS (Starting points for onboarding)
// ═══════════════════════════════════════════════════════════════════════════════

// Deep partial type for presets (allows partial nested objects)
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export const INDUSTRY_PRESETS: Record<string, DeepPartial<TenantConfigData>> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // NEXTIER PRESET - The original. Cole's spec. Don't touch.
  // Human overseers: Emily, Frank, and the team
  // AI amplifies their capacity. Humans always in control.
  // ═══════════════════════════════════════════════════════════════════════════
  nextier: {
    branding: {
      name: "NEXTIER",
      primaryColor: "#f59e0b", // Amber/Gold
      secondaryColor: "#78350f",
      accentColor: "#fbbf24",
    },
    workers: [
      {
        id: "luci",
        role: "data_prep",
        name: "LUCI",
        description:
          "Data Copilot - Scans USBizData for $1-10M exits, preps SMS batches, enriches leads",
        color: "from-red-500 to-orange-500",
        enabled: true,
        channel: "none",
      },
      {
        id: "neva",
        role: "intelligence",
        name: "NEVA",
        description:
          "The Researcher - Deep intel via Perplexity, call prep, property/business context",
        color: "from-cyan-500 to-blue-500",
        enabled: true,
        channel: "none",
      },
      {
        id: "gianna",
        role: "opener",
        name: "GIANNA",
        description:
          "The Opener - Initial SMS outreach + AI inbound response center, email capture",
        color: "from-purple-500 to-indigo-500",
        enabled: true,
        channel: "sms",
        humanOverseer: "Emily",
      },
      {
        id: "cathy",
        role: "nudger",
        name: "CATHY",
        description:
          "The Nudger - Ghost revival with humor, Leslie Nielsen style follow-ups",
        color: "from-pink-500 to-rose-500",
        enabled: true,
        channel: "sms",
      },
      {
        id: "sabrina",
        role: "closer",
        name: "SABRINA",
        description:
          "The Closer - Aggressive booking, appointment reminders, objection handling",
        color: "from-green-500 to-emerald-500",
        enabled: true,
        channel: "voice",
      },
    ],
    icp: {
      industry: "business-acquisition",
      industryLabel: "Business Acquisition ($1-10M Exits)",
      targetRoles: ["Owner", "CEO", "Founder", "President"],
      geography: {
        countries: ["US"],
        states: [],
        cities: [],
        zips: [],
      },
      companySize: { min: 5, max: 100, label: "5-100 employees" },
      revenue: { min: 1000000, max: 10000000, label: "$1M-$10M" },
      sicCodes: [],
      naicsCodes: [],
    },
    messaging: {
      tone: "professional",
      humorLevel: 30, // Leslie Nielsen energy via CATHY
      urgencyDefault: 50,
      companyName: "NEXTIER",
      senderName: "Advisor",
    },
    capacity: {
      dailySmsLimit: 2000,
      dailyCallLimit: 200,
      maxConcurrentWorkers: 5,
      operatingHours: {
        start: "09:00",
        end: "18:00",
        timezone: "America/New_York",
        daysOfWeek: [1, 2, 3, 4, 5],
      },
    },
    features: {
      aiAutoReply: true,
      voiceCalls: true,
      emailOutreach: true,
      nevaResearch: true,
      luciDataPrep: true,
    },
  },

  "business-acquisition": {
    branding: {
      name: "Deal Sourcing",
      primaryColor: "#059669", // Emerald
    },
    icp: {
      industry: "business-acquisition",
      industryLabel: "Business Acquisition",
      targetRoles: ["Owner", "CEO", "Founder", "President"],
      companySize: { min: 5, max: 100, label: "5-100 employees" },
      revenue: { min: 1000000, max: 10000000, label: "$1M-$10M" },
    },
    messaging: {
      tone: "professional",
      humorLevel: 10,
      urgencyDefault: 40,
      companyName: "Advisory Group",
      senderName: "Advisor",
    },
  },
  "real-estate": {
    branding: {
      name: "Property Outreach",
      primaryColor: "#2563eb", // Blue
    },
    icp: {
      industry: "real-estate",
      industryLabel: "Real Estate",
      targetRoles: ["Homeowner", "Property Owner", "Landlord"],
    },
    messaging: {
      tone: "friendly",
      humorLevel: 30,
      urgencyDefault: 60,
      companyName: "Property Solutions",
      senderName: "Property Specialist",
    },
  },
  insurance: {
    branding: {
      name: "Insurance Outreach",
      primaryColor: "#7c3aed", // Violet
    },
    icp: {
      industry: "insurance",
      industryLabel: "Insurance",
      targetRoles: ["Business Owner", "HR Manager", "CFO"],
    },
    messaging: {
      tone: "professional",
      humorLevel: 5,
      urgencyDefault: 30,
      companyName: "Insurance Advisors",
      senderName: "Insurance Specialist",
    },
  },
  recruiting: {
    branding: {
      name: "Talent Outreach",
      primaryColor: "#db2777", // Pink
    },
    icp: {
      industry: "recruiting",
      industryLabel: "Recruiting & Staffing",
      targetRoles: ["Hiring Manager", "HR Director", "CEO"],
    },
    messaging: {
      tone: "friendly",
      humorLevel: 25,
      urgencyDefault: 50,
      companyName: "Talent Solutions",
      senderName: "Recruiter",
    },
  },
  saas: {
    branding: {
      name: "SaaS Sales",
      primaryColor: "#0891b2", // Cyan
    },
    icp: {
      industry: "saas",
      industryLabel: "SaaS / Technology",
      targetRoles: ["CTO", "VP Engineering", "IT Director", "Product Manager"],
    },
    messaging: {
      tone: "casual",
      humorLevel: 40,
      urgencyDefault: 45,
      companyName: "Tech Solutions",
      senderName: "Solutions Engineer",
    },
  },
  solar: {
    branding: {
      name: "Solar Outreach",
      primaryColor: "#f59e0b", // Amber
    },
    icp: {
      industry: "solar",
      industryLabel: "Solar / Clean Energy",
      targetRoles: ["Homeowner", "Property Manager", "Facility Manager"],
    },
    messaging: {
      tone: "friendly",
      humorLevel: 20,
      urgencyDefault: 55,
      companyName: "Solar Solutions",
      senderName: "Energy Consultant",
    },
  },
  custom: {
    // Fully custom - onboarding collects everything
    icp: {
      industry: "custom",
      industryLabel: "Custom",
    },
  },
};
