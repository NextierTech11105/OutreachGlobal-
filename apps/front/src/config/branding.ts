/**
 * White-label branding configuration
 * All tenant-specific branding is controlled via environment variables
 * Defaults to Nextier branding if not set
 */

// Core branding
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Nextier";
export const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || "Nextier";
export const PLATFORM_NAME = `${APP_NAME} Data Engine`;

// AI Assistant names (configurable per tenant)
export const AI_ASSISTANT_NAME =
  process.env.NEXT_PUBLIC_AI_ASSISTANT_NAME || "Gianna";
export const AI_ASSISTANT_FULL = `${AI_ASSISTANT_NAME} | ${APP_NAME}`;

// Agent names - these can be customized per tenant
export const AGENTS = {
  primary: AI_ASSISTANT_NAME, // Main conversational AI (Gianna)
  search: process.env.NEXT_PUBLIC_AI_SEARCH_NAME || "LUCI", // Search & enrich agent
  followup: process.env.NEXT_PUBLIC_AI_FOLLOWUP_NAME || "Cathy", // Follow-up agent
  datalake: process.env.NEXT_PUBLIC_AI_DATALAKE_NAME || "Datalake", // Data source agent
};

// Email configuration
export const EMAIL_SENDER_NAME =
  process.env.EMAIL_SENDER_NAME || AI_ASSISTANT_FULL;

// Theme
export const THEME_KEY = process.env.NEXT_PUBLIC_THEME_KEY || "nextier-theme";

// Logo (optional custom logo URL)
export const LOGO_URL = process.env.NEXT_PUBLIC_LOGO_URL || "";

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
export function getAISystemPrompt(
  agentName: string = AI_ASSISTANT_NAME,
): string {
  return `You are ${agentName}, an AI Sales Development Representative (SDR) assistant for ${COMPANY_NAME}. You help with lead qualification, outreach, and customer communication. Be professional, helpful, and concise.`;
}
