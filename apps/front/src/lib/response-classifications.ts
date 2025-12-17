// ==========================================
// AI COPILOT GIANNA - INBOUND RESPONSE HANDLING
// Per-client SMS response classification logic
// ==========================================

export interface ResponseClassification {
  id: string;
  name: string;
  description: string;
  detect: (message: string) => boolean;
  extract?: (message: string) => Record<string, string | null>;
  priority: number; // Higher = check first
  deliverable?: string; // What content to deliver (property-valuation, exit-prep, white-label-pitch, etc.)
  queue?: string; // Which delivery queue (valuation-queue, content-queue, etc.)
}

// ==========================================
// DELIVERABLE TYPES
// Content delivered based on email capture
// ==========================================
export type DeliverableType =
  | "property-valuation-report" // Homeowner Advisor
  | "exit-preparation" // ECBB deal sourcing targets
  | "white-label-pitch" // OutreachGlobal prospects (consultants/agencies)
  | "user-to-owner-pitch" // Nextier RE broker prospects
  | "buyer-profile" // ECBB deal origination (PE/REITs)
  | "custom";

export interface DeliverableConfig {
  type: DeliverableType;
  name: string;
  description: string;
  queue: string;
  clientIds: string[];
}

export const DELIVERABLES: DeliverableConfig[] = [
  {
    type: "property-valuation-report",
    name: "Property Valuation Report",
    description: "Home valuation report for property owners",
    queue: "valuation-queue",
    clientIds: ["homeowner-advisor"],
  },
  {
    type: "exit-preparation",
    name: "Exit Preparation Content",
    description: "Business exit planning content for deal sourcing targets",
    queue: "content-queue",
    clientIds: ["ecbb-deal-sourcing"],
  },
  {
    type: "white-label-pitch",
    name: "White Label Pitch",
    description: "OutreachGlobal white-label platform pitch for agencies",
    queue: "sales-queue",
    clientIds: ["outreachglobal-white-label"],
  },
  {
    type: "user-to-owner-pitch",
    name: "User-to-Owner Pitch",
    description: "Nextier platform pitch for RE brokers to white-label",
    queue: "sales-queue",
    clientIds: ["nextier-re-datalake"],
  },
  {
    type: "buyer-profile",
    name: "Buyer Profile",
    description: "Investment criteria for PE/REIT deal origination",
    queue: "origination-queue",
    clientIds: ["ecbb-deal-origination"],
  },
];

export interface ClientClassifications {
  clientId: string;
  clientName: string;
  businessLine: string;
  classifications: ResponseClassification[];
}

// ==========================================
// DETECTION HELPERS
// ==========================================

// Email regex - captures email addresses
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;

// Phone regex - captures phone numbers
const PHONE_REGEX = /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g;

// Opt-out keywords
const OPT_OUT_KEYWORDS = ["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT", "OPTOUT", "OPT OUT", "REMOVE"];

// Interest keywords
const INTEREST_KEYWORDS = ["YES", "INTERESTED", "CALL", "INFO", "MORE", "DETAILS", "HELP", "TELL ME"];

// Negative keywords
const NEGATIVE_KEYWORDS = ["NO", "NOT INTERESTED", "NO THANKS", "PASS", "DECLINE", "WRONG NUMBER"];

// ==========================================
// HOMEOWNER ADVISOR CLASSIFICATIONS
// Business Line: Nextier (WHITE-LABEL CLIENT #1)
// Focus: Residential Distressed Real Estate
// Goal: Capture emails for PROPERTY VALUATION reports
// Director: Cole (manages this client)
// ==========================================

const HOMEOWNER_ADVISOR_CLASSIFICATIONS: ResponseClassification[] = [
  {
    id: "email-capture",
    name: "Email Capture",
    description: "Response contains email address for PROPERTY VALUATION report delivery",
    priority: 100,
    detect: (message: string) => {
      const emails = message.match(EMAIL_REGEX);
      return emails !== null && emails.length > 0;
    },
    extract: (message: string) => {
      const emails = message.match(EMAIL_REGEX);
      return {
        email: emails?.[0] || null,
        allEmails: emails?.join(", ") || null,
        deliverable: "property-valuation-report",
      };
    },
  },
  {
    id: "opt-out",
    name: "Opt-Out",
    description: "Contact requested to be removed from SMS list",
    priority: 90,
    detect: (message: string) => {
      const upper = message.toUpperCase().trim();
      return OPT_OUT_KEYWORDS.some((kw) => upper.includes(kw));
    },
  },
  {
    id: "interested",
    name: "Interested",
    description: "Contact expressed interest in valuation report",
    priority: 50,
    detect: (message: string) => {
      const upper = message.toUpperCase().trim();
      return INTEREST_KEYWORDS.some((kw) => upper.includes(kw));
    },
  },
  {
    id: "not-interested",
    name: "Not Interested",
    description: "Contact declined or not interested",
    priority: 40,
    detect: (message: string) => {
      const upper = message.toUpperCase().trim();
      return NEGATIVE_KEYWORDS.some((kw) => upper.includes(kw));
    },
  },
  {
    id: "thank-you",
    name: "Thank You",
    description: "Contact acknowledged receipt (likely after email provided)",
    priority: 30,
    detect: (message: string) => {
      const upper = message.toUpperCase().trim();
      return upper.includes("THANK") || upper.includes("THANKS") || upper.includes("TY");
    },
  },
  {
    id: "question",
    name: "Question",
    description: "Contact asked a question - needs follow-up",
    priority: 20,
    detect: (message: string) => {
      return message.includes("?");
    },
  },
  {
    id: "other",
    name: "Other Response",
    description: "Unclassified response - needs manual review",
    priority: 0,
    detect: () => true, // Catch-all
  },
];

// ==========================================
// CLIENT CLASSIFICATION REGISTRY
// ==========================================

export const CLIENT_CLASSIFICATIONS: ClientClassifications[] = [
  {
    clientId: "homeowner-advisor",
    clientName: "Homeowner Advisor",
    businessLine: "nextier",
    classifications: HOMEOWNER_ADVISOR_CLASSIFICATIONS,
  },
  // Add more clients here as needed:
  // {
  //   clientId: "nextier-direct",
  //   clientName: "Nextier Direct",
  //   businessLine: "nextier",
  //   classifications: [...],
  // },
  // {
  //   clientId: "ecbb",
  //   clientName: "East Coast Business Brokers",
  //   businessLine: "ecbb",
  //   classifications: [...],
  // },
];

// ==========================================
// CLASSIFICATION ENGINE
// ==========================================

export interface ClassificationResult {
  clientId: string;
  classificationId: string;
  classificationName: string;
  extracted: Record<string, string | null>;
  message: string;
  timestamp: string;
}

/**
 * Classify an SMS response for a specific client
 */
export function classifyResponse(
  clientId: string,
  message: string
): ClassificationResult | null {
  const client = CLIENT_CLASSIFICATIONS.find((c) => c.clientId === clientId);
  if (!client) {
    console.warn(`[Classification] Unknown client: ${clientId}`);
    return null;
  }

  // Sort by priority (highest first)
  const sorted = [...client.classifications].sort((a, b) => b.priority - a.priority);

  for (const classification of sorted) {
    if (classification.detect(message)) {
      const extracted = classification.extract?.(message) || {};
      return {
        clientId,
        classificationId: classification.id,
        classificationName: classification.name,
        extracted,
        message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  return null;
}

/**
 * Get all classifications for a client
 */
export function getClientClassifications(clientId: string): ResponseClassification[] {
  const client = CLIENT_CLASSIFICATIONS.find((c) => c.clientId === clientId);
  return client?.classifications || [];
}

/**
 * Check if message is an email capture
 */
export function isEmailCapture(message: string): boolean {
  const emails = message.match(EMAIL_REGEX);
  return emails !== null && emails.length > 0;
}

/**
 * Extract email from message
 */
export function extractEmail(message: string): string | null {
  const emails = message.match(EMAIL_REGEX);
  return emails?.[0] || null;
}

/**
 * Check if message is an opt-out
 */
export function isOptOut(message: string): boolean {
  const upper = message.toUpperCase().trim();
  return OPT_OUT_KEYWORDS.some((kw) => upper.includes(kw));
}

/**
 * Check if message shows interest
 */
export function isInterested(message: string): boolean {
  const upper = message.toUpperCase().trim();
  return INTEREST_KEYWORDS.some((kw) => upper.includes(kw));
}

// Log on import
console.log(`[Response Classifications] Loaded ${CLIENT_CLASSIFICATIONS.length} client configurations`);
