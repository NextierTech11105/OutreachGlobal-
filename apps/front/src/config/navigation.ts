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
  type LucideIcon,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════
// NAVIGATION CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
// Single source of truth for all navigation items
// Organized by USER WORKFLOW, not feature type

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
// MAIN NAVIGATION GROUPS - Organized by Workflow
// ═══════════════════════════════════════════════════════════════════════════

export const navigationGroups: NavGroup[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // START HERE - Onboarding checklist (hides after completion)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "start-here",
    label: "START HERE",
    icon: Rocket,
    hideAfterOnboarding: true,
    items: [
      {
        label: "Getting Started",
        href: "/admin/getting-started",
        icon: Rocket,
        badge: "New",
        badgeVariant: "default",
        hideAfterOnboarding: true,
        description: "Complete your setup checklist",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DAILY WORK - What users open every day
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "daily",
    label: "DAILY",
    icon: LayoutDashboard,
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
        description: "Overview of all activity",
      },
      {
        label: "Inbox",
        href: "/admin/inbox",
        icon: Inbox,
        description: "Unified message center",
      },
      {
        label: "Appointments",
        href: "/admin/appointments",
        icon: Calendar,
        description: "Meeting tracking",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PROSPECTING - Finding new leads and data
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "prospecting",
    label: "PROSPECTING",
    icon: Search,
    items: [
      {
        label: "Search",
        href: "/admin/search",
        icon: Search,
        description: "Find contacts and companies",
      },
      {
        label: "B2B Search",
        href: "/admin/b2b-search",
        icon: Building2,
        description: "Find business prospects",
      },
      {
        label: "Data Lakes",
        href: "/admin/sectors",
        icon: Database,
        description: "Industry-specific data pools",
      },
      {
        label: "Import",
        href: "/admin/import",
        icon: Upload,
        description: "Import leads from files",
      },
      {
        label: "Territories",
        href: "/admin/territories",
        icon: MapPin,
        description: "Geographic assignments",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // LEADS & PIPELINE - Managing contacts and deals
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "pipeline",
    label: "PIPELINE",
    icon: GitBranch,
    items: [
      {
        label: "Leads",
        href: "/admin/leads",
        icon: Users,
        description: "All contacts and prospects",
      },
      {
        label: "Companies",
        href: "/admin/companies",
        icon: Building2,
        description: "Organization records",
      },
      {
        label: "Deals",
        href: "/admin/deals",
        icon: Briefcase,
        description: "Active opportunities",
      },
      {
        label: "Pipelines",
        href: "/admin/pipelines",
        icon: GitBranch,
        description: "Sales stage management",
      },
      {
        label: "Properties",
        href: "/admin/properties",
        icon: Home,
        description: "Real estate leads",
      },
      {
        label: "Valuation Queue",
        href: "/admin/valuation-queue",
        icon: TrendingUp,
        description: "Property valuations",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // OUTREACH - All communication channels
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "outreach",
    label: "OUTREACH",
    icon: Send,
    items: [
      {
        label: "Campaigns",
        href: "/admin/campaigns",
        icon: Target,
        description: "Manage outreach campaigns",
      },
      {
        label: "Initial Outreach",
        href: "/admin/initial-outreach",
        icon: Send,
        description: "First-touch messages",
      },
      {
        label: "Instant Outreach",
        href: "/admin/instant-outreach",
        icon: Zap,
        description: "Quick one-off messages",
      },
      {
        label: "Nudge Engine",
        href: "/admin/nudger",
        icon: Bell,
        description: "Follow-up automation",
      },
      {
        label: "Power Dialer",
        href: "/admin/power-dialer",
        icon: Phone,
        description: "Outbound calling",
      },
      {
        label: "SMS Center",
        href: "/admin/sms/command-center",
        icon: MessageCircle,
        description: "SMS messaging hub",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // AI & AUTOMATION - Intelligent features
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "ai",
    label: "AI",
    icon: Sparkles,
    items: [
      {
        label: "AI SDR",
        href: "/admin/ai-sdr",
        icon: Bot,
        description: "Autonomous sales rep",
      },
      {
        label: "Digital Workers",
        href: "/admin/digital-workers",
        icon: Users,
        description: "AI worker management",
      },
      {
        label: "Workflows",
        href: "/admin/workflows",
        icon: Workflow,
        description: "Automation sequences",
      },
      {
        label: "Automation Rules",
        href: "/admin/automation-rules",
        icon: GitBranch,
        description: "Trigger-based actions",
      },
      {
        label: "Message Templates",
        href: "/admin/message-templates",
        icon: FileText,
        description: "Reusable content",
      },
      {
        label: "Prompts",
        href: "/admin/prompts",
        icon: MessageSquare,
        description: "AI prompt templates",
      },
      {
        label: "SDR Avatars",
        href: "/admin/ai-sdr-avatars",
        icon: Palette,
        description: "AI personality profiles",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ANALYTICS - Results and reporting
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "analytics",
    label: "ANALYTICS",
    icon: BarChart3,
    items: [
      {
        label: "Overview",
        href: "/admin/analytics",
        icon: BarChart3,
        description: "Performance metrics",
      },
      {
        label: "Reports",
        href: "/admin/reports",
        icon: TrendingUp,
        description: "Custom report builder",
      },
      {
        label: "SMS Analytics",
        href: "/admin/analytics/sms",
        icon: MessageCircle,
        description: "SMS performance",
      },
      {
        label: "Pipeline Heatmap",
        href: "/admin/analytics/pipeline-heatmap",
        icon: Activity,
        description: "Pipeline visualization",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ADMIN - Platform configuration (admin/owner only)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "admin",
    label: "ADMIN",
    icon: Settings,
    minRole: "admin",
    items: [
      {
        label: "Settings",
        href: "/admin/settings",
        icon: Settings,
        minRole: "admin",
        description: "Team configuration",
      },
      {
        label: "Integrations",
        href: "/admin/integrations",
        icon: Zap,
        minRole: "admin",
        description: "Connect external services",
      },
      {
        label: "Users",
        href: "/admin/users",
        icon: Users,
        minRole: "admin",
        description: "Team members",
      },
      {
        label: "Access Control",
        href: "/admin/access",
        icon: Shield,
        minRole: "admin",
        description: "Permissions & roles",
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
        description: "API health & usage",
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
