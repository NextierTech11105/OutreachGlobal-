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

// ============================================================================
// SOCIAL MEDIA TEMPLATES - Baseline posts and ads for AI copilot distribution
// Each template has a unique ID pattern for 2-bracket SMS content link approach
// ============================================================================

const SOCIAL_MEDIA_TEMPLATES = [
  // -------------------------------------------------------------------------
  // FACEBOOK POSTS
  // -------------------------------------------------------------------------
  {
    categorySlug: "facebook",
    contentType: "SOCIAL_POST",
    title: "FB - Value Bomb Post",
    content: `🔥 {{industry}} Tip of the Day 🔥

Most {{targetAudience}} don't realize this, but {{valueBomb}}.

Here's the thing: {{explanation}}

The result? {{benefit}}

💬 Drop a "🙌" in the comments if you found this helpful!

#{{industry}} #{{niche}} #ValueFirst`,
    description: "High-engagement value post that drives comments",
    tags: ["facebook", "engagement", "value", "organic"],
    externalUrl: null,
  },
  {
    categorySlug: "facebook",
    contentType: "SOCIAL_POST",
    title: "FB - Before/After Story",
    content: `📍 BEFORE: {{painPoint}}
📍 AFTER: {{transformation}}

Here's what changed for {{clientName}} in just {{timeframe}}:

✅ {{result1}}
✅ {{result2}}
✅ {{result3}}

The secret? {{method}}

Want the same results? Comment "INFO" below 👇`,
    description: "Transformation story post for social proof",
    tags: ["facebook", "testimonial", "story", "lead-gen"],
    externalUrl: null,
  },
  {
    categorySlug: "facebook",
    contentType: "SOCIAL_AD",
    title: "FB Ad - Lead Magnet Offer",
    content: `🎁 FREE {{leadMagnetType}}: "{{leadMagnetTitle}}"

{{targetAudience}}: Stop wasting time on {{painActivity}}.

In this {{leadMagnetType}}, you'll discover:
📌 {{benefit1}}
📌 {{benefit2}}
📌 {{benefit3}}

👉 Click below to get your FREE copy instantly.

{{callToAction}}`,
    description: "Facebook ad for lead magnet download",
    tags: ["facebook", "ad", "lead-magnet", "paid"],
    externalUrl: "{{leadMagnetUrl}}",
  },
  {
    categorySlug: "facebook",
    contentType: "SOCIAL_AD",
    title: "FB Ad - Appointment Booking",
    content: `📞 {{targetAudience}} in {{location}}!

Are you dealing with {{painPoint}}?

We've helped {{number}}+ {{clientType}} achieve {{result}}.

🗓️ Book your FREE {{duration}} {{meetingType}} today.

Limited spots available this week.

👇 Click "Book Now" to secure your time.`,
    description: "Direct response ad for appointment booking",
    tags: ["facebook", "ad", "appointment", "local"],
    externalUrl: "{{bookingUrl}}",
  },

  // -------------------------------------------------------------------------
  // LINKEDIN POSTS
  // -------------------------------------------------------------------------
  {
    categorySlug: "linkedin",
    contentType: "SOCIAL_POST",
    title: "LI - Thought Leadership Hook",
    content: `{{controversialOpening}}

I know that might ruffle some feathers, but hear me out.

After {{yearsExperience}} years in {{industry}}, I've learned that {{insight}}.

Here's what most people get wrong:

❌ They think {{misconception}}
✅ When actually {{truth}}

The best {{professionals}} understand this.

What's your take? 👇`,
    description: "Thought leadership post that sparks discussion",
    tags: ["linkedin", "thought-leadership", "engagement", "b2b"],
    externalUrl: null,
  },
  {
    categorySlug: "linkedin",
    contentType: "SOCIAL_POST",
    title: "LI - Case Study Teaser",
    content: `We just helped {{clientType}} achieve {{result}} in {{timeframe}}.

Here's the 3-step framework we used:

1️⃣ {{step1}}
2️⃣ {{step2}}
3️⃣ {{step3}}

The outcome:
→ {{metric1}}
→ {{metric2}}
→ {{metric3}}

Full case study in the comments 👇`,
    description: "Case study teaser for B2B lead generation",
    tags: ["linkedin", "case-study", "b2b", "results"],
    externalUrl: null,
  },
  {
    categorySlug: "linkedin",
    contentType: "SOCIAL_POST",
    title: "LI - Personal Story + Lesson",
    content: `{{yearsAgo}} years ago, I was {{pastSituation}}.

I made a decision that changed everything: {{decision}}

It wasn't easy. In fact, {{challenge}}.

But here's what I learned:

{{lesson}}

Now, {{currentSituation}}.

If you're facing {{similarSituation}}, remember: {{encouragement}}

Has anyone else experienced this? I'd love to hear your story.`,
    description: "Personal narrative post for connection and engagement",
    tags: ["linkedin", "personal", "story", "authentic"],
    externalUrl: null,
  },

  // -------------------------------------------------------------------------
  // INSTAGRAM POSTS
  // -------------------------------------------------------------------------
  {
    categorySlug: "instagram",
    contentType: "SOCIAL_POST",
    title: "IG - Carousel Hook (Slide 1)",
    content: `SLIDE 1 (HOOK):
{{hookQuestion}}

SLIDE 2-7 (CONTENT):
{{point1}} → {{explanation1}}
{{point2}} → {{explanation2}}
{{point3}} → {{explanation3}}
{{point4}} → {{explanation4}}
{{point5}} → {{explanation5}}
{{point6}} → {{explanation6}}

SLIDE 8 (CTA):
Save this post 📌
Share with someone who needs this 📤
Follow @{{handle}} for more

CAPTION:
{{captionHook}}

Which tip are you going to try first? Comment below! 👇

.
.
.
#{{hashtag1}} #{{hashtag2}} #{{hashtag3}} #{{hashtag4}} #{{hashtag5}}`,
    description: "Educational carousel post framework",
    tags: ["instagram", "carousel", "educational", "save-worthy"],
    externalUrl: null,
  },
  {
    categorySlug: "instagram",
    contentType: "SOCIAL_POST",
    title: "IG - Reel Script Template",
    content: `🎬 REEL SCRIPT

HOOK (0-3 sec):
"{{attentionGrabber}}"

PROBLEM (3-7 sec):
"If you're a {{targetAudience}} struggling with {{problem}}..."

SOLUTION (7-20 sec):
"Here's what you need to do:
Step 1: {{step1}}
Step 2: {{step2}}
Step 3: {{step3}}"

CTA (20-25 sec):
"Follow for more {{niche}} tips!"

CAPTION:
{{caption}}

🎵 Trending audio suggestion: {{audioSuggestion}}`,
    description: "Reel script template for quick tips",
    tags: ["instagram", "reel", "video", "short-form"],
    externalUrl: null,
  },
  {
    categorySlug: "instagram",
    contentType: "SOCIAL_STORY",
    title: "IG Story - Poll Engagement",
    content: `STORY SEQUENCE:

STORY 1 (Question):
"Quick question for my {{niche}} people 👇"

STORY 2 (Poll):
"Which is your biggest challenge?"
Option A: {{option1}}
Option B: {{option2}}

STORY 3 (Based on results):
"Interesting! Most of you said {{winningOption}}..."

STORY 4 (Value):
"Here's my #1 tip for that: {{tip}}"

STORY 5 (CTA):
"Want more tips like this?"
[Link sticker to: {{linkUrl}}]`,
    description: "Interactive story sequence for engagement",
    tags: ["instagram", "story", "poll", "engagement"],
    externalUrl: "{{linkUrl}}",
  },

  // -------------------------------------------------------------------------
  // TIKTOK POSTS
  // -------------------------------------------------------------------------
  {
    categorySlug: "tiktok",
    contentType: "SOCIAL_REEL",
    title: "TikTok - POV Hook Script",
    content: `🎬 TIKTOK SCRIPT

TEXT ON SCREEN:
"POV: You're a {{targetAudience}} who just discovered {{discovery}}"

VOICEOVER:
"{{openingLine}}

Here's the thing no one tells you about {{topic}}:

{{revelation}}

This is why {{reason}}.

{{callToAction}}"

HASHTAGS:
#{{niche}}tok #{{topic}} #fyp #viral #{{industry}}

CAPTION:
{{caption}} | Follow for more {{niche}} content 🔥`,
    description: "POV-style TikTok script for relatability",
    tags: ["tiktok", "pov", "viral", "hook"],
    externalUrl: null,
  },
  {
    categorySlug: "tiktok",
    contentType: "SOCIAL_REEL",
    title: "TikTok - Myth Buster",
    content: `🎬 TIKTOK SCRIPT

HOOK (show text):
"{{myth}} ❌ WRONG"

REVEAL:
"Actually, {{truth}} ✅

Here's what {{experts}} don't want you to know:

{{insiderInfo}}

And that's why {{conclusion}}."

END CARD:
"Follow for more {{niche}} secrets 🤫"

HASHTAGS:
#mythbusted #{{niche}} #facts #themoreyouknow #fyp`,
    description: "Myth-busting format for authority building",
    tags: ["tiktok", "myth", "educational", "authority"],
    externalUrl: null,
  },

  // -------------------------------------------------------------------------
  // YOUTUBE POSTS
  // -------------------------------------------------------------------------
  {
    categorySlug: "youtube",
    contentType: "SOCIAL_POST",
    title: "YT - Video Title + Description",
    content: `📹 VIDEO TITLE OPTIONS:
1. {{title1}}
2. {{title2}}
3. {{title3}}

DESCRIPTION:
{{hookParagraph}}

In this video, you'll learn:
⏱️ 0:00 - Intro
⏱️ {{timestamp1}} - {{topic1}}
⏱️ {{timestamp2}} - {{topic2}}
⏱️ {{timestamp3}} - {{topic3}}
⏱️ {{timestamp4}} - {{topic4}}
⏱️ {{finalTimestamp}} - Recap & Next Steps

🔗 RESOURCES MENTIONED:
• {{resource1}}: {{resourceUrl1}}
• {{resource2}}: {{resourceUrl2}}

📧 FREE {{leadMagnet}}: {{leadMagnetUrl}}

🔔 Don't forget to SUBSCRIBE and hit the notification bell!

#{{keyword1}} #{{keyword2}} #{{keyword3}}`,
    description: "YouTube video title and description template",
    tags: ["youtube", "seo", "description", "timestamps"],
    externalUrl: "{{leadMagnetUrl}}",
  },
  {
    categorySlug: "youtube",
    contentType: "SOCIAL_POST",
    title: "YT Shorts - Quick Tip Script",
    content: `🎬 YOUTUBE SHORTS SCRIPT (60 sec max)

HOOK (0-3 sec):
[On screen text]: "{{hookText}}"
[Say]: "{{hookLine}}"

CONTENT (3-50 sec):
"Most {{targetAudience}} make this mistake: {{mistake}}

Instead, try this:
1. {{tip1}}
2. {{tip2}}
3. {{tip3}}"

CTA (50-60 sec):
"Subscribe for more {{niche}} tips in 60 seconds!"

[End with subscribe animation]`,
    description: "YouTube Shorts script for quick tips",
    tags: ["youtube", "shorts", "quick-tip", "60-sec"],
    externalUrl: null,
  },

  // -------------------------------------------------------------------------
  // SMS CONTENT LINKS - For 2-bracket email capture approach
  // -------------------------------------------------------------------------
  {
    categorySlug: "sms-templates",
    contentType: "SMS_CONTENT_LINK",
    title: "SMS - Content Link (Post Email Capture)",
    content: `Thanks {{firstName}}! Here's your exclusive content: {{contentUrl}}

Any questions? Just reply here. 📲`,
    description: "SMS sent after email capture with content link",
    tags: ["sms", "content-link", "email-capture", "2-bracket"],
    externalUrl: "{{contentUrl}}",
  },
  {
    categorySlug: "sms-templates",
    contentType: "SMS_CONTENT_LINK",
    title: "SMS - Free Guide Link",
    content: `Hey {{firstName}}! 🎁 Your free guide is ready: {{guideUrl}}

Got it? Reply YES to confirm!`,
    description: "SMS delivery of free guide after opt-in",
    tags: ["sms", "guide", "lead-magnet", "confirmation"],
    externalUrl: "{{guideUrl}}",
  },
  {
    categorySlug: "sms-templates",
    contentType: "SMS_CONTENT_LINK",
    title: "SMS - Case Study Link",
    content: `{{firstName}}, here's that case study I mentioned: {{caseStudyUrl}}

See how {{clientType}} got {{result}}. Reply with any Qs!`,
    description: "SMS with case study link for nurturing",
    tags: ["sms", "case-study", "nurture", "social-proof"],
    externalUrl: "{{caseStudyUrl}}",
  },
  {
    categorySlug: "sms-templates",
    contentType: "SMS_CONTENT_LINK",
    title: "SMS - Video Training Link",
    content: `🎥 {{firstName}}, your training video is live: {{videoUrl}}

Watch now - it's only {{duration}} mins. Reply DONE when finished!`,
    description: "SMS with video training link",
    tags: ["sms", "video", "training", "engagement"],
    externalUrl: "{{videoUrl}}",
  },

  // -------------------------------------------------------------------------
  // LEAD MAGNETS - Downloadable content for distribution
  // -------------------------------------------------------------------------
  {
    categorySlug: "lead-magnets",
    contentType: "EBOOK",
    title: "eBook - Industry Secrets Guide",
    content: `📚 EBOOK OUTLINE

TITLE: "The {{industry}} Secrets: {{subtitle}}"

CHAPTERS:
1. Introduction: Why {{topic}} Matters
2. The {{number}} Biggest Mistakes {{targetAudience}} Make
3. {{framework}} Framework Explained
4. Case Study: How {{exampleClient}} Achieved {{result}}
5. Step-by-Step Implementation Guide
6. Tools & Resources
7. Next Steps & Call to Action

LANDING PAGE COPY:
"Download the FREE guide that {{number}}+ {{targetAudience}} have used to {{benefit}}."`,
    description: "eBook outline template for lead magnets",
    tags: ["ebook", "lead-magnet", "download", "pdf"],
    externalUrl: null,
  },
  {
    categorySlug: "lead-magnets",
    contentType: "ONE_PAGER",
    title: "One-Pager - Quick Reference Cheatsheet",
    content: `📄 ONE-PAGER TEMPLATE

TITLE: "{{topic}} Cheatsheet"

SECTION 1: Quick Stats
• {{stat1}}
• {{stat2}}
• {{stat3}}

SECTION 2: Do's & Don'ts
✅ {{do1}}
✅ {{do2}}
❌ {{dont1}}
❌ {{dont2}}

SECTION 3: Key Formulas/Frameworks
{{formula1}}
{{formula2}}

SECTION 4: Next Steps
1. {{step1}}
2. {{step2}}
3. {{step3}}

FOOTER: "{{companyName}} | {{website}} | {{tagline}}"`,
    description: "One-page cheatsheet template",
    tags: ["one-pager", "cheatsheet", "quick-reference", "printable"],
    externalUrl: null,
  },
];

// Combine all content items
const ALL_CONTENT_ITEMS = [...SAMPLE_CONTENT_ITEMS, ...SOCIAL_MEDIA_TEMPLATES];

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

    // Seed all content items (including social media templates)
    for (const item of ALL_CONTENT_ITEMS) {
      await this.seedContentItem(item);
    }

    console.log("Content library seeding complete!");
    console.log(`Seeded ${ALL_CONTENT_ITEMS.length} content items.`);
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
    contentType?: string;
    externalUrl?: string | null;
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
      contentType: data.contentType || "PROMPT",
      tags: data.tags ?? [],
      variables: [],
      visibility: "PUBLIC",
      isActive: true,
      isFavorite: false,
      usageCount: 0,
      externalUrl: data.externalUrl ?? null,
    } as any);
  }
}

// Export a function to run the seed
export async function seedContentLibrary(db: DrizzleClient): Promise<void> {
  const seeder = new ContentLibrarySeed(db as any);
  await seeder.seed();
}
