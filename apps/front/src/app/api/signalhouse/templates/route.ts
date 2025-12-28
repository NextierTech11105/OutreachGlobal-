import { NextRequest, NextResponse } from "next/server";
import {
  createTemplate,
  getTemplates,
  getTemplateDetails,
  editTemplate,
  deleteTemplate,
  isConfigured,
} from "@/lib/signalhouse/client";

// GET - List all templates or get specific template by ID
export async function GET(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        error: "SignalHouse API not configured",
      },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const templateId = searchParams.get("id");
  const name = searchParams.get("name");

  try {
    if (templateId) {
      // Get specific template
      const result = await getTemplateDetails(templateId);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Template not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({
        success: true,
        template: result.data,
      });
    }

    // List all templates
    const result = await getTemplates(name ? { name } : undefined);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to fetch templates" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      templates: result.data || [],
    });
  } catch (error: any) {
    console.error("[SignalHouse Templates] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new template
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
    const body = await request.json();
    const { name, content, variables } = body;

    if (!name || !content) {
      return NextResponse.json(
        { error: "name and content are required" },
        { status: 400 },
      );
    }

    // Extract variables from content if not provided
    const extractedVars = variables || extractVariables(content);

    const result = await createTemplate({
      name,
      content,
      variables: extractedVars,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to create template" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      template: result.data,
    });
  } catch (error: any) {
    console.error("[SignalHouse Templates] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update existing template
export async function PUT(request: NextRequest) {
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
    const body = await request.json();
    const { templateId, name, content } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: "templateId is required" },
        { status: 400 },
      );
    }

    const updates: { name?: string; content?: string } = {};
    if (name) updates.name = name;
    if (content) updates.content = content;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "At least one field (name or content) is required" },
        { status: 400 },
      );
    }

    const result = await editTemplate(templateId, updates);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to update template" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      template: result.data,
    });
  } catch (error: any) {
    console.error("[SignalHouse Templates] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove template
export async function DELETE(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("id");

    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID is required (use ?id=xxx)" },
        { status: 400 },
      );
    }

    const result = await deleteTemplate(templateId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to delete template" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      deleted: templateId,
    });
  } catch (error: any) {
    console.error("[SignalHouse Templates] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper: Extract variables from template content ({{variableName}})
function extractVariables(content: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const variables = new Set<string>();
  let match;
  while ((match = regex.exec(content)) !== null) {
    variables.add(match[1]);
  }
  return Array.from(variables);
}
