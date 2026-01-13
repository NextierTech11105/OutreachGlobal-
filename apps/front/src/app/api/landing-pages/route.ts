import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * LANDING PAGE API
 * ═══════════════════════════════════════════════════════════════════════════════
 * Create, manage, and publish landing pages for clients
 *
 * Landing pages have:
 * - Dynamic contextual structure (hero, features, CTA, testimonials)
 * - Intentions (conversion goals, CTAs)
 * - Psychology (trust signals, urgency, social proof)
 *
 * Published pages get a unique URL: /p/[slug]
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface LandingPageSection {
  id: string;
  type:
    | "hero"
    | "features"
    | "stats"
    | "testimonials"
    | "cta"
    | "faq"
    | "custom";
  content: Record<string, unknown>;
  order: number;
}

export interface LandingPageConfig {
  id: string;
  teamId: string;
  slug: string;
  title: string;
  description?: string;

  // Template
  template: "skyline" | "watershed" | "minimal" | "bold" | "custom";

  // Structure
  sections: LandingPageSection[];

  // Intentions (Psychology)
  intention: {
    primaryCta: {
      text: string;
      action: "email" | "call" | "form" | "calendar" | "link";
      target: string; // email address, phone, calendar link, etc.
    };
    secondaryCta?: {
      text: string;
      action: "email" | "call" | "form" | "calendar" | "link";
      target: string;
    };
    urgency?: string; // "Limited spots available"
    socialProof?: string; // "Trusted by 500+ companies"
  };

  // Branding
  branding: {
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
    backgroundImage?: string;
    fontFamily?: string;
  };

  // Meta
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: string;
  };

  // Status
  status: "draft" | "published" | "archived";
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;

  // Analytics
  views?: number;
  conversions?: number;
}

// Built-in templates
const TEMPLATES: Record<string, Partial<LandingPageConfig>> = {
  skyline: {
    template: "skyline",
    branding: {
      primaryColor: "#06B6D4",
      secondaryColor: "#3B82F6",
    },
    sections: [
      {
        id: "hero",
        type: "hero",
        content: {
          headline: "Rise Above The Noise",
          subheadline: "Revenue execution engine for modern teams",
          backgroundImage: "/nextier-skyline.jpg",
        },
        order: 0,
      },
      {
        id: "features",
        type: "features",
        content: {
          title: "The Execution Loop",
          items: [
            { name: "SMS Foundation", description: "10DLC compliant at scale" },
            { name: "AI Copilots", description: "GIANNA, CATHY, SABRINA" },
            { name: "Hot Call Queue", description: "Qualified leads ready" },
            { name: "Deals Closed", description: "Predictable revenue" },
          ],
        },
        order: 1,
      },
      {
        id: "stats",
        type: "stats",
        content: {
          items: [
            { value: "2,000+", label: "SMS per day" },
            { value: "3", label: "AI Workers" },
            { value: "7+", label: "CRM Integrations" },
          ],
        },
        order: 2,
      },
      {
        id: "cta",
        type: "cta",
        content: {
          headline: "White Label Partnerships",
          subheadline: "For CRM Consultants Who Get It",
          description: "Email us to schedule a 15-minute discovery call",
        },
        order: 3,
      },
    ],
  },
  watershed: {
    template: "watershed",
    branding: {
      primaryColor: "#22D3EE",
      secondaryColor: "#6366F1",
    },
    sections: [
      {
        id: "hero",
        type: "hero",
        content: {
          headline: "Water Always Finds Its Way",
          subheadline:
            "Like water carving through rock, inevitably flowing from data to deals",
        },
        order: 0,
      },
      {
        id: "stages",
        type: "custom",
        content: {
          type: "watershed_stages",
          stages: [
            "DATA PREP",
            "CAMPAIGN PREP",
            "OUTBOUND SMS",
            "INBOUND RESPONSE",
            "AI COPILOT",
            "HOT CALL QUEUE",
            "15-MIN DISCOVERY",
            "1-HOUR STRATEGY",
            "PROPOSAL",
            "DEAL",
          ],
        },
        order: 1,
      },
      {
        id: "cta",
        type: "cta",
        content: {
          headline: "Let's Discuss Our Vision",
          subheadline: "White Label Partnerships with CRM Consultants",
        },
        order: 2,
      },
    ],
  },
  minimal: {
    template: "minimal",
    branding: {
      primaryColor: "#000000",
      secondaryColor: "#666666",
    },
    sections: [
      {
        id: "hero",
        type: "hero",
        content: {
          headline: "Your Headline Here",
          subheadline: "Your compelling subheadline",
        },
        order: 0,
      },
      {
        id: "cta",
        type: "cta",
        content: {
          headline: "Ready to start?",
        },
        order: 1,
      },
    ],
  },
};

// GET - List landing pages or get single page
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const slug = searchParams.get("slug");
    const id = searchParams.get("id");

    // Get single page by slug (public)
    if (slug) {
      const result = await db.execute(sql`
        SELECT value FROM team_settings
        WHERE name = 'landing_page'
        AND value::jsonb->>'slug' = ${slug}
        AND value::jsonb->>'status' = 'published'
        LIMIT 1
      `);

      if (!result.rows?.length) {
        return NextResponse.json({ error: "Page not found" }, { status: 404 });
      }

      const page = result.rows[0].value as LandingPageConfig;

      // Increment view count
      await db.execute(sql`
        UPDATE team_settings
        SET value = jsonb_set(value::jsonb, '{views}', to_jsonb(COALESCE((value::jsonb->>'views')::int, 0) + 1))
        WHERE name = 'landing_page'
        AND value::jsonb->>'slug' = ${slug}
      `);

      return NextResponse.json({ page });
    }

    // Get single page by ID
    if (id) {
      const auth = await apiAuth();
      if (!auth.userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const result = await db.execute(sql`
        SELECT value FROM team_settings
        WHERE name = 'landing_page'
        AND value::jsonb->>'id' = ${id}
        LIMIT 1
      `);

      if (!result.rows?.length) {
        return NextResponse.json({ error: "Page not found" }, { status: 404 });
      }

      return NextResponse.json({ page: result.rows[0].value });
    }

    // List all pages for team
    if (!teamId) {
      return NextResponse.json({ error: "teamId required" }, { status: 400 });
    }

    const auth = await apiAuth();
    if (!auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await db.execute(sql`
      SELECT value FROM team_settings
      WHERE team_id = ${teamId}
      AND name = 'landing_page'
      ORDER BY (value::jsonb->>'updatedAt')::timestamp DESC
    `);

    const pages = result.rows?.map((r) => r.value) || [];

    return NextResponse.json({
      pages,
      templates: Object.keys(TEMPLATES),
    });
  } catch (error) {
    console.error("[Landing Pages] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pages" },
      { status: 500 },
    );
  }
}

// POST - Create new landing page
export async function POST(request: NextRequest) {
  try {
    const auth = await apiAuth();
    if (!auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { teamId, title, template = "minimal", slug: customSlug } = body;

    if (!teamId || !title) {
      return NextResponse.json(
        { error: "teamId and title required" },
        { status: 400 },
      );
    }

    // Generate unique slug
    const baseSlug =
      customSlug ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 30);
    const slug = `${baseSlug}-${nanoid(6)}`;

    // Get template config
    const templateConfig = TEMPLATES[template] || TEMPLATES.minimal;

    const now = new Date().toISOString();
    const pageId = nanoid();

    const page: LandingPageConfig = {
      id: pageId,
      teamId,
      slug,
      title,
      template: template as LandingPageConfig["template"],
      sections: templateConfig.sections || [],
      intention: {
        primaryCta: {
          text: "Get Started",
          action: "email",
          target: "tb@outreachglobal.io",
        },
      },
      branding: templateConfig.branding || {
        primaryColor: "#06B6D4",
        secondaryColor: "#3B82F6",
      },
      seo: {
        metaTitle: title,
      },
      status: "draft",
      createdAt: now,
      updatedAt: now,
      views: 0,
      conversions: 0,
    };

    // Save to database
    await db.execute(sql`
      INSERT INTO team_settings (id, team_id, name, value, type, created_at, updated_at)
      VALUES (
        ${pageId},
        ${teamId},
        'landing_page',
        ${JSON.stringify(page)},
        'json',
        NOW(),
        NOW()
      )
    `);

    return NextResponse.json({
      page,
      previewUrl: `/p/${slug}?preview=true`,
      editUrl: `/t/${teamId}/content-library/landing-pages/${pageId}`,
    });
  } catch (error) {
    console.error("[Landing Pages] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create page" },
      { status: 500 },
    );
  }
}

// PUT - Update landing page
export async function PUT(request: NextRequest) {
  try {
    const auth = await apiAuth();
    if (!auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    // Get existing page
    const existing = await db.execute(sql`
      SELECT value FROM team_settings
      WHERE name = 'landing_page'
      AND value::jsonb->>'id' = ${id}
      LIMIT 1
    `);

    if (!existing.rows?.length) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const currentPage = existing.rows[0].value as LandingPageConfig;

    // Merge updates
    const updatedPage: LandingPageConfig = {
      ...currentPage,
      ...updates,
      id: currentPage.id, // Preserve ID
      teamId: currentPage.teamId, // Preserve team
      slug: currentPage.slug, // Preserve slug
      createdAt: currentPage.createdAt, // Preserve created
      updatedAt: new Date().toISOString(),
    };

    // Handle publish
    if (updates.status === "published" && currentPage.status !== "published") {
      updatedPage.publishedAt = new Date().toISOString();
    }

    // Save
    await db.execute(sql`
      UPDATE team_settings
      SET value = ${JSON.stringify(updatedPage)}, updated_at = NOW()
      WHERE name = 'landing_page'
      AND value::jsonb->>'id' = ${id}
    `);

    return NextResponse.json({
      page: updatedPage,
      publicUrl:
        updatedPage.status === "published" ? `/p/${updatedPage.slug}` : null,
    });
  } catch (error) {
    console.error("[Landing Pages] PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update page" },
      { status: 500 },
    );
  }
}

// DELETE - Delete landing page
export async function DELETE(request: NextRequest) {
  try {
    const auth = await apiAuth();
    if (!auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    await db.execute(sql`
      DELETE FROM team_settings
      WHERE name = 'landing_page'
      AND value::jsonb->>'id' = ${id}
    `);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Landing Pages] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete page" },
      { status: 500 },
    );
  }
}
