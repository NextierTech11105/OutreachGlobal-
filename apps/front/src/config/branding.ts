/**
 * White-label branding configuration
 * Supports both environment variables AND runtime white-label config from API
 * Defaults to Nextier branding if not set
 */

// White-label identifiers
export const WHITE_LABEL_SLUGS = {
  HOMEOWNER_ADVISOR: "homeowner-advisor",
  NEXTIER: "nextier",
} as const;

export type WhiteLabelSlug = (typeof WHITE_LABEL_SLUGS)[keyof typeof WHITE_LABEL_SLUGS];

// White-label configuration interface (matches API response)
export interface WhiteLabelConfig {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  aiAssistantName: string;
  aiSearchName: string;
  aiFollowupName: string;
  aiDatalakeName: string;
  customDomain: string | null;
  subdomain: string | null;
  spacesBucket: string;
  spacesRegion: string;
  features: {
    skipTracing: boolean;
    smsMessaging: boolean;
    emailCampaigns: boolean;
    powerDialer: boolean;
    aiSdr: boolean;
    b2bEnrichment: boolean;
    propertyData: boolean;
    achievements: boolean;
  };
  limits: {
    maxTeams: number;
    maxUsersPerTeam: number;
    maxLeadsPerTeam: number;
    maxCampaignsPerTeam: number;
    apiRateLimit: number;
  };
  emailSenderName: string | null;
  emailSenderAddress: string | null;
  supportEmail: string | null;
}

// Default configs for each white-label (used for SSR/fallback)
export const WHITE_LABEL_DEFAULTS: Record<WhiteLabelSlug, Partial<WhiteLabelConfig>> = {
  "homeowner-advisor": {
    name: "Homeowner Advisor",
    primaryColor: "#2563EB",
    secondaryColor: "#1E40AF",
    accentColor: "#059669",
    aiAssistantName: "Sophie",
    aiSearchName: "PropertySearch",
    aiFollowupName: "HomeBot",
    aiDatalakeName: "PropertyData",
    spacesBucket: "homeowner-advisor-datalake",
    emailSenderName: "Sophie | Homeowner Advisor",
    supportEmail: "support@homeowneradvisor.com",
  },
  "nextier": {
    name: "Nextier",
    primaryColor: "#3B82F6",
    secondaryColor: "#1E40AF",
    accentColor: "#10B981",
    aiAssistantName: "Gianna",
    aiSearchName: "LUCI",
    aiFollowupName: "Cathy",
    aiDatalakeName: "Datalake",
    spacesBucket: "nextier-datalake",
    emailSenderName: "Gianna | Nextier",
    supportEmail: "support@nextier.io",
  },
};

// Detect current white-label from environment or domain
export function detectWhiteLabel(): WhiteLabelSlug {
  // First check environment variable
  const envSlug = process.env.NEXT_PUBLIC_WHITE_LABEL_SLUG;
  if (envSlug && Object.values(WHITE_LABEL_SLUGS).includes(envSlug as WhiteLabelSlug)) {
    return envSlug as WhiteLabelSlug;
  }

  // Check domain in browser
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname.includes("homeowneradvisor") || hostname.includes("homeowner")) {
      return WHITE_LABEL_SLUGS.HOMEOWNER_ADVISOR;
    }
  }

  // Default to Nextier
  return WHITE_LABEL_SLUGS.NEXTIER;
}

// Get the current white-label slug
export const CURRENT_WHITE_LABEL = detectWhiteLabel();

// Get default config for current white-label
const defaults = WHITE_LABEL_DEFAULTS[CURRENT_WHITE_LABEL] || WHITE_LABEL_DEFAULTS.nextier;

// Core branding (can be overridden by env vars)
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || defaults.name || "Nextier";
export const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || defaults.name || "Nextier";
export const PLATFORM_NAME = `${APP_NAME} Data Engine`;

// AI Assistant names (configurable per tenant)
export const AI_ASSISTANT_NAME = process.env.NEXT_PUBLIC_AI_ASSISTANT_NAME || defaults.aiAssistantName || "Gianna";
export const AI_ASSISTANT_FULL = `${AI_ASSISTANT_NAME} | ${APP_NAME}`;

// Agent names - these can be customized per tenant
export const AGENTS = {
  primary: AI_ASSISTANT_NAME,
  search: process.env.NEXT_PUBLIC_AI_SEARCH_NAME || defaults.aiSearchName || "LUCI",
  followup: process.env.NEXT_PUBLIC_AI_FOLLOWUP_NAME || defaults.aiFollowupName || "Cathy",
  datalake: process.env.NEXT_PUBLIC_AI_DATALAKE_NAME || defaults.aiDatalakeName || "Datalake",
};

// Colors
export const COLORS = {
  primary: process.env.NEXT_PUBLIC_PRIMARY_COLOR || defaults.primaryColor || "#3B82F6",
  secondary: process.env.NEXT_PUBLIC_SECONDARY_COLOR || defaults.secondaryColor || "#1E40AF",
  accent: process.env.NEXT_PUBLIC_ACCENT_COLOR || defaults.accentColor || "#10B981",
};

// Email configuration
export const EMAIL_SENDER_NAME = process.env.EMAIL_SENDER_NAME || defaults.emailSenderName || AI_ASSISTANT_FULL;
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || defaults.supportEmail || "support@nextier.io";

// Theme
export const THEME_KEY = process.env.NEXT_PUBLIC_THEME_KEY || `${CURRENT_WHITE_LABEL}-theme`;

// Logo (optional custom logo URL)
export const LOGO_URL = process.env.NEXT_PUBLIC_LOGO_URL || defaults.logoUrl || "";

// DO Spaces bucket
export const SPACES_BUCKET = process.env.NEXT_PUBLIC_SPACES_BUCKET || defaults.spacesBucket || "nextier-datalake";

// Helper functions
export function getTitle(title: string): string {
  return `${title} | ${APP_NAME}`;
}

export function getPlatformTitle(title: string): string {
  return `${title} | ${PLATFORM_NAME}`;
}

// Message template placeholders - use these in templates
export const TEMPLATE_VARS = {
  appName: APP_NAME,
  companyName: COMPANY_NAME,
  platformName: PLATFORM_NAME,
  aiName: AI_ASSISTANT_NAME,
  agentPrimary: AGENTS.primary,
  agentSearch: AGENTS.search,
  agentFollowup: AGENTS.followup,
  supportEmail: SUPPORT_EMAIL,
  whiteLabelSlug: CURRENT_WHITE_LABEL,
};

// Default SMS templates (white-label friendly)
export const DEFAULT_SMS_TEMPLATES = {
  introduction: `Hi {{first_name}}, this is {{user_name}} from ${COMPANY_NAME}. I wanted to reach out regarding {{topic}}. Do you have a moment to chat?`,
  followUp: `Hi {{first_name}}, following up on my previous message. Let me know if you'd like to discuss further.`,
  optOut: `Reply STOP to unsubscribe from ${COMPANY_NAME} messages.`,
};

// Default email signature
export const DEFAULT_EMAIL_SIGNATURE = `
Best regards,
{{user_name}}
${COMPANY_NAME}
`;

// System prompts base (for AI agents)
export function getAISystemPrompt(agentName: string = AI_ASSISTANT_NAME): string {
  return `You are ${agentName}, an AI Sales Development Representative (SDR) assistant for ${COMPANY_NAME}. You help with lead qualification, outreach, and customer communication. Be professional, helpful, and concise.`;
}

// Check if a feature is enabled (for conditional UI rendering)
export function isFeatureEnabled(feature: keyof WhiteLabelConfig["features"]): boolean {
  // All features enabled by default - can be overridden by API
  const disabledFeatures = process.env.NEXT_PUBLIC_DISABLED_FEATURES?.split(",") || [];
  return !disabledFeatures.includes(feature);
}

// Get the API URL for fetching white-label config
export function getWhiteLabelConfigUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  return `${apiUrl}/white-labels/config?slug=${CURRENT_WHITE_LABEL}`;
}
