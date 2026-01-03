/**
 * TEMPLATE CARTRIDGE SYSTEM
 * =========================
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

import type { SMSTemplate, AIWorker, CampaignStage } from "./campaign-templates";

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
// CARTRIDGE: BUSINESS BROKERING / EXIT / EXPANSION
// Primary focus for Nextier - CRM Consultants, Business Owners
// ═══════════════════════════════════════════════════════════════════════════════

export const BUSINESS_BROKERING_CARTRIDGE: TemplateCartridge = {
  id: "business-brokering",
  name: "Business Brokering & Exit",
  description: "Templates for business valuation, exit planning, and expansion",
  audience: "Business Owners considering exit or expansion",
  industries: ["consulting", "professional services", "small business"],
  active: false,
  sicCodes: ["8742", "8748", "6282"], // Management consulting, business consulting
  keywords: ["valuation", "exit", "expansion", "sell business", "m&a"],
  templates: [
    {
      id: "bb-1",
      name: "Valuation Curiosity",
      message:
        "Hey {{name}}, {{sender_name}} with {{company}}. Ever wonder what your business could sell for? I can get you a valuation. Best email?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["valuation", "soft-open", "business-brokering"],
      variables: ["name", "sender_name", "company"],
      charCount: 136,
    },
    {
      id: "bb-2",
      name: "Hidden Value",
      message:
        "Hey {{name}}, most owners have no idea what they're sitting on. Want a quick valuation? Best email to send it?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["valuation", "curiosity", "business-brokering"],
      variables: ["name"],
      charCount: 120,
    },
    {
      id: "bb-3",
      name: "Expand or Exit",
      message:
        "{{sender_name}} here — thinking about expanding or exiting? I can get you a clean valuation. What's a good email?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["exit", "expansion", "business-brokering"],
      variables: ["sender_name"],
      charCount: 118,
    },
    {
      id: "bb-4",
      name: "Know Your Number",
      message:
        "Curious — do you know what your business would sell for right now? I can show you. Best email?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["valuation", "direct", "business-brokering"],
      variables: [],
      charCount: 99,
    },
    {
      id: "bb-5",
      name: "Exit Number",
      message:
        "Hey {{name}}, most owners don't know their exit number. Want yours? Best email?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["exit", "curiosity", "business-brokering"],
      variables: ["name"],
      charCount: 85,
    },
    {
      id: "bb-6",
      name: "Tomorrow's Offer",
      message:
        "If someone made you an offer tomorrow — do you know your number? I can get you a valuation. Email?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["urgency", "valuation", "business-brokering"],
      variables: [],
      charCount: 102,
    },
    {
      id: "bb-7",
      name: "Growth or Exit Check",
      message:
        "Hey {{name}}, growth mode or stepping back? I can get you a valuation either way. Best email?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["qualification", "valuation", "business-brokering"],
      variables: ["name"],
      charCount: 98,
    },
    {
      id: "bb-8",
      name: "1-2 Year Horizon",
      message:
        "Hey {{name}}, thinking expansion or exit in the next year or two? I can get you a valuation. Email?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["timeline", "valuation", "business-brokering"],
      variables: ["name"],
      charCount: 104,
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CARTRIDGE: CRM CONSULTANTS
// Nextier Technology audience
// ═══════════════════════════════════════════════════════════════════════════════

export const CRM_CONSULTANTS_CARTRIDGE: TemplateCartridge = {
  id: "crm-consultants",
  name: "CRM Consultants & Tech Advisors",
  description: "Templates for CRM consultants and technology advisory services",
  audience: "CRM Consultants, Tech Advisors, Implementation Specialists",
  industries: ["consulting", "technology", "saas", "crm"],
  active: false,
  sicCodes: ["7371", "7372", "8742"], // Computer services, consulting
  keywords: ["crm", "salesforce", "hubspot", "implementation", "consulting"],
  templates: [
    {
      id: "crm-1",
      name: "System Audit",
      message:
        "Hey {{name}}, {{sender_name}} from Nextier. Quick question — when's the last time you audited your CRM setup? Might be leaving money on the table.",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["crm", "audit", "consulting"],
      variables: ["name", "sender_name"],
      charCount: 142,
    },
    {
      id: "crm-2",
      name: "Pipeline Leaks",
      message:
        "{{name}}, most consultants I talk to have pipeline leaks they don't even know about. Worth a quick look? Best email?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["pipeline", "consulting", "crm"],
      variables: ["name"],
      charCount: 118,
    },
    {
      id: "crm-3",
      name: "Tech Stack Check",
      message:
        "Hey {{name}}, {{sender_name}} here. Curious — is your tech stack actually working for you or against you? Quick chat?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["tech-stack", "consulting"],
      variables: ["name", "sender_name"],
      charCount: 115,
    },
    {
      id: "crm-4",
      name: "Automation Gap",
      message:
        "{{name}}, quick Q — how much of your follow-up is still manual? Most consultants automate wrong. Worth fixing?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["automation", "consulting"],
      variables: ["name"],
      charCount: 110,
    },
    {
      id: "crm-5",
      name: "Client Retention",
      message:
        "Hey {{name}}, {{sender_name}} from Nextier. What's your current client retention strategy? Might have some ideas. Email?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["retention", "strategy", "consulting"],
      variables: ["name", "sender_name"],
      charCount: 120,
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CARTRIDGE: BLUE COLLAR
// Trades, contractors, service businesses
// ═══════════════════════════════════════════════════════════════════════════════

export const BLUE_COLLAR_CARTRIDGE: TemplateCartridge = {
  id: "blue-collar",
  name: "Blue Collar & Trades",
  description: "Templates for contractors, trades, and service businesses",
  audience: "Contractors, Plumbers, Electricians, HVAC, Landscaping",
  industries: ["construction", "trades", "home services", "contracting"],
  active: false,
  sicCodes: ["1711", "1721", "1731", "1761", "0781"], // Plumbing, HVAC, electrical, roofing, landscaping
  keywords: ["contractor", "plumber", "electrician", "hvac", "landscaping", "trades"],
  templates: [
    {
      id: "bc-1",
      name: "Busy Season",
      message:
        "Hey {{name}}, {{sender_name}} here. I know {{industry}} stays busy — ever think about what the business is worth if you wanted to step back?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["blue-collar", "valuation", "exit"],
      variables: ["name", "sender_name", "industry"],
      charCount: 138,
    },
    {
      id: "bc-2",
      name: "Crew Dependent",
      message:
        "{{name}}, quick thought — does {{businessName}} run without you, or are you still the one holding it together? Affects value big time.",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["blue-collar", "operations", "value"],
      variables: ["name", "businessName"],
      charCount: 132,
    },
    {
      id: "bc-3",
      name: "Trade Exit",
      message:
        "Hey {{name}}, a lot of {{industry}} owners I talk to built something valuable but don't know the exit number. Want yours?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["blue-collar", "exit", "valuation"],
      variables: ["name", "industry"],
      charCount: 124,
    },
    {
      id: "bc-4",
      name: "Scaling Question",
      message:
        "{{name}}, {{sender_name}} from Nextier. Are you trying to scale {{businessName}} or thinking about cashing out? Different strategies for each.",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["blue-collar", "scaling", "exit"],
      variables: ["name", "sender_name", "businessName"],
      charCount: 140,
    },
    {
      id: "bc-5",
      name: "Body Breaking",
      message:
        "Hey {{name}}, honest question — how many more years can you keep doing the physical work? Worth knowing your options. Email?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["blue-collar", "exit", "empathy"],
      variables: ["name"],
      charCount: 126,
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CARTRIDGE: REAL ESTATE (INACTIVE BY DEFAULT)
// Only inject when user explicitly requests
// ═══════════════════════════════════════════════════════════════════════════════

export const REAL_ESTATE_CARTRIDGE: TemplateCartridge = {
  id: "real-estate",
  name: "Real Estate Agents",
  description: "Templates for real estate agents and brokers - INACTIVE until requested",
  audience: "Real Estate Agents, Brokers, Realtors",
  industries: ["real estate", "realty", "property"],
  active: false, // INACTIVE - Only activate when explicitly requested
  sicCodes: ["6531"],
  keywords: ["realtor", "broker", "property", "real estate", "listings"],
  templates: [
    {
      id: "re-1",
      name: "Stop Renting",
      message:
        "Most agents keep renting their lead generation and never control the system. Nextier changes that. Open to 15 min talk?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["real-estate", "lead-gen", "meeting"],
      variables: [],
      charCount: 124,
    },
    {
      id: "re-2",
      name: "System Builds",
      message:
        "The best agents don't chase leads — their system does. That's what we build at Nextier. Best email?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["real-estate", "system", "email-capture"],
      variables: [],
      charCount: 104,
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CARTRIDGE LIBRARY (All available cartridges)
// ═══════════════════════════════════════════════════════════════════════════════

export const CARTRIDGE_LIBRARY: TemplateCartridge[] = [
  BUSINESS_BROKERING_CARTRIDGE,
  CRM_CONSULTANTS_CARTRIDGE,
  BLUE_COLLAR_CARTRIDGE,
  REAL_ESTATE_CARTRIDGE,
];

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
  listCartridges(): Array<{ id: string; name: string; active: boolean; templateCount: number }> {
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
        cartridge.industries.some((i) => i.toLowerCase().includes(lowerIndustry)) ||
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
        cartridge.industries.some((i) => i.toLowerCase().includes(lowerIndustry)) ||
        cartridge.keywords?.some((k) => k.toLowerCase().includes(lowerIndustry))
      ) {
        cartridge.active = true;
        activated.push(cartridge.id);
      }
    }

    console.log(`[CartridgeManager] Auto-activated for "${industry}":`, activated);
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
        activeCartridgeIds: ["business-brokering", "crm-consultants", "blue-collar"],
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
