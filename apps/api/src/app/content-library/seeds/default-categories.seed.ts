import { Injectable } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types/drizzle-client.type";
import {
  contentCategoriesTable,
  contentItemsTable,
} from "@/database/schema-alias";
import { generateUlid } from "@/database/columns/ulid";
import { eq } from "drizzle-orm";

interface CategorySeedData {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  children?: CategorySeedData[];
}

const SYSTEM_CATEGORIES: CategorySeedData[] = [
  // Email & Messaging
  {
    name: "Emails",
    slug: "emails",
    icon: "mail",
    color: "#3B82F6",
    description: "Email templates and sequences for outreach campaigns",
  },
  {
    name: "SMS Templates",
    slug: "sms-templates",
    icon: "message-square",
    color: "#10B981",
    description: "SMS message templates for text-based outreach",
  },

  // Persona & Targeting
  {
    name: "Buyer Persona",
    slug: "buyer-persona",
    icon: "user-search",
    color: "#8B5CF6",
    description: "Build the perfect buyer persona with these prompts",
  },
  {
    name: "Company Persona",
    slug: "company-persona",
    icon: "building",
    color: "#6366F1",
    description:
      "Prompts for creating company personas and finding product/market fit",
  },

  // Content Creation
  {
    name: "General Content",
    slug: "content",
    icon: "file-text",
    color: "#F59E0B",
    description: "General prompts for creating content",
  },
  {
    name: "Lead Magnets",
    slug: "lead-magnets",
    icon: "magnet",
    color: "#EF4444",
    description: "Prompts for creating compelling lead magnets",
  },
  {
    name: "Refresh/Rewrite",
    slug: "refresh",
    icon: "refresh-cw",
    color: "#14B8A6",
    description: "Prompts to refresh, rewrite current ads, blog posts and more",
  },

  // Buyer Journey
  {
    name: "Buyer Journey",
    slug: "buyer-journey",
    icon: "route",
    color: "#EC4899",
    description: "Prompts for creating content across the buyer journey",
    children: [
      {
        name: "Funnel",
        slug: "funnel",
        icon: "filter",
        description: "Content for each stage of your marketing funnel",
      },
      {
        name: "Touchpoints",
        slug: "touchpoints",
        icon: "target",
        description: "Content for various buyer touchpoints",
      },
    ],
  },

  // Social Media Platforms
  {
    name: "Social Media",
    slug: "social",
    icon: "share-2",
    color: "#0EA5E9",
    description: "Content creation for social media platforms",
    children: [
      {
        name: "Facebook",
        slug: "facebook",
        icon: "facebook",
        color: "#1877F2",
        description: "Creating and posting content to Facebook",
      },
      {
        name: "LinkedIn",
        slug: "linkedin",
        icon: "linkedin",
        color: "#0A66C2",
        description: "Creating and posting content to LinkedIn",
      },
      {
        name: "Instagram",
        slug: "instagram",
        icon: "instagram",
        color: "#E4405F",
        description: "Creating and posting content to Instagram",
      },
      {
        name: "TikTok",
        slug: "tiktok",
        icon: "video",
        color: "#000000",
        description: "Creating and posting content to TikTok",
      },
      {
        name: "YouTube",
        slug: "youtube",
        icon: "youtube",
        color: "#FF0000",
        description: "Create and post content to YouTube",
      },
    ],
  },

  // Technical
  {
    name: "Code Scripts",
    slug: "code-scripts",
    icon: "code",
    color: "#64748B",
    description: "Code scripts to automate processes within the CRM",
  },
  {
    name: "SQL Queries",
    slug: "sql-queries",
    icon: "database",
    color: "#0D9488",
    description: "SQL queries for generating lists, reports, and to-do's",
  },

  // Reports
  {
    name: "Reports & Lists",
    slug: "reports-lists",
    icon: "clipboard-list",
    color: "#7C3AED",
    description: "Prompts for generating reports based on CRM data",
  },

  // Business
  {
    name: "Business Growth",
    slug: "business-growth",
    icon: "trending-up",
    color: "#22C55E",
    description: "Prompts around how to grow your business",
  },
  {
    name: "Product Comparison",
    slug: "product-comparison",
    icon: "git-compare",
    color: "#F97316",
    description: "Identify strong points of products vs competitors",
  },
  {
    name: "Website Content",
    slug: "website-content",
    icon: "globe",
    color: "#06B6D4",
    description: "Content generation for industry pages and website",
  },

  // Images
  {
    name: "Images",
    slug: "images",
    icon: "image",
    color: "#A855F7",
    description: "Image prompts and generation templates",
  },

  // AI & MCP
  {
    name: "AI Prompts",
    slug: "ai-prompts",
    icon: "sparkles",
    color: "#FBBF24",
    description: "Prompts optimized for AI assistants",
    children: [
      {
        name: "Claude Prompts",
        slug: "claude-prompts",
        icon: "brain",
        description: "Prompts specifically designed for Claude AI",
      },
      {
        name: "MCP Server Docs",
        slug: "mcp-docs",
        icon: "server",
        description: "Documentation for MCP server integrations",
      },
    ],
  },

  // Voice & Calling
  {
    name: "Voice Scripts",
    slug: "voice-scripts",
    icon: "phone-call",
    color: "#84CC16",
    description: "Scripts for voice calls and phone outreach",
    children: [
      {
        name: "Cold Calling",
        slug: "cold-calling",
        icon: "phone-outgoing",
        description: "Scripts for cold calling prospects",
      },
      {
        name: "Follow-up Calls",
        slug: "follow-up-calls",
        icon: "phone-incoming",
        description: "Scripts for follow-up conversations",
      },
      {
        name: "Voicemail",
        slug: "voicemail",
        icon: "voicemail",
        description: "Effective voicemail scripts",
      },
    ],
  },

  // Real Estate Specific
  {
    name: "Real Estate",
    slug: "real-estate",
    icon: "home",
    color: "#DC2626",
    description: "Real estate specific prompts and templates",
    children: [
      {
        name: "Property Listings",
        slug: "property-listings",
        icon: "building-2",
        description: "Templates for property listing descriptions",
      },
      {
        name: "Investor Outreach",
        slug: "investor-outreach",
        icon: "users",
        description: "Templates for reaching out to investors",
      },
      {
        name: "Motivated Sellers",
        slug: "motivated-sellers",
        icon: "user-check",
        description: "Templates for contacting motivated sellers",
      },
    ],
  },
];

// Sample content items for each category
const SAMPLE_CONTENT_ITEMS = [
  {
    categorySlug: "emails",
    title: "Initial Outreach Email",
    content: `Subject: Quick Question About {{propertyAddress}}

Hi {{firstName}},

I noticed your property at {{propertyAddress}} and wanted to reach out. I work with investors in the {{city}} area who are actively looking for properties.

Would you be open to a quick conversation about your plans for the property?

Best regards,
{{senderName}}`,
    description: "A friendly initial outreach email for property owners",
    tags: ["outreach", "initial", "property"],
  },
  {
    categorySlug: "sms-templates",
    title: "Quick SMS Introduction",
    content: `Hi {{firstName}}, this is {{senderName}}. I saw your property at {{propertyAddress}} and wanted to ask if you'd consider selling? No pressure, just curious about your plans. Reply STOP to opt out.`,
    description: "Short SMS template for initial contact",
    tags: ["sms", "initial", "short"],
  },
  {
    categorySlug: "buyer-persona",
    title: "Buyer Persona Builder",
    content: `Create a detailed buyer persona for my business:

Industry: {{industry}}
Product/Service: {{product}}

Please analyze and provide:
1. Demographics (age, location, income)
2. Pain points and challenges
3. Goals and motivations
4. Where they spend time online
5. How they make purchasing decisions
6. Objections they might have
7. What triggers them to buy`,
    description: "Comprehensive buyer persona creation prompt",
    tags: ["persona", "targeting", "analysis"],
  },
  {
    categorySlug: "sql-queries",
    title: "Leads Without Phone Numbers",
    content: `SELECT
  l.id,
  l.first_name,
  l.last_name,
  l.email,
  l.created_at
FROM leads l
LEFT JOIN lead_phone_numbers lpn ON l.id = lpn.lead_id
WHERE lpn.id IS NULL
  AND l.team_id = '{{teamId}}'
ORDER BY l.created_at DESC
LIMIT 100;`,
    description: "Find leads that need phone number enrichment",
    tags: ["sql", "leads", "enrichment"],
  },
];

@Injectable()
export class ContentLibrarySeed {
  constructor(@InjectDB() private db: DrizzleClient) {}

  async seed(): Promise<void> {
    console.log("Seeding content library categories...");

    // Check if categories already exist
    const existing = await this.db
      .select()
      .from(contentCategoriesTable)
      .limit(1);

    if (existing.length > 0) {
      console.log("Content library already seeded, skipping...");
      return;
    }

    // Seed categories recursively
    for (const category of SYSTEM_CATEGORIES) {
      await this.seedCategory(category, null);
    }

    // Seed sample content items
    for (const item of SAMPLE_CONTENT_ITEMS) {
      await this.seedContentItem(item);
    }

    console.log("Content library seeding complete!");
  }

  private async seedCategory(
    data: CategorySeedData,
    parentId: string | null,
  ): Promise<string> {
    const id = generateUlid("ccat");

    await this.db.insert(contentCategoriesTable).values({
      id,
      teamId: null, // System category
      name: data.name,
      slug: data.slug,
      description: data.description,
      icon: data.icon,
      color: data.color,
      parentId,
      sortOrder: 0,
      isSystem: true,
    });

    // Seed children
    if (data.children) {
      for (const child of data.children) {
        await this.seedCategory(child, id);
      }
    }

    return id;
  }

  private async seedContentItem(data: {
    categorySlug: string;
    title: string;
    content: string;
    description?: string;
    tags?: string[];
  }): Promise<void> {
    // Find category by slug
    const category = await this.db.query.contentCategories.findFirst({
      where: (t) => eq(t.slug, data.categorySlug),
    });

    if (!category) {
      console.warn(`Category not found: ${data.categorySlug}`);
      return;
    }

    await this.db.insert(contentItemsTable).values({
      teamId: null, // System content
      categoryId: category.id,
      title: data.title,
      content: data.content,
      description: data.description,
      contentType: "PROMPT",
      tags: data.tags ?? [],
      variables: [],
      visibility: "PUBLIC",
      isActive: true,
      isFavorite: false,
      usageCount: 0,
    } as any);
  }
}

// Export a function to run the seed
export async function seedContentLibrary(db: DrizzleClient): Promise<void> {
  const seeder = new ContentLibrarySeed(db as any);
  await seeder.seed();
}
