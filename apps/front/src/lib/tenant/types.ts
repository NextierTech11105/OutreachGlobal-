/**
 * TENANT CONFIG TYPES
 * ═══════════════════════════════════════════════════════════════════════════════
 * Shared types for multi-tenant white-label configuration.
 * Mirror of apps/api/src/database/schema/tenant-config.schema.ts types
 * ═══════════════════════════════════════════════════════════════════════════════
 */

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
  channel: "none" | "sms" | "voice" | "email" | "multi";
  humanOverseer?: string;
}

export interface BrandingConfig {
  name: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  customTheme?: Record<string, string>;
}

export interface MessagingConfig {
  tone: "professional" | "friendly" | "casual" | "aggressive" | "custom";
  humorLevel: number;
  urgencyDefault: number;
  signature?: string;
  companyName: string;
  senderName: string;
}

export interface IcpConfig {
  industry: string;
  industryLabel: string;
  targetRoles: string[];
  geography: {
    countries: string[];
    states: string[];
    cities: string[];
    zips: string[];
  };
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
  sicCodes: string[];
  naicsCodes: string[];
  description?: string;
}

export interface CapacityConfig {
  dailySmsLimit: number;
  dailyCallLimit: number;
  maxConcurrentWorkers: number;
  operatingHours: {
    start: string;
    end: string;
    timezone: string;
    daysOfWeek: number[];
  };
}

export interface IntegrationConfig {
  crm?: {
    type: "zoho" | "salesforce" | "hubspot" | "pipedrive" | "custom";
    apiKey?: string;
    instanceUrl?: string;
    enabled: boolean;
  };
  calendar?: {
    type: "google" | "outlook" | "calendly" | "custom";
    enabled: boolean;
  };
  email?: {
    type: "gmail" | "outlook" | "sendgrid" | "custom";
    senderEmail?: string;
    enabled: boolean;
  };
}

export interface TenantConfigData {
  version: number;
  branding: BrandingConfig;
  workers: WorkerConfig[];
  messaging: MessagingConfig;
  icp: IcpConfig;
  capacity: CapacityConfig;
  integrations: IntegrationConfig;
  onboardingCompleted: boolean;
  onboardingCompletedAt?: string;
  features: {
    aiAutoReply: boolean;
    voiceCalls: boolean;
    emailOutreach: boolean;
    nevaResearch: boolean;
    luciDataPrep: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEXTIER DEFAULT (Fallback when no tenant config exists)
// ═══════════════════════════════════════════════════════════════════════════════

export const NEXTIER_DEFAULT_CONFIG: TenantConfigData = {
  version: 1,
  branding: {
    name: "NEXTIER",
    primaryColor: "#f59e0b",
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
  messaging: {
    tone: "professional",
    humorLevel: 30,
    urgencyDefault: 50,
    companyName: "NEXTIER",
    senderName: "Advisor",
  },
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
  integrations: {},
  onboardingCompleted: true,
  features: {
    aiAutoReply: true,
    voiceCalls: true,
    emailOutreach: true,
    nevaResearch: true,
    luciDataPrep: true,
  },
};

// Helper to get worker by role
export function getWorkerByRole(
  config: TenantConfigData,
  role: WorkerRole,
): WorkerConfig | undefined {
  return config.workers.find((w) => w.role === role);
}

// Helper to get worker by ID
export function getWorkerById(
  config: TenantConfigData,
  id: string,
): WorkerConfig | undefined {
  return config.workers.find((w) => w.id === id);
}

// Helper to get all enabled workers
export function getEnabledWorkers(config: TenantConfigData): WorkerConfig[] {
  return config.workers.filter((w) => w.enabled);
}

// Helper to get workers by channel
export function getWorkersByChannel(
  config: TenantConfigData,
  channel: WorkerConfig["channel"],
): WorkerConfig[] {
  return config.workers.filter((w) => w.channel === channel && w.enabled);
}
