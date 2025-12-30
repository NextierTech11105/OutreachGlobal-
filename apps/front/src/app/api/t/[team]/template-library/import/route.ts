import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { templateLibrary } from "@/lib/db/schema";

interface TemplateImport {
  name: string;
  content: string;
  category: string;
  stage?: string;
  agent?: string;
  mergeFields?: string[];
}

// POST /api/t/[team]/template-library/import - Bulk import templates
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ team: string }> },
) {
  try {
    const { team: teamId } = await params;
    const body = await request.json();

    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 },
      );
    }

    const { templates, source } = body as {
      templates: TemplateImport[];
      source?: string; // 'atlantic-coast', 'csv', 'json'
    };

    if (!templates || !Array.isArray(templates) || templates.length === 0) {
      return NextResponse.json(
        { error: "templates array is required and must not be empty" },
        { status: 400 },
      );
    }

    // Validate each template
    const errors: string[] = [];
    templates.forEach((t, i) => {
      if (!t.name) errors.push(`Template ${i + 1}: name is required`);
      if (!t.content) errors.push(`Template ${i + 1}: content is required`);
      if (!t.category) errors.push(`Template ${i + 1}: category is required`);
    });

    if (errors.length > 0) {
      return NextResponse.json(
        { error: "Validation errors", details: errors },
        { status: 400 },
      );
    }

    // Generate IDs and prepare for insert
    const now = new Date();
    const templatesWithIds = templates.map((t, i) => ({
      id: `tpl_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 5)}`,
      teamId,
      name: t.name,
      content: t.content,
      category: t.category,
      stage: t.stage || null,
      agent: t.agent || null,
      mergeFields: t.mergeFields || extractMergeFields(t.content),
      status: "active",
      sendCount: 0,
      responseCount: 0,
      conversionCount: 0,
      createdAt: now,
      updatedAt: now,
    }));

    // Bulk insert
    const inserted = await db
      .insert(templateLibrary)
      .values(templatesWithIds)
      .returning();

    return NextResponse.json(
      {
        success: true,
        message: `Successfully imported ${inserted.length} templates`,
        data: inserted,
        count: inserted.length,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Import templates error:", error);
    return NextResponse.json(
      { error: "Failed to import templates", details: String(error) },
      { status: 500 },
    );
  }
}

// Helper function to extract merge fields from template content
function extractMergeFields(content: string): string[] {
  const regex = /\{([^}]+)\}/g;
  const fields: string[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    const field = match[1].trim();
    if (!fields.includes(field)) {
      fields.push(field);
    }
  }

  return fields;
}
