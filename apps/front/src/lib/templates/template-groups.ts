/**
 * TEMPLATE GROUPS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Organize templates into logical groups for campaign management.
 * Groups can be:
 * - Vertical-specific (plumbers, trucking, real-estate)
 * - Campaign-specific (q1-push, summer-promo)
 * - Worker-specific (gianna-openers, cathy-nudges)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { WorkerType, VerticalType, TemplateCategory } from "./nextier-defaults";

// =============================================================================
// TYPES
// =============================================================================

export type GroupType =
  | "vertical" // Industry-specific groups
  | "campaign" // Campaign-specific groups
  | "worker" // Worker-specific groups
  | "module" // Product module groups
  | "custom"; // User-defined groups

// =============================================================================
// TONALITY / TEMPERATURE SYSTEM
// =============================================================================

/**
 * Tonality Temperature - Controls the "vibe" of messaging
 * Range: 0-100
 * 0 = Very Formal/Professional
 * 50 = Balanced/Direct
 * 100 = Very Casual/Funny
 */
export type TonalityLevel = "formal" | "professional" | "balanced" | "casual" | "funny";

export interface TonalitySettings {
  level: TonalityLevel;
  temperature: number; // 0-100
  allowHumor: boolean;
  allowSlang: boolean;
  useEmoji: boolean;
}

export const TONALITY_PRESETS: Record<TonalityLevel, TonalitySettings> = {
  formal: {
    level: "formal",
    temperature: 10,
    allowHumor: false,
    allowSlang: false,
    useEmoji: false,
  },
  professional: {
    level: "professional",
    temperature: 30,
    allowHumor: false,
    allowSlang: false,
    useEmoji: false,
  },
  balanced: {
    level: "balanced",
    temperature: 50,
    allowHumor: true,
    allowSlang: false,
    useEmoji: false,
  },
  casual: {
    level: "casual",
    temperature: 70,
    allowHumor: true,
    allowSlang: true,
    useEmoji: false,
  },
  funny: {
    level: "funny",
    temperature: 90,
    allowHumor: true,
    allowSlang: true,
    useEmoji: true,
  },
};

/**
 * Get tonality preset by temperature value
 */
export function getTonalityByTemperature(temp: number): TonalitySettings {
  if (temp <= 20) return TONALITY_PRESETS.formal;
  if (temp <= 40) return TONALITY_PRESETS.professional;
  if (temp <= 60) return TONALITY_PRESETS.balanced;
  if (temp <= 80) return TONALITY_PRESETS.casual;
  return TONALITY_PRESETS.funny;
}

export interface TemplateGroup {
  id: string;
  name: string;
  description: string;
  type: GroupType;
  vertical?: VerticalType | "universal";
  worker?: WorkerType;
  tonality?: TonalitySettings;
  templateIds: string[];
  metadata?: {
    color?: string;
    icon?: string;
    tags?: string[];
    module?: string;
    createdAt?: Date;
    updatedAt?: Date;
  };
  active: boolean;
}

export interface GroupFilter {
  type?: GroupType;
  vertical?: VerticalType | "universal";
  worker?: WorkerType;
  active?: boolean;
}

// =============================================================================
// GROUP REGISTRY
// =============================================================================

// Build your own groups per campaign - start empty
export const TEMPLATE_GROUPS: TemplateGroup[] = [];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all template groups
 */
export function getAllGroups(): TemplateGroup[] {
  return TEMPLATE_GROUPS;
}

/**
 * Get groups by filter
 */
export function getGroupsByFilter(filter: GroupFilter): TemplateGroup[] {
  return TEMPLATE_GROUPS.filter((group) => {
    if (filter.type && group.type !== filter.type) return false;
    if (filter.vertical && group.vertical !== filter.vertical) return false;
    if (filter.worker && group.worker !== filter.worker) return false;
    if (filter.active !== undefined && group.active !== filter.active) return false;
    return true;
  });
}

/**
 * Get group by ID
 */
export function getGroupById(id: string): TemplateGroup | undefined {
  return TEMPLATE_GROUPS.find((group) => group.id === id);
}

/**
 * Get groups by type
 */
export function getGroupsByType(type: GroupType): TemplateGroup[] {
  return TEMPLATE_GROUPS.filter((group) => group.type === type);
}

/**
 * Get groups by vertical
 */
export function getGroupsByVertical(vertical: VerticalType | "universal"): TemplateGroup[] {
  return TEMPLATE_GROUPS.filter(
    (group) => group.vertical === vertical || group.vertical === "universal"
  );
}

/**
 * Get groups by worker
 */
export function getGroupsByWorker(worker: WorkerType): TemplateGroup[] {
  return TEMPLATE_GROUPS.filter((group) => group.worker === worker);
}

/**
 * Get active groups only
 */
export function getActiveGroups(): TemplateGroup[] {
  return TEMPLATE_GROUPS.filter((group) => group.active);
}

/**
 * Create a new group (in-memory only - for UI)
 */
export function createGroup(
  id: string,
  name: string,
  type: GroupType,
  options?: Partial<Omit<TemplateGroup, "id" | "name" | "type">>
): TemplateGroup {
  return {
    id,
    name,
    type,
    description: options?.description || "",
    vertical: options?.vertical,
    worker: options?.worker,
    templateIds: options?.templateIds || [],
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
      ...options?.metadata,
    },
    active: options?.active ?? true,
  };
}

/**
 * Add template to group (returns new group object)
 */
export function addTemplateToGroup(group: TemplateGroup, templateId: string): TemplateGroup {
  if (group.templateIds.includes(templateId)) {
    return group;
  }
  return {
    ...group,
    templateIds: [...group.templateIds, templateId],
    metadata: {
      ...group.metadata,
      updatedAt: new Date(),
    },
  };
}

/**
 * Remove template from group (returns new group object)
 */
export function removeTemplateFromGroup(group: TemplateGroup, templateId: string): TemplateGroup {
  return {
    ...group,
    templateIds: group.templateIds.filter((id) => id !== templateId),
    metadata: {
      ...group.metadata,
      updatedAt: new Date(),
    },
  };
}

// =============================================================================
// DEFAULT GROUP PRESETS (empty structures for reference)
// =============================================================================

export const GROUP_PRESETS = {
  // Vertical presets
  verticals: {
    plumbing: () =>
      createGroup("vertical-plumbing", "Plumbing", "vertical", {
        vertical: "business-broker",
        description: "Templates for plumbing business owners",
        metadata: { color: "blue", icon: "Wrench", tags: ["trades", "plumbing"] },
      }),
    trucking: () =>
      createGroup("vertical-trucking", "Trucking", "vertical", {
        vertical: "business-broker",
        description: "Templates for trucking company owners",
        metadata: { color: "orange", icon: "Truck", tags: ["logistics", "trucking"] },
      }),
    hvac: () =>
      createGroup("vertical-hvac", "HVAC", "vertical", {
        vertical: "business-broker",
        description: "Templates for HVAC business owners",
        metadata: { color: "cyan", icon: "Thermometer", tags: ["trades", "hvac"] },
      }),
    realEstate: () =>
      createGroup("vertical-realestate", "Real Estate", "vertical", {
        vertical: "real-estate",
        description: "Templates for real estate agents/brokers",
        metadata: { color: "green", icon: "Home", tags: ["real-estate"] },
      }),
  },

  // Worker presets
  workers: {
    gianna: () =>
      createGroup("worker-gianna", "GIANNA Openers", "worker", {
        worker: "gianna",
        description: "Initial contact templates for GIANNA",
        metadata: { color: "purple", icon: "Zap" },
      }),
    cathy: () =>
      createGroup("worker-cathy", "CATHY Nudges", "worker", {
        worker: "cathy",
        description: "Follow-up templates for CATHY",
        metadata: { color: "orange", icon: "Bell" },
      }),
    sabrina: () =>
      createGroup("worker-sabrina", "SABRINA Closers", "worker", {
        worker: "sabrina",
        description: "Booking templates for SABRINA",
        metadata: { color: "green", icon: "Calendar" },
      }),
  },

  // =============================================================================
  // MODULE PRESETS - NEXTIER Product Modules
  // =============================================================================
  modules: {
    aiConsulting: () =>
      createGroup("module-ai-consulting", "AI Consulting", "module", {
        description: "Templates for AI consulting services and partnerships",
        tonality: TONALITY_PRESETS.professional,
        metadata: {
          color: "violet",
          icon: "Brain",
          module: "ai-consulting",
          tags: ["ai", "consulting", "technology"],
        },
      }),
    platformWhiteLabel: () =>
      createGroup("module-white-label", "Platform White Label", "module", {
        description: "Templates for white-label platform offerings",
        tonality: TONALITY_PRESETS.professional,
        metadata: {
          color: "slate",
          icon: "Layers",
          module: "white-label",
          tags: ["white-label", "platform", "saas"],
        },
      }),
    businessExits: () =>
      createGroup("module-business-exits", "Business Exits", "module", {
        description: "Templates for business exit/M&A conversations",
        tonality: TONALITY_PRESETS.balanced,
        metadata: {
          color: "emerald",
          icon: "TrendingUp",
          module: "business-exits",
          tags: ["exits", "m&a", "valuation"],
        },
      }),
    capitalConnect: () =>
      createGroup("module-capital-connect", "Capital Connect", "module", {
        description: "Templates for capital raising and investor connections",
        tonality: TONALITY_PRESETS.professional,
        metadata: {
          color: "amber",
          icon: "DollarSign",
          module: "capital-connect",
          tags: ["capital", "investors", "funding"],
        },
      }),
    foundationalDataverse: () =>
      createGroup("module-dataverse", "Foundational Dataverse", "module", {
        description: "Templates for data infrastructure and enrichment services",
        tonality: TONALITY_PRESETS.balanced,
        metadata: {
          color: "cyan",
          icon: "Database",
          module: "dataverse",
          tags: ["data", "enrichment", "infrastructure"],
        },
      }),
    terminals: () =>
      createGroup("module-terminals", "Terminals", "module", {
        description: "Templates for deal terminal and execution platform",
        tonality: TONALITY_PRESETS.casual,
        metadata: {
          color: "blue",
          icon: "Terminal",
          module: "terminals",
          tags: ["terminal", "execution", "deals"],
        },
      }),
    blueprints: () =>
      createGroup("module-blueprints", "Blueprints", "module", {
        description: "Templates for system blueprints and architecture",
        tonality: TONALITY_PRESETS.professional,
        metadata: {
          color: "indigo",
          icon: "FileText",
          module: "blueprints",
          tags: ["blueprints", "architecture", "systems"],
        },
      }),
    systemMapping: () =>
      createGroup("module-system-mapping", "System Mapping", "module", {
        description: "Templates for system mapping and integration services",
        tonality: TONALITY_PRESETS.balanced,
        metadata: {
          color: "purple",
          icon: "Map",
          module: "system-mapping",
          tags: ["mapping", "integration", "systems"],
        },
      }),
  },
};

// =============================================================================
// MODULE DEFINITIONS
// =============================================================================

export const NEXTIER_MODULES = {
  "ai-consulting": {
    id: "ai-consulting",
    name: "AI Consulting",
    description: "AI implementation, strategy, and consulting services",
    icon: "Brain",
    color: "violet",
  },
  "white-label": {
    id: "white-label",
    name: "Platform White Label",
    description: "White-label the NEXTIER platform for your clients",
    icon: "Layers",
    color: "slate",
  },
  "business-exits": {
    id: "business-exits",
    name: "Business Exits",
    description: "M&A advisory, valuations, and exit planning",
    icon: "TrendingUp",
    color: "emerald",
  },
  "capital-connect": {
    id: "capital-connect",
    name: "Capital Connect",
    description: "Investor matching and capital raising services",
    icon: "DollarSign",
    color: "amber",
  },
  dataverse: {
    id: "dataverse",
    name: "Foundational Dataverse",
    description: "Data infrastructure, enrichment, and intelligence",
    icon: "Database",
    color: "cyan",
  },
  terminals: {
    id: "terminals",
    name: "Terminals",
    description: "Deal execution terminals and revenue engines",
    icon: "Terminal",
    color: "blue",
  },
  blueprints: {
    id: "blueprints",
    name: "Blueprints",
    description: "System architecture and implementation blueprints",
    icon: "FileText",
    color: "indigo",
  },
  "system-mapping": {
    id: "system-mapping",
    name: "System Mapping",
    description: "Integration mapping and workflow automation",
    icon: "Map",
    color: "purple",
  },
} as const;
