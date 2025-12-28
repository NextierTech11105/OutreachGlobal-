import { NextRequest, NextResponse } from "next/server";
import {
  createTemplate,
  getTemplates,
  isConfigured,
} from "@/lib/signalhouse/client";

// Default templates to sync (subset of most important ones)
// These are the templates from message-templates/page.tsx organized by category
const DEFAULT_TEMPLATES = [
  // INITIAL SMS - GIANNA
  {
    name: "opener-valuation-curiosity",
    content:
      "Hey {{name}}, {{sender_name}} with {{company}}. Ever wonder what your business could sell for? I can get you a valuation. Best email?",
    category: "initial",
  },
  {
    name: "opener-hidden-value",
    content:
      "Hey {{name}}, most owners have no idea what they're sitting on. Want a quick valuation? Best email to send it?",
    category: "initial",
  },
  {
    name: "opener-expand-exit",
    content:
      "{{sender_name}} here — thinking about expanding or exiting? I can get you a clean valuation. What's a good email?",
    category: "initial",
  },
  {
    name: "opener-free-offer",
    content:
      "Hey {{name}}, I help owners know what their business can sell for. Want a valuation? What email works?",
    category: "initial",
  },
  {
    name: "opener-know-number",
    content:
      "Curious — do you know what your business would sell for right now? I can show you. Best email?",
    category: "initial",
  },

  // RETARGET - CATHY
  {
    name: "retarget-quick-checkin",
    content:
      "Hey {{name}}! Just checking in — still interested in chatting? Let me know if now works better!",
    category: "retarget",
  },
  {
    name: "retarget-busy-week",
    content:
      "Hey {{name}}, I know things get busy. Still interested in that valuation? Just reply and we can set up a quick call.",
    category: "retarget",
  },
  {
    name: "retarget-making-sure",
    content:
      "Hey {{name}}! Making sure my messages are getting through. If you're still interested, I'm here!",
    category: "retarget",
  },
  {
    name: "retarget-no-pressure",
    content:
      "Hey {{name}}, no pressure at all — just wanted to see if you're still thinking about getting a valuation. Thoughts?",
    category: "retarget",
  },

  // NUDGE - CATHY
  {
    name: "nudge-just-checking",
    content:
      "Hey {{name}}, just checking in! Any questions about that valuation? Let me know if now works better to chat.",
    category: "nudge",
  },
  {
    name: "nudge-following-up",
    content:
      "{{sender_name}} here — following up on our conversation. Still thinking about it? Happy to answer questions.",
    category: "nudge",
  },
  {
    name: "nudge-quick-reminder",
    content:
      "Hey {{name}}! Quick reminder — I'm here if you have questions about the valuation. No rush!",
    category: "nudge",
  },

  // FOLLOW-UP NURTURE
  {
    name: "followup-value-add",
    content:
      "Hey {{name}}, thought you'd find this interesting — just saw some new data on {{industry}} valuations. Want me to share?",
    category: "followup",
  },
  {
    name: "followup-market-insight",
    content:
      "Hey {{name}}, quick market insight: {{industry}} is seeing increased buyer interest. Thought you'd want to know!",
    category: "followup",
  },

  // RETENTION
  {
    name: "retention-checkin",
    content:
      "Hey {{name}}, {{sender_name}} here. Just checking in — how's everything going since we last worked together?",
    category: "retention",
  },
  {
    name: "retention-referral",
    content:
      "{{name}}, quick question — know anyone else who might benefit from what we did for you? Happy to help them too!",
    category: "retention",
  },
];

// POST - Sync default templates to SignalHouse
export async function POST(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        error: "SignalHouse API not configured",
      },
      { status: 503 },
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { force = false, templates: customTemplates } = body;

    // Use custom templates if provided, otherwise use defaults
    const templatesToSync = customTemplates || DEFAULT_TEMPLATES;

    // Get existing templates
    const existingResult = await getTemplates();
    const existingNames = new Set(
      (existingResult.data || []).map((t) => t.name),
    );

    const results = {
      synced: 0,
      skipped: 0,
      failed: 0,
      details: [] as Array<{
        name: string;
        status: "created" | "skipped" | "failed";
        error?: string;
      }>,
    };

    for (const template of templatesToSync) {
      // Skip if already exists and not forcing
      if (existingNames.has(template.name) && !force) {
        results.skipped++;
        results.details.push({ name: template.name, status: "skipped" });
        continue;
      }

      // Extract variables from content
      const variables = extractVariables(template.content);

      // Create template
      const result = await createTemplate({
        name: template.name,
        content: template.content,
        variables,
      });

      if (result.success) {
        results.synced++;
        results.details.push({ name: template.name, status: "created" });
      } else {
        results.failed++;
        results.details.push({
          name: template.name,
          status: "failed",
          error: result.error,
        });
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${results.synced} templates, skipped ${results.skipped}, failed ${results.failed}`,
      ...results,
    });
  } catch (error: any) {
    console.error("[SignalHouse Templates Sync] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Check sync status (which templates exist in SignalHouse)
export async function GET() {
  if (!isConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        error: "SignalHouse API not configured",
      },
      { status: 503 },
    );
  }

  try {
    const existingResult = await getTemplates();
    const existingNames = new Set(
      (existingResult.data || []).map((t) => t.name),
    );

    const syncStatus = DEFAULT_TEMPLATES.map((t) => ({
      name: t.name,
      category: t.category,
      synced: existingNames.has(t.name),
    }));

    const synced = syncStatus.filter((s) => s.synced).length;
    const total = DEFAULT_TEMPLATES.length;

    return NextResponse.json({
      success: true,
      synced,
      total,
      percentage: Math.round((synced / total) * 100),
      templates: syncStatus,
      signalHouseTemplates: existingResult.data || [],
    });
  } catch (error: any) {
    console.error("[SignalHouse Templates Sync] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper: Extract variables from template content
function extractVariables(content: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const variables = new Set<string>();
  let match;
  while ((match = regex.exec(content)) !== null) {
    variables.add(match[1]);
  }
  return Array.from(variables);
}
