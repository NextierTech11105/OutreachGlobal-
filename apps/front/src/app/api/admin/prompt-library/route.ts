import { NextRequest, NextResponse } from "next/server";

// Default prompt templates for the AI SDR system
const DEFAULT_PROMPTS = [
  {
    id: "sms-initial",
    name: "Initial SMS Outreach",
    category: "sms",
    template: "Hi {{firstName}}, this is {{agentName}} with {{company}}. I noticed you own {{propertyAddress}} and wanted to reach out about a potential opportunity. Is now a good time to chat?",
    variables: ["firstName", "agentName", "company", "propertyAddress"],
    active: true,
  },
  {
    id: "sms-followup",
    name: "Follow-up SMS",
    category: "sms",
    template: "Hi {{firstName}}, following up on my previous message. I have some information about {{topic}} that might interest you. Would you like to hear more?",
    variables: ["firstName", "topic"],
    active: true,
  },
  {
    id: "email-intro",
    name: "Introduction Email",
    category: "email",
    template: "Subject: Quick question about {{propertyAddress}}\n\nHi {{firstName}},\n\nI hope this email finds you well. My name is {{agentName}} and I'm reaching out because...",
    variables: ["firstName", "agentName", "propertyAddress"],
    active: true,
  },
  {
    id: "voicemail-script",
    name: "Voicemail Script",
    category: "voice",
    template: "Hi {{firstName}}, this is {{agentName}} calling from {{company}}. I'm reaching out regarding {{topic}}. Please give me a call back at {{callback}} when you have a moment. Thanks!",
    variables: ["firstName", "agentName", "company", "topic", "callback"],
    active: true,
  },
  {
    id: "b2b-intro",
    name: "B2B Introduction",
    category: "b2b",
    template: "Hi {{firstName}}, I noticed {{companyName}} has been doing great work in the {{industry}} space. I'd love to discuss how we can help grow your business. Are you available for a quick call?",
    variables: ["firstName", "companyName", "industry"],
    active: true,
  },
];

// GET /api/admin/prompt-library - List all prompts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    let prompts = DEFAULT_PROMPTS;

    if (category) {
      prompts = prompts.filter(p => p.category === category);
    }

    return NextResponse.json({
      success: true,
      prompts,
      categories: ["sms", "email", "voice", "b2b"],
    });
  } catch (error: any) {
    console.error("[Prompt Library] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch prompts" },
      { status: 500 }
    );
  }
}

// POST /api/admin/prompt-library - Create/update a prompt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, category, template, variables } = body;

    if (!name || !category || !template) {
      return NextResponse.json(
        { error: "name, category, and template are required" },
        { status: 400 }
      );
    }

    // In production, this would save to database
    const newPrompt = {
      id: id || `prompt-${Date.now()}`,
      name,
      category,
      template,
      variables: variables || [],
      active: true,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      prompt: newPrompt,
    });
  } catch (error: any) {
    console.error("[Prompt Library] Error creating prompt:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create prompt" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/prompt-library - Delete a prompt
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const promptId = searchParams.get("id");

    if (!promptId) {
      return NextResponse.json(
        { error: "Prompt ID is required" },
        { status: 400 }
      );
    }

    // In production, this would delete from database
    return NextResponse.json({
      success: true,
      deleted: promptId,
    });
  } catch (error: any) {
    console.error("[Prompt Library] Error deleting prompt:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete prompt" },
      { status: 500 }
    );
  }
}
