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
  FolderOpen,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════
// NAVIGATION CONFIGURATION - NEXTIER PLATFORM (STREAMLINED)
// ═══════════════════════════════════════════════════════════════════════════
//
// 6 GROUPS - WORKFLOW-ALIGNED (DECLUTTERED)
// ┌─────────────────────────────────────────────────────────────────────────┐
// │  SECTORS   → Data Pipeline Hub (Import, Search, Leads, Skip Trace)     │
// │  CONTENT   → Create & Deliver (Valuation, Queue, Saved, Templates)     │
// │  CAMPAIGNS → Execute (Builder, Campaigns, AI Workers, Sequences)       │
// │  INBOX     → Respond (Messages, Call Queue, Appointments)              │
// │  ANALYTICS → Measure (Overview, SMS, Pipeline, Reports)                │
// │  SETTINGS  → Configure (Account, Integrations, SignalHouse)            │
// └─────────────────────────────────────────────────────────────────────────┘
//
// FLOW: SECTORS → CONTENT → CAMPAIGNS → INBOX → ANALYTICS

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
  // SECTORS - Data Pipeline Hub (Upload → Search → Enrich → Ready)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "sectors",
    label: "SECTORS",
    icon: Layers,
    items: [
      {
        label: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
        description: "Pipeline overview & KPIs",
      },
      {
        label: "Sectors",
        href: "/sectors",
        icon: Layers,
        badge: "HUB",
        badgeVariant: "default",
        description: "Data pipeline hub",
      },
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
        label: "Skip Trace",
        href: "/skip-trace",
        icon: UserCheck,
        description: "$0.02/lead - Tracerfy",
      },
      {
        label: "Lead Lab",
        href: "/lead-lab",
        icon: BarChart3,
        description: "Contactability scoring",
      },
      {
        label: "Leads",
        href: "/leads",
        icon: Users,
        description: "All contacts",
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
  // CONTENT - Create & Deliver (Valuation, Queue, Saved, Templates)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "content",
    label: "CONTENT",
    icon: FolderOpen,
    items: [
      {
        label: "Content Hub",
        href: "/content",
        icon: FolderOpen,
        badge: "NEW",
        badgeVariant: "default",
        description: "Create → Queue → Saved → Templates",
      },
      {
        label: "Valuation Tool",
        href: "/valuation",
        icon: Home,
        description: "Property valuation creator",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMPAIGNS - Execute (Builder, Campaigns, AI, Sequences)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "campaigns",
    label: "CAMPAIGNS",
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
        label: "Digital Workers",
        href: "/digital-workers",
        icon: Bot,
        description: "GIANNA, CATHY, SABRINA",
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
  // INBOX - Respond (Messages, Call Queue, Appointments)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "inbox",
    label: "INBOX",
    icon: Inbox,
    items: [
      {
        label: "Messages",
        href: "/inbox",
        icon: Inbox,
        badge: "HOT",
        badgeVariant: "destructive",
        description: "All responses",
      },
      {
        label: "Call Queue",
        href: "/call-center",
        icon: PhoneCall,
        description: "Human override calls",
      },
      {
        label: "Power Dialer",
        href: "/power-dialers",
        icon: Phone,
        description: "Auto-dial sessions",
      },
      {
        label: "Appointments",
        href: "/appointments",
        icon: Calendar,
        description: "Scheduled calls",
      },
      {
        label: "Workflows",
        href: "/workflows",
        icon: Workflow,
        description: "Automation flows",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYTICS - Measure (Overview, SMS, Pipeline, Reports)
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
  // SETTINGS - Configure (Account, Integrations, SignalHouse)
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
        label: "Diagnostics",
        href: "/diagnostics",
        icon: AlertTriangle,
        badge: "DEBUG",
        badgeVariant: "destructive",
        description: "System health & credentials",
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
