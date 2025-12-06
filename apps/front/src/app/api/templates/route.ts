import { NextRequest, NextResponse } from "next/server";
import smsInitial from "@/lib/templates/sms_initial.json";
import smsGiannaLoop from "@/lib/templates/sms_gianna_loop.json";
import coldCallOpeners from "@/lib/templates/cold_call_openers.json";
import smsStrategySession from "@/lib/templates/sms_strategy_session.json";
import masterTemplates from "@/lib/templates/master_templates.json";

/**
 * GET /api/templates
 * Get all templates or filter by category
 *
 * Query params:
 * - category: Filter by category
 * - type: Filter by type (sms, cold_call)
 * - format: 'full' | 'list' (list returns just names and counts)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const type = searchParams.get("type");
    const format = searchParams.get("format");

    // All template libraries (individual files)
    const allTemplates = {
      initial: smsInitial,
      gianna_loop: smsGiannaLoop,
      cold_calls: coldCallOpeners,
      strategy_session: smsStrategySession,
    };

    // Filter by category if specified
    if (category) {
      // Check legacy individual files first
      switch (category) {
        case "initial_outreach":
        case "initial":
          return NextResponse.json({ success: true, ...smsInitial });
        case "escalation_loop":
        case "gianna_loop":
        case "loop":
          return NextResponse.json({ success: true, ...smsGiannaLoop });
        case "cold_call":
        case "cold_calls":
          return NextResponse.json({ success: true, ...coldCallOpeners });
        case "strategy_session":
        case "strategy":
          return NextResponse.json({ success: true, ...smsStrategySession });
      }

      // Check master templates
      const masterCats = masterTemplates.templates as Record<string, unknown[]>;
      if (masterCats[category]) {
        const metadata = masterTemplates.categories as Record<string, unknown>;
        return NextResponse.json({
          success: true,
          category,
          templates: masterCats[category],
          metadata: metadata[category] || null,
        });
      }

      return NextResponse.json(
        { error: `Unknown category: ${category}` },
        { status: 400 }
      );
    }

    // Filter by type (sms, cold_call)
    if (type === "sms") {
      return NextResponse.json({
        success: true,
        initial: smsInitial,
        gianna_loop: smsGiannaLoop,
        strategy_session: smsStrategySession,
        master: {
          sms_initial_medium_article: (masterTemplates.templates as Record<string, unknown[]>).sms_initial_medium_article,
          strategy_session_sms: (masterTemplates.templates as Record<string, unknown[]>).strategy_session_sms,
          gianna_nielsen_loop: (masterTemplates.templates as Record<string, unknown[]>).gianna_nielsen_loop,
        },
      });
    }

    if (type === "cold_call") {
      return NextResponse.json({
        success: true,
        ...coldCallOpeners,
        master: {
          cold_call_medium_article: (masterTemplates.templates as Record<string, unknown[]>).cold_call_medium_article,
        },
      });
    }

    // List format - just names and counts
    if (format === "list") {
      const categories = [
        { id: "initial", name: "Initial Outreach", count: smsInitial.templates.length, source: "individual" },
        { id: "gianna_loop", name: "Gianna Escalation Loop", count: smsGiannaLoop.templates.length, source: "individual" },
        { id: "cold_calls", name: "Cold Call Openers", count: coldCallOpeners.templates.length, source: "individual" },
        { id: "strategy_session", name: "Strategy Session Invites", count: smsStrategySession.templates.length, source: "individual" },
      ];

      // Add master template categories
      const masterCats = masterTemplates.templates as Record<string, unknown[]>;
      const masterMeta = masterTemplates.categories as Record<string, { name: string }>;
      for (const [key, templates] of Object.entries(masterCats)) {
        categories.push({
          id: key,
          name: masterMeta[key]?.name || key,
          count: templates.length,
          source: "master",
        });
      }

      return NextResponse.json({
        success: true,
        categories,
        total: categories.reduce((sum, c) => sum + c.count, 0),
      });
    }

    // Return all templates (full format)
    return NextResponse.json({
      success: true,
      individual_templates: allTemplates,
      master_templates: masterTemplates.templates,
      categories: {
        individual: [
          { id: "initial", name: "Initial Outreach", count: smsInitial.templates.length },
          { id: "gianna_loop", name: "Gianna Escalation Loop", count: smsGiannaLoop.templates.length },
          { id: "cold_calls", name: "Cold Call Openers", count: coldCallOpeners.templates.length },
          { id: "strategy_session", name: "Strategy Session Invites", count: smsStrategySession.templates.length },
        ],
        master: masterTemplates.categories,
      },
      variables: masterTemplates.variables,
      performance_index: masterTemplates.performance_index,
      total_count:
        smsInitial.templates.length +
        smsGiannaLoop.templates.length +
        coldCallOpeners.templates.length +
        smsStrategySession.templates.length +
        Object.values(masterTemplates.templates as Record<string, unknown[]>).reduce(
          (sum, arr) => sum + arr.length,
          0
        ),
    });
  } catch (error) {
    console.error("[Templates API] Error:", error);
    return NextResponse.json(
      { error: "Failed to load templates" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/templates
 * Render a template with variables
 *
 * Body:
 * - template_id: The template ID
 * - category: The category to look in
 * - variables: Object of variable replacements
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { template_id, category, variables } = body;

    if (!template_id) {
      return NextResponse.json(
        { error: "template_id is required" },
        { status: 400 }
      );
    }

    // Find the template
    let template: { id?: string; text?: string; message?: string } | undefined;
    let foundCategory = category;

    // Search in master templates first
    if (category) {
      const masterCats = masterTemplates.templates as Record<
        string,
        Array<{ id: string; text?: string; message?: string }>
      >;
      if (masterCats[category]) {
        template = masterCats[category].find((t) => t.id === template_id);
      }
    }

    // If not found, search individual files
    if (!template) {
      // Check smsInitial
      const initTemplate = smsInitial.templates.find((t) => t.id === template_id);
      if (initTemplate) {
        template = initTemplate;
        foundCategory = "initial";
      }
    }

    if (!template) {
      // Check smsGiannaLoop
      const loopTemplate = smsGiannaLoop.templates.find((t) => t.id === template_id);
      if (loopTemplate) {
        template = loopTemplate;
        foundCategory = "gianna_loop";
      }
    }

    if (!template) {
      // Check smsStrategySession
      const strategyTemplate = smsStrategySession.templates.find((t) => t.id === template_id);
      if (strategyTemplate) {
        template = strategyTemplate;
        foundCategory = "strategy_session";
      }
    }

    if (!template) {
      // Check coldCallOpeners
      const coldTemplate = coldCallOpeners.templates.find((t) => t.id === template_id);
      if (coldTemplate) {
        template = coldTemplate;
        foundCategory = "cold_calls";
      }
    }

    if (!template) {
      // Search all master template categories
      const masterCats = masterTemplates.templates as Record<
        string,
        Array<{ id: string; text?: string; message?: string }>
      >;
      for (const [cat, templates] of Object.entries(masterCats)) {
        const found = templates.find((t) => t.id === template_id);
        if (found) {
          template = found;
          foundCategory = cat;
          break;
        }
      }
    }

    if (!template) {
      return NextResponse.json(
        { error: `Template '${template_id}' not found` },
        { status: 404 }
      );
    }

    // Render with variables
    let rendered = template.text || template.message || "";

    if (variables) {
      for (const [key, value] of Object.entries(variables)) {
        rendered = rendered.replace(
          new RegExp(`\\{\\{${key}\\}\\}`, "g"),
          String(value)
        );
      }
    }

    // Replace any remaining variables with fallbacks from master
    const varDefs = masterTemplates.variables as Record<string, { fallback: string }>;
    for (const [key, def] of Object.entries(varDefs)) {
      rendered = rendered.replace(
        new RegExp(`\\{\\{${key}\\}\\}`, "g"),
        def.fallback
      );
    }

    return NextResponse.json({
      success: true,
      template_id,
      category: foundCategory,
      original: template.text || template.message,
      rendered,
      character_count: rendered.length,
      sms_segments: Math.ceil(rendered.length / 160),
      compliance: {
        has_opt_out: rendered.toLowerCase().includes("stop"),
        tcpa_compliant: rendered.toLowerCase().includes("stop") || rendered.toLowerCase().includes("opt out"),
      },
    });
  } catch (error) {
    console.error("[Templates API] Render error:", error);
    return NextResponse.json(
      { error: "Failed to render template" },
      { status: 500 }
    );
  }
}
