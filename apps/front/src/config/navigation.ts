import {
  Rocket,
  LayoutDashboard,
  Target,
  Send,
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
  Workflow,
  BarChart3,
  TrendingUp,
  Calendar,
  Home,
  FileText,
  Settings,
  Zap,
  Upload,
  MessageCircle,
  Briefcase,
  GitBranch,
  Activity,
  Layers,
  UserCheck,
  Radio,
  BrainCircuit,
  PhoneCall,
  Headphones,
  User,
  Clock,
  type LucideIcon,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════
// NAVIGATION CONFIGURATION - NEXTIER PLATFORM
// ═══════════════════════════════════════════════════════════════════════════
//
// 9 GROUPS - 45 VERIFIED ROUTES (ALL PAGES EXIST)
// ┌─────────────────────────────────────────────────────────────────────────┐
// │  HOME        → Dashboard, Command Center, Getting Started              │
// │  DATA        → Import, B2B Search, Properties, Skip Trace, Data Hub    │
// │  AUDIENCE    → Leads, Companies, Sectors, Territories, Pipelines, Deals│
// │  OUTREACH    → Campaign Builder, Campaigns, Quick Send, Pre-Queue...   │
// │  AI WORKERS  → Digital Workers, AI SDR, Automation Rules, Prompts...   │
// │  INBOUND     → Inbox, Workflows, Templates                             │
// │  VOICE       → Call Center, Power Dialers, Appointments, Calendar      │
// │  ANALYTICS   → Overview, SMS Analytics, Pipeline Heatmap, Reports...   │
// │  SETTINGS    → Settings, Account, Users, Integrations, SignalHouse...  │
// └─────────────────────────────────────────────────────────────────────────┘
//
// EVERY ROUTE VERIFIED AGAINST apps/front/src/app/t/[team]/**/page.tsx

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
// MAIN NAVIGATION CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export const navigationGroups: NavGroup[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // HOME - Dashboard & onboarding
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "home",
    label: "HOME",
    icon: Home,
    items: [
      {
        label: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
        description: "Pipeline overview & KPIs",
      },
      {
        label: "Command Center",
        href: "/command-center",
        icon: Activity,
        description: "Unified control panel",
      },
      {
        label: "Getting Started",
        href: "/getting-started",
        icon: Rocket,
        hideAfterOnboarding: true,
        description: "Setup guide",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA - Lead acquisition & enrichment
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "data",
    label: "DATA",
    icon: Database,
    items: [
      {
        label: "Import",
        href: "/import",
        icon: Upload,
        description: "Upload CSV files",
      },
      {
        label: "B2B Search",
        href: "/b2b-search",
        icon: Building2,
        description: "Search 70M+ businesses",
      },
      {
        label: "Properties",
        href: "/properties",
        icon: MapPin,
        description: "Real estate data",
      },
      {
        label: "Skip Trace",
        href: "/skip-trace",
        icon: UserCheck,
        description: "Find phone numbers",
      },
      {
        label: "Data Hub",
        href: "/data-hub",
        icon: Database,
        description: "Data management",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIENCE - Lead & company organization
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "audience",
    label: "AUDIENCE",
    icon: Users,
    items: [
      {
        label: "Leads",
        href: "/leads",
        icon: Users,
        description: "All contacts",
      },
      {
        label: "Companies",
        href: "/companies",
        icon: Building2,
        description: "Organizations",
      },
      {
        label: "Sectors",
        href: "/sectors",
        icon: Layers,
        description: "Industry segments",
      },
      {
        label: "Territories",
        href: "/territories",
        icon: MapPin,
        description: "Geographic regions",
      },
      {
        label: "Pipelines",
        href: "/pipelines",
        icon: GitBranch,
        description: "Deal stages",
      },
      {
        label: "Deals",
        href: "/deals",
        icon: Briefcase,
        description: "Active deals",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // OUTREACH - Campaigns & messaging (THE MONEY MAKER)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "outreach",
    label: "OUTREACH",
    icon: Send,
    items: [
      {
        label: "Campaign Builder",
        href: "/campaign-builder",
        icon: Zap,
        badge: "START",
        badgeVariant: "destructive",
        description: "Build & launch campaigns",
      },
      {
        label: "Campaigns",
        href: "/campaigns",
        icon: Target,
        description: "All campaigns",
      },
      {
        label: "Quick Send",
        href: "/quick-send",
        icon: Send,
        description: "One-off messages",
      },
      {
        label: "Pre-Queue",
        href: "/pre-queue",
        icon: Clock,
        description: "Review before send",
      },
      {
        label: "Sequences",
        href: "/sequences",
        icon: GitBranch,
        description: "Multi-step campaigns",
      },
      {
        label: "SMS Queue",
        href: "/sms/queue",
        icon: MessageCircle,
        description: "Active message queue",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AI WORKERS - Digital assistants & automation
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "ai",
    label: "AI WORKERS",
    icon: Bot,
    items: [
      {
        label: "Digital Workers",
        href: "/digital-workers",
        icon: Bot,
        description: "GIANNA, CATHY, SABRINA",
      },
      {
        label: "AI SDR",
        href: "/ai-sdr",
        icon: Sparkles,
        description: "Automated outreach",
      },
      {
        label: "Automation Rules",
        href: "/automation-rules",
        icon: Workflow,
        description: "Trigger rules",
      },
      {
        label: "Prompts",
        href: "/prompts",
        icon: MessageSquare,
        description: "AI prompt library",
      },
      {
        label: "AI Training",
        href: "/ai-training",
        icon: BrainCircuit,
        description: "Train the AI",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INBOUND - Response handling
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "inbound",
    label: "INBOUND",
    icon: Inbox,
    items: [
      {
        label: "Inbox",
        href: "/inbox",
        icon: Inbox,
        badge: "HOT",
        badgeVariant: "destructive",
        description: "All responses",
      },
      {
        label: "Workflows",
        href: "/workflows",
        icon: Workflow,
        description: "Automation flows",
      },
      {
        label: "Templates",
        href: "/message-templates",
        icon: FileText,
        description: "Message templates",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VOICE - Phone calls & appointments
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "voice",
    label: "VOICE",
    icon: Phone,
    items: [
      {
        label: "Call Center",
        href: "/call-center",
        icon: Headphones,
        description: "Phone dashboard",
      },
      {
        label: "Power Dialers",
        href: "/power-dialers",
        icon: PhoneCall,
        description: "Auto-dial sessions",
      },
      {
        label: "Appointments",
        href: "/appointments",
        icon: Calendar,
        description: "Scheduled calls",
      },
      {
        label: "Calendar",
        href: "/calendar",
        icon: Calendar,
        description: "Schedule view",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYTICS - Reporting & insights
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "analytics",
    label: "ANALYTICS",
    icon: BarChart3,
    items: [
      {
        label: "Overview",
        href: "/analytics",
        icon: BarChart3,
        description: "Analytics dashboard",
      },
      {
        label: "SMS Analytics",
        href: "/analytics/sms",
        icon: MessageCircle,
        description: "Message metrics",
      },
      {
        label: "Pipeline Heatmap",
        href: "/analytics/pipeline-heatmap",
        icon: TrendingUp,
        description: "Deal flow visualization",
      },
      {
        label: "Reports",
        href: "/reports",
        icon: FileText,
        description: "Custom reports",
      },
      {
        label: "API Monitor",
        href: "/api-monitor",
        icon: Activity,
        description: "System health",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTINGS - Configuration
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "settings",
    label: "SETTINGS",
    icon: Settings,
    items: [
      {
        label: "Settings",
        href: "/settings",
        icon: Settings,
        description: "All settings",
      },
      {
        label: "Account",
        href: "/settings/account",
        icon: User,
        description: "Your profile",
      },
      {
        label: "Users",
        href: "/settings/users",
        icon: Users,
        description: "Team members",
      },
      {
        label: "Integrations",
        href: "/integrations",
        icon: Zap,
        description: "Connected apps",
      },
      {
        label: "SignalHouse",
        href: "/settings/signalhouse",
        icon: Radio,
        description: "SMS provider",
      },
      {
        label: "SMS Config",
        href: "/settings/sms",
        icon: MessageCircle,
        description: "SMS settings",
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
        href: "/inbox",
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
        href: "/campaign-builder",
        icon: Zap,
        description: "Upload → Template → Send (3 steps)",
      },
      {
        label: "All Campaigns",
        href: "/campaigns",
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
        href: "/import",
        icon: Upload,
        description: "Upload CSV in seconds",
      },
      {
        label: "All Leads",
        href: "/leads",
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
        href: "/power-dialers",
        icon: Phone,
        description: "One-click calling",
      },
      {
        label: "Call Queue",
        href: "/call-center",
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
