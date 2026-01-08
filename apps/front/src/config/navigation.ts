import {
  Rocket,
  LayoutDashboard,
  Target,
  Send,
  Bell,
  Phone,
  Inbox,
  Database,
  Building2,
  Users,
  MapPin,
  Search,
  Sparkles,
  Bot,
  MessageSquare,
  Palette,
  Workflow,
  BarChart3,
  TrendingUp,
  Calendar,
  Home,
  FileText,
  Settings,
  Shield,
  Zap,
  Upload,
  MessageCircle,
  Briefcase,
  GitBranch,
  Activity,
  ServerCog,
  Package,
  Layers,
  UserCheck,
  Radio,
  BrainCircuit,
  PhoneCall,
  Headphones,
  Handshake,
  Trophy,
  type LucideIcon,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════
// NAVIGATION CONFIGURATION - NEXTIER FOUNDATIONAL FLOW
// ═══════════════════════════════════════════════════════════════════════════
//
// THE 10-STAGE PIPELINE (in order):
// ┌─────────────────────────────────────────────────────────────────────────┐
// │  1. UNIVERSE      → USBizData, CSV Import, Property Data               │
// │  2. AUDIENCE      → ICP Definition, Sectors, Territories               │
// │  3. CONTACTABILITY → Skip Trace, Apollo Enrich, Verify                 │
// │  4. OUTBOUND      → SMS Center, Campaigns, Pre-Queue                   │
// │  5. INBOUND       → Inbox, AI Classification, Response Handling        │
// │  6. INTELLIGENCE  → Perplexity Research, NEVA Deep Dive               │
// │  7. CALL QUEUE    → Hot Leads Ready for Dial                          │
// │  8. GUIDED CALL   → Power Dialer, Call Scripts, Live Coaching         │
// │  9. STRATEGY      → Appointments, Meeting Prep, Discovery Calls       │
// │ 10. CONVERSION    → Deals, Proposals, Close                           │
// └─────────────────────────────────────────────────────────────────────────┘
//
// This is the MACHINE. The sidebar IS the conveyor belt.

export type NavItemRole = "admin" | "member" | "viewer";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  /** Minimum role required to see this item */
  minRole?: NavItemRole;
  /** Whether this item should be hidden after onboarding completion */
  hideAfterOnboarding?: boolean;
  /** Description for tooltips */
  description?: string;
}

export interface NavGroup {
  id: string;
  label: string;
  icon?: LucideIcon;
  items: NavItem[];
  /** Whether this group should collapse when all items are hidden */
  collapsible?: boolean;
  /** Minimum role required to see this group */
  minRole?: NavItemRole;
  /** Whether this group should be hidden after onboarding completion */
  hideAfterOnboarding?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// NAVIGATION CONFIGURATION - STREAMLINED SMS MONETIZATION FLOW
// ═══════════════════════════════════════════════════════════════════════════
//
// THE CORE SMS MACHINE (synergistic flow):
// ┌─────────────────────────────────────────────────────────────────────────┐
// │  COMMAND        → Dashboard + Inbox (always visible)                   │
// │  PROSPECTING    → B2B Search, Properties, Import, Territories          │
// │  PIPELINE       → Leads, Companies, Deals, Pipelines                   │
// │  OUTREACH       → Campaign Builder, SMS Center, Campaigns              │
// │  INBOUND        → Inbox, Digital Workers, Workflows                    │
// │  AI             → Research, NEVA, Power Dialer                         │
// │  ANALYTICS      → Reports, SMS Analytics, Pipeline Heatmap             │
// │  ADMIN          → Settings, Integrations, Users                        │
// └─────────────────────────────────────────────────────────────────────────┘
//
// Week 1-2: SMS BLITZ → Get 15-min meetings booked
// Week 3-4: AI LISTENING → Classify, prioritize, copilot inbound
// Month 2+: COMPOUNDING → Re-engage, nurture, close

export const navigationGroups: NavGroup[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // COMMAND CENTER - Always visible, the control tower
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "command",
    label: "COMMAND",
    icon: LayoutDashboard,
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
        description: "Pipeline overview & KPIs",
      },
      {
        label: "Inbox",
        href: "/admin/inbound-processing",
        icon: Inbox,
        badge: "HOT",
        badgeVariant: "destructive",
        description: "AI-classified inbound responses",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROSPECTING - Get fresh leads from data sources
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "prospecting",
    label: "PROSPECTING",
    icon: Search,
    items: [
      {
        label: "B2B Search",
        href: "/admin/b2b",
        icon: Building2,
        description: "Search 70M+ USBizData businesses",
      },
      {
        label: "Import CSV",
        href: "/admin/data/import",
        icon: Upload,
        description: "Upload USBizData lists",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PIPELINE - Manage your leads and companies
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "pipeline",
    label: "PIPELINE",
    icon: GitBranch,
    items: [
      {
        label: "Companies",
        href: "/admin/companies",
        icon: Building2,
        description: "Organization records",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // OUTREACH - SMS Campaigns (THE MONEY MAKER)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "outreach",
    label: "OUTREACH",
    icon: Send,
    items: [
      {
        label: "⚡ Campaign Builder",
        href: "/admin/campaign-builder",
        icon: Zap,
        badge: "START HERE",
        badgeVariant: "destructive",
        description: "CSV → Skip Trace → SMS BLAST",
      },
      {
        label: "AI SDR",
        href: "/admin/ai-sdr",
        icon: Bot,
        description: "Automated outreach campaigns",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INBOUND - AI-classified responses (THE COMPOUNDING ENGINE)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "inbound",
    label: "INBOUND",
    icon: Inbox,
    items: [
      {
        label: "Inbound Processing",
        href: "/admin/inbound-processing",
        icon: Inbox,
        description: "Inbound SMS/email responses",
      },
      {
        label: "Digital Workers",
        href: "/admin/digital-workers",
        icon: Bot,
        description: "GIANNA, CATHY, SABRINA, NEVA",
      },
      {
        label: "Workflows",
        href: "/admin/workflows",
        icon: Workflow,
        description: "Automation rules & triggers",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AI - Deep research and intelligence
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "ai",
    label: "AI",
    icon: BrainCircuit,
    items: [
      {
        label: "Lucy AI",
        href: "/admin/lucy",
        icon: BrainCircuit,
        description: "AI research assistant",
      },
      {
        label: "Prompt Library",
        href: "/admin/prompt-library",
        icon: MessageSquare,
        description: "AI prompt templates",
      },
      {
        label: "Message Templates",
        href: "/admin/message-templates",
        icon: FileText,
        description: "SMS & call scripts",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYTICS - Track everything
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "analytics",
    label: "ANALYTICS",
    icon: BarChart3,
    items: [
      {
        label: "API Monitor",
        href: "/admin/api-monitor",
        icon: Activity,
        description: "System health & usage",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN - Platform configuration
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "admin",
    label: "ADMIN",
    icon: Settings,
    minRole: "admin",
    items: [
      {
        label: "System",
        href: "/admin/system",
        icon: Settings,
        minRole: "admin",
        description: "System configuration",
      },
      {
        label: "Integrations",
        href: "/admin/integrations/api",
        icon: Zap,
        minRole: "admin",
        description: "API connections",
      },
      {
        label: "Users",
        href: "/admin/users",
        icon: Users,
        minRole: "admin",
        description: "Team members & roles",
      },
      {
        label: "Batch Jobs",
        href: "/admin/batch-jobs",
        icon: ServerCog,
        minRole: "admin",
        description: "Background tasks",
      },
      {
        label: "API Monitor",
        href: "/admin/api-monitor",
        icon: Activity,
        minRole: "admin",
        description: "Health & usage",
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Role hierarchy for permission checks
 */
const roleHierarchy: Record<NavItemRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
};

/**
 * Check if user has sufficient role for an item
 */
export function hasRoleAccess(
  userRole: NavItemRole | undefined,
  minRole: NavItemRole | undefined,
): boolean {
  if (!minRole) return true;
  if (!userRole) return false;
  return roleHierarchy[userRole] >= roleHierarchy[minRole];
}

/**
 * Filter navigation groups based on user role and onboarding status
 */
export function getFilteredNavigation(
  userRole: NavItemRole | undefined,
  isOnboardingComplete: boolean = false,
): NavGroup[] {
  return navigationGroups
    .filter((group) => {
      // Check role access for group
      if (!hasRoleAccess(userRole, group.minRole)) return false;
      // Hide onboarding groups after completion
      if (group.hideAfterOnboarding && isOnboardingComplete) return false;
      return true;
    })
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        // Check role access for item
        if (!hasRoleAccess(userRole, item.minRole)) return false;
        // Hide onboarding items after completion
        if (item.hideAfterOnboarding && isOnboardingComplete) return false;
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0); // Remove empty groups
}

/**
 * Get navigation item by href
 */
export function getNavItemByHref(href: string): NavItem | undefined {
  for (const group of navigationGroups) {
    const item = group.items.find((i) => i.href === href);
    if (item) return item;
  }
  return undefined;
}

/**
 * Get navigation group by id
 */
export function getNavGroupById(id: string): NavGroup | undefined {
  return navigationGroups.find((g) => g.id === id);
}

/**
 * Map team role string to NavItemRole
 */
export function mapTeamRoleToNavRole(
  teamRole: string | undefined,
): NavItemRole {
  switch (teamRole?.toLowerCase()) {
    case "owner":
    case "admin":
      return "admin";
    case "member":
      return "member";
    default:
      return "viewer";
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SIMPLE MODE NAVIGATION - SmarterContact-Style
// ═══════════════════════════════════════════════════════════════════════════
//
// For users who want SmarterContact simplicity:
// Only 4 core sections: Inbox, Campaigns, Contacts, Dialer
// Full Nextier power runs underneath, but hidden complexity
//

export const simpleModeNavigation: NavGroup[] = [
  {
    id: "simple-inbox",
    label: "INBOX",
    icon: Inbox,
    items: [
      {
        label: "Messages",
        href: "/admin/inbox",
        icon: Inbox,
        badge: "HOT",
        badgeVariant: "destructive",
        description: "All SMS, Email, Voice in one place",
      },
    ],
  },
  {
    id: "simple-campaigns",
    label: "CAMPAIGNS",
    icon: Send,
    items: [
      {
        label: "Quick Send",
        href: "/admin/campaign-builder",
        icon: Zap,
        description: "Upload → Template → Send (3 steps)",
      },
      {
        label: "All Campaigns",
        href: "/admin/campaigns",
        icon: Target,
        description: "View active campaigns",
      },
    ],
  },
  {
    id: "simple-contacts",
    label: "CONTACTS",
    icon: Users,
    items: [
      {
        label: "Import List",
        href: "/admin/import",
        icon: Upload,
        description: "Upload CSV in seconds",
      },
      {
        label: "All Leads",
        href: "/admin/leads",
        icon: Users,
        description: "Your contact database",
      },
    ],
  },
  {
    id: "simple-dialer",
    label: "DIALER",
    icon: Phone,
    items: [
      {
        label: "Power Dialer",
        href: "/admin/power-dialer",
        icon: Phone,
        description: "One-click calling",
      },
      {
        label: "Call Queue",
        href: "/admin/call-queue",
        icon: PhoneCall,
        description: "Hot leads ready to dial",
      },
    ],
  },
];

/**
 * Get navigation based on mode preference
 */
export function getNavigationByMode(
  mode: "full" | "simple",
  userRole?: NavItemRole,
  isOnboardingComplete: boolean = false,
): NavGroup[] {
  if (mode === "simple") {
    return simpleModeNavigation;
  }
  return getFilteredNavigation(userRole, isOnboardingComplete);
}
