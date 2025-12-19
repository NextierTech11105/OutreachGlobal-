/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SMS HYPERPERSONALIZATION EXTENSIONS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Extends the existing sms-queue-service variable system with:
 * - CATHY nudger variables (attempt_count, days_since_contact)
 * - Property variables (estimated_value, equity_estimate)
 * - Business variables (sic_description, annual_revenue)
 * - Agent variables (agent_signature, team_name)
 *
 * NOTE: This integrates with sms-queue-service.ts renderTemplate()
 * The core variables (firstName, lastName, companyName, industry, fullName)
 * are already defined in sms-queue-service.ts
 */

// ═══════════════════════════════════════════════════════════════════════════════
// VARIABLE CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LeadVariables {
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  email: string;
}

export interface PropertyVariables {
  property_address: string;
  property_street: string;
  property_city: string;
  property_state: string;
  property_zip: string;
  property_county: string;
  estimated_value: string;
  equity_estimate: string;
  lot_size: string;
  year_built: string;
  bedrooms: string;
  bathrooms: string;
}

export interface BusinessVariables {
  company_name: string;
  business_name: string;
  industry: string;
  sic_code: string;
  sic_description: string;
  employee_count: string;
  annual_revenue: string;
  years_in_business: string;
}

export interface CampaignVariables {
  campaign_name: string;
  campaign_context: string; // initial, retarget, follow_up, nudger, etc.
  value_content: string; // Property Valuation Report, Exit Strategy Guide, etc.
  offer_type: string;
  call_to_action: string;
}

export interface AgentVariables {
  agent_name: string;
  agent_first_name: string;
  agent_phone: string;
  agent_email: string;
  agent_title: string;
  agent_signature: string;
  company_name: string;
  team_name: string;
}

export interface NudgerVariables {
  attempt_count: string;
  last_attempt_date: string;
  days_since_contact: string;
  suggested_time: string;
}

export interface DateTimeVariables {
  current_date: string;
  current_day: string;
  current_month: string;
  current_year: string;
  current_time: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNIFIED CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

export interface SMSPersonalizationContext {
  lead: Partial<LeadVariables>;
  property?: Partial<PropertyVariables>;
  business?: Partial<BusinessVariables>;
  campaign: Partial<CampaignVariables>;
  agent: Partial<AgentVariables>;
  nudger?: Partial<NudgerVariables>;
  custom?: Record<string, string>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VARIABLE DEFINITIONS FOR UI
// ═══════════════════════════════════════════════════════════════════════════════

export interface VariableDefinition {
  key: string;
  label: string;
  category: string;
  example: string;
  required: boolean;
}

export const SMS_VARIABLES: VariableDefinition[] = [
  // Lead Variables
  {
    key: "first_name",
    label: "First Name",
    category: "Lead",
    example: "John",
    required: true,
  },
  {
    key: "last_name",
    label: "Last Name",
    category: "Lead",
    example: "Smith",
    required: false,
  },
  {
    key: "full_name",
    label: "Full Name",
    category: "Lead",
    example: "John Smith",
    required: false,
  },
  {
    key: "phone",
    label: "Phone",
    category: "Lead",
    example: "(555) 123-4567",
    required: false,
  },
  {
    key: "email",
    label: "Email",
    category: "Lead",
    example: "john@email.com",
    required: false,
  },

  // Property Variables
  {
    key: "property_address",
    label: "Property Address",
    category: "Property",
    example: "123 Main St, Queens, NY 11101",
    required: false,
  },
  {
    key: "property_street",
    label: "Street Address",
    category: "Property",
    example: "123 Main St",
    required: false,
  },
  {
    key: "property_city",
    label: "City",
    category: "Property",
    example: "Queens",
    required: false,
  },
  {
    key: "property_state",
    label: "State",
    category: "Property",
    example: "NY",
    required: false,
  },
  {
    key: "property_zip",
    label: "ZIP Code",
    category: "Property",
    example: "11101",
    required: false,
  },
  {
    key: "property_county",
    label: "County",
    category: "Property",
    example: "Queens County",
    required: false,
  },
  {
    key: "estimated_value",
    label: "Estimated Value",
    category: "Property",
    example: "$450,000",
    required: false,
  },
  {
    key: "equity_estimate",
    label: "Equity Estimate",
    category: "Property",
    example: "$125,000",
    required: false,
  },

  // Business Variables
  {
    key: "company_name",
    label: "Company Name",
    category: "Business",
    example: "Acme Corp",
    required: false,
  },
  {
    key: "business_name",
    label: "Business Name",
    category: "Business",
    example: "Smith's Auto Shop",
    required: false,
  },
  {
    key: "industry",
    label: "Industry",
    category: "Business",
    example: "Automotive Repair",
    required: false,
  },
  {
    key: "sic_code",
    label: "SIC Code",
    category: "Business",
    example: "7538",
    required: false,
  },
  {
    key: "sic_description",
    label: "SIC Description",
    category: "Business",
    example: "General Automotive Repair",
    required: false,
  },
  {
    key: "employee_count",
    label: "Employee Count",
    category: "Business",
    example: "15",
    required: false,
  },
  {
    key: "annual_revenue",
    label: "Annual Revenue",
    category: "Business",
    example: "$2.5M",
    required: false,
  },
  {
    key: "years_in_business",
    label: "Years in Business",
    category: "Business",
    example: "12",
    required: false,
  },

  // Campaign Variables
  {
    key: "campaign_name",
    label: "Campaign Name",
    category: "Campaign",
    example: "Q4 Homeowner Outreach",
    required: false,
  },
  {
    key: "campaign_context",
    label: "Campaign Context",
    category: "Campaign",
    example: "initial",
    required: false,
  },
  {
    key: "value_content",
    label: "Value Content",
    category: "Campaign",
    example: "Property Valuation Report",
    required: false,
  },
  {
    key: "offer_type",
    label: "Offer Type",
    category: "Campaign",
    example: "Cash Offer",
    required: false,
  },
  {
    key: "call_to_action",
    label: "Call to Action",
    category: "Campaign",
    example: "Reply YES for details",
    required: false,
  },

  // Agent Variables
  {
    key: "agent_name",
    label: "Agent Name",
    category: "Agent",
    example: "Sarah Johnson",
    required: false,
  },
  {
    key: "agent_first_name",
    label: "Agent First Name",
    category: "Agent",
    example: "Sarah",
    required: false,
  },
  {
    key: "agent_phone",
    label: "Agent Phone",
    category: "Agent",
    example: "(555) 987-6543",
    required: false,
  },
  {
    key: "agent_email",
    label: "Agent Email",
    category: "Agent",
    example: "sarah@company.com",
    required: false,
  },
  {
    key: "agent_title",
    label: "Agent Title",
    category: "Agent",
    example: "Senior Acquisitions Specialist",
    required: false,
  },
  {
    key: "agent_signature",
    label: "Agent Signature",
    category: "Agent",
    example: "- Sarah",
    required: false,
  },
  {
    key: "team_name",
    label: "Team Name",
    category: "Agent",
    example: "Nextier Acquisitions",
    required: false,
  },

  // Nudger Variables (CATHY)
  {
    key: "attempt_count",
    label: "Attempt Count",
    category: "Nudger",
    example: "3",
    required: false,
  },
  {
    key: "last_attempt_date",
    label: "Last Attempt Date",
    category: "Nudger",
    example: "Dec 15",
    required: false,
  },
  {
    key: "days_since_contact",
    label: "Days Since Contact",
    category: "Nudger",
    example: "5",
    required: false,
  },
  {
    key: "suggested_time",
    label: "Suggested Time",
    category: "Nudger",
    example: "evening",
    required: false,
  },

  // DateTime Variables
  {
    key: "current_date",
    label: "Current Date",
    category: "DateTime",
    example: "December 18, 2024",
    required: false,
  },
  {
    key: "current_day",
    label: "Day of Week",
    category: "DateTime",
    example: "Wednesday",
    required: false,
  },
  {
    key: "current_month",
    label: "Current Month",
    category: "DateTime",
    example: "December",
    required: false,
  },
  {
    key: "current_year",
    label: "Current Year",
    category: "DateTime",
    example: "2024",
    required: false,
  },
];

// Group variables by category for UI
export const VARIABLE_CATEGORIES = [
  { id: "Lead", label: "Lead Info", icon: "user" },
  { id: "Property", label: "Property", icon: "home" },
  { id: "Business", label: "Business", icon: "building" },
  { id: "Campaign", label: "Campaign", icon: "megaphone" },
  { id: "Agent", label: "Agent/Sender", icon: "badge" },
  { id: "Nudger", label: "CATHY Nudger", icon: "bell" },
  { id: "DateTime", label: "Date/Time", icon: "calendar" },
];

export function getVariablesByCategory(category: string): VariableDefinition[] {
  return SMS_VARIABLES.filter((v) => v.category === category);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Replace all {{variable}} placeholders in a template
 */
export function renderTemplate(
  template: string,
  context: SMSPersonalizationContext,
): { rendered: string; missingVars: string[] } {
  const missingVars: string[] = [];

  // Flatten context into single object
  const vars: Record<string, string> = {
    ...context.lead,
    ...context.property,
    ...context.business,
    ...context.campaign,
    ...context.agent,
    ...context.nudger,
    ...context.custom,
    // Auto-generate datetime vars
    current_date: new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    current_day: new Date().toLocaleDateString("en-US", { weekday: "long" }),
    current_month: new Date().toLocaleDateString("en-US", { month: "long" }),
    current_year: new Date().getFullYear().toString(),
    current_time: new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
  };

  // Derive full_name if not provided
  if (!vars.full_name && vars.first_name) {
    vars.full_name = vars.last_name
      ? `${vars.first_name} ${vars.last_name}`
      : vars.first_name;
  }

  // Replace all variables
  let rendered = template;
  const varPattern = /\{\{(\w+)\}\}/g;
  let match;

  while ((match = varPattern.exec(template)) !== null) {
    const varName = match[1];
    const value = vars[varName];

    if (value !== undefined && value !== null && value !== "") {
      rendered = rendered.replace(
        new RegExp(`\\{\\{${varName}\\}\\}`, "g"),
        value,
      );
    } else {
      missingVars.push(varName);
    }
  }

  return { rendered, missingVars };
}

/**
 * Extract all variables from a template
 */
export function extractVariables(template: string): string[] {
  const varPattern = /\{\{(\w+)\}\}/g;
  const vars: string[] = [];
  let match;

  while ((match = varPattern.exec(template)) !== null) {
    if (!vars.includes(match[1])) {
      vars.push(match[1]);
    }
  }

  return vars;
}

/**
 * Validate template - check for undefined variables
 */
export function validateTemplate(template: string): {
  valid: boolean;
  unknownVars: string[];
  warnings: string[];
} {
  const usedVars = extractVariables(template);
  const knownVarKeys = SMS_VARIABLES.map((v) => v.key);
  const unknownVars = usedVars.filter((v) => !knownVarKeys.includes(v));
  const warnings: string[] = [];

  // Check for common issues
  if (template.length > 160) {
    warnings.push(
      `Message is ${template.length} characters (${Math.ceil(template.length / 160)} SMS segments)`,
    );
  }

  if (!template.includes("{{first_name}}")) {
    warnings.push("Consider adding {{first_name}} for personalization");
  }

  return {
    valid: unknownVars.length === 0,
    unknownVars,
    warnings,
  };
}

/**
 * Preview template with example data
 */
export function previewTemplate(template: string): string {
  const exampleContext: SMSPersonalizationContext = {
    lead: {
      first_name: "John",
      last_name: "Smith",
      full_name: "John Smith",
      phone: "(555) 123-4567",
      email: "john@email.com",
    },
    property: {
      property_address: "123 Main St, Queens, NY 11101",
      property_street: "123 Main St",
      property_city: "Queens",
      property_state: "NY",
      property_zip: "11101",
      estimated_value: "$450,000",
      equity_estimate: "$125,000",
    },
    business: {
      company_name: "Acme Corp",
      business_name: "Smith's Auto Shop",
      industry: "Automotive Repair",
    },
    campaign: {
      campaign_name: "Q4 Homeowner Outreach",
      value_content: "Property Valuation Report",
      offer_type: "Cash Offer",
    },
    agent: {
      agent_name: "Sarah Johnson",
      agent_first_name: "Sarah",
      agent_phone: "(555) 987-6543",
      agent_signature: "- Sarah",
      team_name: "Nextier Acquisitions",
    },
    nudger: {
      attempt_count: "3",
      last_attempt_date: "Dec 15",
      days_since_contact: "5",
      suggested_time: "evening",
    },
  };

  const { rendered } = renderTemplate(template, exampleContext);
  return rendered;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATHY INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build context for CATHY nudger from lead data
 */
export function buildCathyContext(
  lead: {
    firstName: string;
    lastName?: string;
    phone?: string;
    propertyAddress?: string;
    companyName?: string;
  },
  nudgerData: {
    attemptNumber: number;
    lastAttemptAt?: string;
    suggestedTime?: string;
  },
  agent: {
    name?: string;
    signature?: string;
  },
): SMSPersonalizationContext {
  const daysSince = nudgerData.lastAttemptAt
    ? Math.floor(
        (Date.now() - new Date(nudgerData.lastAttemptAt).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  return {
    lead: {
      first_name: lead.firstName,
      last_name: lead.lastName,
      phone: lead.phone,
    },
    property: lead.propertyAddress
      ? { property_address: lead.propertyAddress }
      : undefined,
    business: lead.companyName ? { company_name: lead.companyName } : undefined,
    campaign: {
      campaign_context: "nudger",
    },
    agent: {
      agent_name: agent.name,
      agent_signature: agent.signature || `- ${agent.name || "Cathy"}`,
    },
    nudger: {
      attempt_count: String(nudgerData.attemptNumber),
      last_attempt_date: nudgerData.lastAttemptAt
        ? new Date(nudgerData.lastAttemptAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : "",
      days_since_contact: String(daysSince),
      suggested_time: nudgerData.suggestedTime || "",
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERSONALITY DNA INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

import {
  ConversationContext as PersonalityContext,
  generateMessageWithDNA,
  PERSONALITY_ARCHETYPES,
  type PersonalityArchetype,
} from "../gianna/personality-dna";

/**
 * Generate message using Personality DNA with full hyperpersonalization
 */
export function generatePersonalizedMessage(
  context: SMSPersonalizationContext,
  personality: PersonalityArchetype,
  stage: PersonalityContext["stage"] = "cold_open",
): {
  message: string;
  rendered: string;
  personality: PersonalityArchetype;
  segments: number;
} {
  // Build personality context
  const personalityContext: PersonalityContext = {
    firstName: context.lead.first_name || "there",
    companyName:
      context.business?.company_name || context.business?.business_name,
    industry: context.business?.industry,
    stage,
    messageNumber: 1,
    preferredPersonality: personality,
  };

  // Generate with DNA
  const result = generateMessageWithDNA(personalityContext);

  // Render with full context
  const { rendered } = renderTemplate(result.message, context);

  return {
    message: result.message,
    rendered,
    personality: result.personality,
    segments: Math.ceil(rendered.length / 160),
  };
}

console.log("[Hyperpersonalization] SMS variable system loaded");
