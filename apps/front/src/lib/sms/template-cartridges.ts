/**
 * TEMPLATE CARTRIDGE SYSTEM
 * =========================
 * CANONICAL source of truth for all SMS templates.
 *
 * Modular template packs that only get injected when activated.
 *
 * Cartridges are self-contained template packages for specific:
 * - Industries (real estate, blue collar, consulting)
 * - Use cases (exit, expansion, lead gen)
 * - Audiences (B2B, B2C, enterprise)
 *
 * Usage:
 * 1. Import the cartridge manager
 * 2. Activate cartridges by ID
 * 3. Get combined templates from active cartridges only
 *
 * Example:
 *   cartridgeManager.activate("business-brokering");
 *   cartridgeManager.activate("blue-collar");
 *   const templates = cartridgeManager.getActiveTemplates();
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CORE TYPES (CANONICAL - moved from campaign-templates.ts)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Campaign stages in the response manufacturing flow
 */
export type CampaignStage =
  | "initial" // GIANNA - Get ANY response, capture mobile + email
  | "retarget" // CATHY - Re-engage ghosts after 7+ days
  | "nudge" // CATHY - Keep conversation alive, stale 2+ days
  | "followup" // SABRINA - Push responded leads to meeting
  | "retention" // NEVA - Existing clients, referrals, upsells
  | "confirmation"; // Appointment reminders, reduce no-shows

/**
 * AI Workers - each handles different stages of the response flow
 */
export type AIWorker =
  | "GIANNA" // The Opener - initial cold outreach
  | "CATHY" // The Nurturer - retarget + nudge with humor
  | "SABRINA" // The Closer - push to meeting
  | "NEVA" // Retention specialist
  | "APPOINTMENT_BOT"; // Confirmation/reminders

/**
 * Template Lifecycle States - controls what operations are allowed
 *
 * SignalHouse Compliance:
 * - Only APPROVED templates can be sent to real recipients
 * - DRAFT templates are for editing/preview only
 * - DEPRECATED templates are view-only (legacy)
 * - DISABLED templates throw hard errors on resolution
 */
export enum TemplateLifecycle {
  DRAFT = "DRAFT", // Not sendable, editable in admin UI
  APPROVED = "APPROVED", // Sendable via SignalHouse, immutable
  DEPRECATED = "DEPRECATED", // Preview only, executeSMS() rejects
  DISABLED = "DISABLED", // Hard fail on resolution
}

/**
 * SMS Template - the atomic unit of compliant messaging
 */
export interface SMSTemplate {
  id: string; // Unique identifier (e.g., "bb-1", "cathy-nudge-mild-1")
  name: string; // Human-readable name
  message: string; // Template content with {{variables}}
  stage: CampaignStage; // Which stage this template is for
  worker: AIWorker; // Which AI worker owns this template
  tags: string[]; // Categorization tags
  variables: string[]; // Variables used in message
  charCount: number; // Character count (SignalHouse compliance)
  lifecycle?: TemplateLifecycle; // Default: APPROVED for CARTRIDGE_LIBRARY templates
  approvedAt?: string; // ISO timestamp when approved
  approvedBy?: string; // Who approved (for audit trail)
  tenantId?: string; // null = global template, else tenant-scoped
}

// ═══════════════════════════════════════════════════════════════════════════════
// CARTRIDGE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TemplateCartridge {
  id: string;
  name: string;
  description: string;
  audience: string;
  industries: string[];
  templates: SMSTemplate[];
  active: boolean;
  sicCodes?: string[];
  keywords?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CARTRIDGE: M&A ADVISORY
// For business owners considering acquisition, sale, or strategic growth
// ═══════════════════════════════════════════════════════════════════════════════

export const BUSINESS_BROKERING_CARTRIDGE: TemplateCartridge = {
  id: "business-brokering",
  name: "M&A Advisory",
  description:
    "High-converting templates for acquisition, exit planning, and strategic growth advisory",
  audience: "Business Owners, CEOs, Founders exploring strategic options",
  industries: [
    "professional services",
    "manufacturing",
    "technology",
    "healthcare",
  ],
  active: false,
  sicCodes: ["8742", "8748", "6282"],
  keywords: ["acquisition", "exit", "valuation", "strategic", "m&a", "growth"],
  // Templates cleared - add your M&A templates here
  templates: [],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CARTRIDGE: TECHNOLOGY VALUE-ADD
// Revenue operations, automation, and tech-enabled growth
// ═══════════════════════════════════════════════════════════════════════════════

export const CRM_CONSULTANTS_CARTRIDGE: TemplateCartridge = {
  id: "crm-consultants",
  name: "Technology Value-Add",
  description:
    "Templates for revenue operations, automation, and technology-enabled business growth",
  audience: "Business Owners, Operations Leaders, Growth-Focused Executives",
  industries: ["professional services", "technology", "b2b services"],
  active: false,
  sicCodes: ["7371", "7372", "8742"],
  keywords: [
    "automation",
    "revenue operations",
    "technology",
    "efficiency",
    "growth",
  ],
  // Templates cleared - add your tech/CRM templates here
  templates: [],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CARTRIDGE: BLUE COLLAR BUSINESSES
// Service-based business owners - sell Nextier to them
// ═══════════════════════════════════════════════════════════════════════════════

export const BLUE_COLLAR_CARTRIDGE: TemplateCartridge = {
  id: "blue-collar",
  name: "Blue Collar Businesses",
  description:
    "Outreach templates to sell Nextier to service-based business owners",
  audience:
    "HVAC, Plumbing, Electrical, Landscaping, Contracting Business Owners",
  industries: [
    "construction",
    "home services",
    "field services",
    "contracting",
  ],
  active: false,
  sicCodes: ["1711", "1721", "1731", "1761", "0781"],
  keywords: [
    "contractor",
    "plumber",
    "electrician",
    "hvac",
    "landscaping",
    "service business",
  ],
  // Templates cleared - add your blue collar templates here
  templates: [],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CARTRIDGE: REAL ESTATE AGENT CLIENT LIBRARY
// Templates for Nextier Real Estate Agent clients to use with their prospects
// INACTIVE until a real estate agent signs up as a client
// ═══════════════════════════════════════════════════════════════════════════════

export const REAL_ESTATE_CARTRIDGE: TemplateCartridge = {
  id: "real-estate",
  name: "Real Estate Agent Library",
  description:
    "Template library for Real Estate Agent clients - unlocked when they sign up",
  audience: "Homebuyers, Sellers, Sphere of Influence",
  industries: ["real estate", "residential", "property"],
  active: false, // INACTIVE - Only activate for real estate agent clients
  sicCodes: ["6531"],
  keywords: ["homeowner", "buyer", "seller", "listing", "property", "sphere"],
  // Templates cleared - add your real estate templates here
  templates: [],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CARTRIDGE: CATHY NUDGE TEMPLATES
// Follow-up nudges with humor (Leslie Nielsen / Henny Youngman style)
// ═══════════════════════════════════════════════════════════════════════════════

export const CATHY_NUDGE_CARTRIDGE: TemplateCartridge = {
  id: "cathy-nudge",
  name: "CATHY Nudge Templates",
  description:
    "Follow-up nudge templates with escalating humor for re-engagement",
  audience: "Leads who haven't responded - ghosted or dormant",
  industries: ["all"],
  active: true, // Always active for internal use
  keywords: ["nudge", "follow-up", "humor", "re-engage"],
  // Templates cleared - add your nudge templates here
  templates: [],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CARTRIDGE: SABRINA OBJECTION HANDLING
// Agree-Overcome-Close responses to common objections
// ═══════════════════════════════════════════════════════════════════════════════

export const SABRINA_OBJECTION_CARTRIDGE: TemplateCartridge = {
  id: "sabrina-objection",
  name: "SABRINA Objection Handling",
  description: "Agree-Overcome-Close responses for common sales objections",
  audience: "Leads with objections - too busy, not interested, need to think",
  industries: ["all"],
  active: true,
  keywords: ["objection", "rebuttal", "closing", "agree-overcome-close"],
  // Templates cleared - add your objection handling templates here
  templates: [],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CARTRIDGE: SABRINA BOOKING
// Appointment confirmation and reminder templates
// ═══════════════════════════════════════════════════════════════════════════════

export const SABRINA_BOOKING_CARTRIDGE: TemplateCartridge = {
  id: "sabrina-booking",
  name: "SABRINA Booking Templates",
  description: "Appointment confirmation, reminder, and follow-up templates",
  audience: "Leads being booked for calls or appointments",
  industries: ["all"],
  active: true,
  keywords: ["booking", "appointment", "confirmation", "reminder"],
  // Templates cleared - add your booking templates here
  templates: [],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CARTRIDGE: NEXTIER CORE (SignalHouse Approved)
// Campaign ID: CJRCU60 | Brand: BZOYPIH - NEXTIER | Phone: +1-516-407-9249
// Use-Case: LOW_VOLUME | TPM: 75 SMS/min (AT&T), ~2,000/day (T-Mobile)
// ═══════════════════════════════════════════════════════════════════════════════

export const NEXTIER_CORE_CARTRIDGE: TemplateCartridge = {
  id: "nextier-core",
  name: "NEXTIER Core (SignalHouse Approved)",
  description:
    "First-party marketing templates for NEXTIER consulting. All templates are 10DLC compliant and approved by SignalHouse.",
  audience:
    "Business owners, executives, and decision-makers seeking operational efficiency and growth",
  industries: [
    "professional services",
    "consulting",
    "technology",
    "business services",
  ],
  active: true, // Default active - this is the core cartridge
  sicCodes: ["8742", "8748", "7371", "7389"],
  keywords: [
    "nextier",
    "consulting",
    "efficiency",
    "save time",
    "save money",
    "strategy",
    "call",
  ],
  // Templates cleared - add your SignalHouse-approved templates here
  // Campaign ID: CJRCU60 | Brand: BZOYPIH - NEXTIER | Phone: +1-516-407-9249
  templates: [],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CARTRIDGE LIBRARY (All available cartridges)
// ═══════════════════════════════════════════════════════════════════════════════

export const CARTRIDGE_LIBRARY: TemplateCartridge[] = [
  NEXTIER_CORE_CARTRIDGE, // SignalHouse approved - always first
  BUSINESS_BROKERING_CARTRIDGE,
  CRM_CONSULTANTS_CARTRIDGE,
  BLUE_COLLAR_CARTRIDGE,
  REAL_ESTATE_CARTRIDGE,
  CATHY_NUDGE_CARTRIDGE,
  SABRINA_OBJECTION_CARTRIDGE,
  SABRINA_BOOKING_CARTRIDGE,
];

// Alias for convenience
export const ALL_CARTRIDGES = CARTRIDGE_LIBRARY;

// ═══════════════════════════════════════════════════════════════════════════════
// CARTRIDGE MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

class CartridgeManager {
  private cartridges: Map<string, TemplateCartridge> = new Map();

  constructor() {
    // Load all cartridges into map
    for (const cartridge of CARTRIDGE_LIBRARY) {
      this.cartridges.set(cartridge.id, { ...cartridge });
    }
  }

  /**
   * Activate a cartridge by ID
   */
  activate(cartridgeId: string): boolean {
    const cartridge = this.cartridges.get(cartridgeId);
    if (cartridge) {
      cartridge.active = true;
      console.log(`[CartridgeManager] Activated: ${cartridge.name}`);
      return true;
    }
    console.warn(`[CartridgeManager] Cartridge not found: ${cartridgeId}`);
    return false;
  }

  /**
   * Deactivate a cartridge by ID
   */
  deactivate(cartridgeId: string): boolean {
    const cartridge = this.cartridges.get(cartridgeId);
    if (cartridge) {
      cartridge.active = false;
      console.log(`[CartridgeManager] Deactivated: ${cartridge.name}`);
      return true;
    }
    return false;
  }

  /**
   * Get all active cartridges
   */
  getActiveCartridges(): TemplateCartridge[] {
    return Array.from(this.cartridges.values()).filter((c) => c.active);
  }

  /**
   * Get combined templates from all active cartridges
   */
  getActiveTemplates(): SMSTemplate[] {
    const active = this.getActiveCartridges();
    return active.flatMap((c) => c.templates);
  }

  /**
   * Get cartridge by ID
   */
  getCartridge(cartridgeId: string): TemplateCartridge | undefined {
    return this.cartridges.get(cartridgeId);
  }

  /**
   * List all available cartridges
   */
  listCartridges(): Array<{
    id: string;
    name: string;
    active: boolean;
    templateCount: number;
  }> {
    return Array.from(this.cartridges.values()).map((c) => ({
      id: c.id,
      name: c.name,
      active: c.active,
      templateCount: c.templates.length,
    }));
  }

  /**
   * Activate multiple cartridges by IDs
   */
  activateMany(cartridgeIds: string[]): void {
    for (const id of cartridgeIds) {
      this.activate(id);
    }
  }

  /**
   * Deactivate all cartridges
   */
  deactivateAll(): void {
    for (const cartridge of this.cartridges.values()) {
      cartridge.active = false;
    }
    console.log("[CartridgeManager] All cartridges deactivated");
  }

  /**
   * Get templates by industry keyword
   */
  getTemplatesForIndustry(industry: string): SMSTemplate[] {
    const matching: SMSTemplate[] = [];
    const lowerIndustry = industry.toLowerCase();

    for (const cartridge of this.cartridges.values()) {
      if (
        cartridge.industries.some((i) =>
          i.toLowerCase().includes(lowerIndustry),
        ) ||
        cartridge.keywords?.some((k) => k.toLowerCase().includes(lowerIndustry))
      ) {
        matching.push(...cartridge.templates);
      }
    }

    return matching;
  }

  /**
   * Auto-activate cartridges based on industry
   */
  autoActivateForIndustry(industry: string): string[] {
    const activated: string[] = [];
    const lowerIndustry = industry.toLowerCase();

    for (const cartridge of this.cartridges.values()) {
      if (
        cartridge.industries.some((i) =>
          i.toLowerCase().includes(lowerIndustry),
        ) ||
        cartridge.keywords?.some((k) => k.toLowerCase().includes(lowerIndustry))
      ) {
        cartridge.active = true;
        activated.push(cartridge.id);
      }
    }

    console.log(
      `[CartridgeManager] Auto-activated for "${industry}":`,
      activated,
    );
    return activated;
  }

  /**
   * Reset to default state (only Nextier-focused cartridges active)
   */
  resetToDefault(): void {
    this.deactivateAll();
    // Default active: business brokering, crm consultants, blue collar
    this.activate("business-brokering");
    this.activate("crm-consultants");
    this.activate("blue-collar");
    console.log("[CartridgeManager] Reset to default (Nextier focus)");
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKSPACE CARTRIDGE CONFIGURATION
// Each workspace/team has its own cartridge configuration
// ═══════════════════════════════════════════════════════════════════════════════

export interface WorkspaceCartridgeConfig {
  teamId: string;
  activeCartridgeIds: string[];
  customTemplates?: SMSTemplate[];
  createdAt: Date;
  updatedAt: Date;
}

class WorkspaceCartridgeManager {
  private workspaceConfigs: Map<string, WorkspaceCartridgeConfig> = new Map();
  private globalManager: CartridgeManager;

  constructor() {
    this.globalManager = new CartridgeManager();
  }

  /**
   * Get or create workspace configuration
   */
  getWorkspaceConfig(teamId: string): WorkspaceCartridgeConfig {
    let config = this.workspaceConfigs.get(teamId);
    if (!config) {
      // Create default config for new workspace
      config = {
        teamId,
        activeCartridgeIds: [
          "business-brokering",
          "crm-consultants",
          "blue-collar",
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.workspaceConfigs.set(teamId, config);
    }
    return config;
  }

  /**
   * Activate cartridge for a workspace
   */
  activateForWorkspace(teamId: string, cartridgeId: string): boolean {
    const config = this.getWorkspaceConfig(teamId);
    if (!config.activeCartridgeIds.includes(cartridgeId)) {
      const cartridge = this.globalManager.getCartridge(cartridgeId);
      if (cartridge) {
        config.activeCartridgeIds.push(cartridgeId);
        config.updatedAt = new Date();
        console.log(`[WorkspaceCartridge] ${teamId}: Activated ${cartridgeId}`);
        return true;
      }
    }
    return false;
  }

  /**
   * Deactivate cartridge for a workspace
   */
  deactivateForWorkspace(teamId: string, cartridgeId: string): boolean {
    const config = this.getWorkspaceConfig(teamId);
    const index = config.activeCartridgeIds.indexOf(cartridgeId);
    if (index > -1) {
      config.activeCartridgeIds.splice(index, 1);
      config.updatedAt = new Date();
      console.log(`[WorkspaceCartridge] ${teamId}: Deactivated ${cartridgeId}`);
      return true;
    }
    return false;
  }

  /**
   * Get active templates for a workspace
   */
  getTemplatesForWorkspace(teamId: string): SMSTemplate[] {
    const config = this.getWorkspaceConfig(teamId);
    const templates: SMSTemplate[] = [];

    for (const cartridgeId of config.activeCartridgeIds) {
      const cartridge = this.globalManager.getCartridge(cartridgeId);
      if (cartridge) {
        templates.push(...cartridge.templates);
      }
    }

    // Add any custom workspace templates
    if (config.customTemplates) {
      templates.push(...config.customTemplates);
    }

    return templates;
  }

  /**
   * Add custom template to workspace
   */
  addCustomTemplate(teamId: string, template: SMSTemplate): void {
    const config = this.getWorkspaceConfig(teamId);
    if (!config.customTemplates) {
      config.customTemplates = [];
    }
    config.customTemplates.push(template);
    config.updatedAt = new Date();
  }

  /**
   * Set workspace to specific industry preset
   */
  setIndustryPreset(
    teamId: string,
    industry: "consulting" | "blue-collar" | "professional-services",
  ): void {
    const config = this.getWorkspaceConfig(teamId);

    switch (industry) {
      case "consulting":
        config.activeCartridgeIds = ["crm-consultants", "business-brokering"];
        break;
      case "blue-collar":
        config.activeCartridgeIds = ["blue-collar", "business-brokering"];
        break;
      case "professional-services":
        config.activeCartridgeIds = ["business-brokering", "crm-consultants"];
        break;
    }

    config.updatedAt = new Date();
    console.log(`[WorkspaceCartridge] ${teamId}: Set preset ${industry}`);
  }

  /**
   * List active cartridges for workspace
   */
  listActiveForWorkspace(teamId: string): Array<{ id: string; name: string }> {
    const config = this.getWorkspaceConfig(teamId);
    return config.activeCartridgeIds
      .map((id) => {
        const cartridge = this.globalManager.getCartridge(id);
        return cartridge ? { id: cartridge.id, name: cartridge.name } : null;
      })
      .filter((c): c is { id: string; name: string } => c !== null);
  }

  /**
   * Get all available cartridges (for UI selection)
   */
  getAvailableCartridges(): Array<{
    id: string;
    name: string;
    description: string;
    templateCount: number;
  }> {
    return this.globalManager.listCartridges().map((c) => {
      const full = this.globalManager.getCartridge(c.id);
      return {
        id: c.id,
        name: c.name,
        description: full?.description || "",
        templateCount: c.templateCount,
      };
    });
  }
}

// Export singleton instances
export const cartridgeManager = new CartridgeManager();
export const workspaceCartridgeManager = new WorkspaceCartridgeManager();

// Initialize with Nextier defaults (no real estate)
cartridgeManager.resetToDefault();
