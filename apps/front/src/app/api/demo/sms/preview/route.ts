import { NextRequest, NextResponse } from "next/server";

// Template messages for different types
const TEMPLATES: Record<string, string> = {
  opener: "Hey {firstName}, this is Gianna from Nextier. I noticed you're in {industry} in {city} - we help businesses like yours get more qualified leads. Worth a quick chat?",
  followup: "Hi {firstName}! Just following up on my earlier message. I'd love to show you how we've helped other {industry} professionals in {state} grow their business. Free to talk this week?",
  reengagement: "Hey {firstName}, it's been a while! Wanted to check in and see how things are going at {company}. We've got some new tools that might interest you.",
};

function fillTemplate(template: string, lead: Record<string, string>): string {
  return template
    .replace(/{firstName}/g, lead.firstName || "there")
    .replace(/{lastName}/g, lead.lastName || "")
    .replace(/{company}/g, lead.company || "your company")
    .replace(/{city}/g, lead.city || "your area")
    .replace(/{state}/g, lead.state || "")
    .replace(/{industry}/g, lead.industry || "your industry");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadIds = [], leads = [], templateType = "opener", customTemplate } = body;

    // Use provided leads or look them up (for demo, we assume leads are passed)
    const targetLeads = leads.length > 0 ? leads : [];

    if (targetLeads.length === 0 && leadIds.length === 0) {
      return NextResponse.json(
        { error: "No leads provided for preview" },
        { status: 400 }
      );
    }

    const template = customTemplate || TEMPLATES[templateType] || TEMPLATES.opener;

    const previews = targetLeads.slice(0, 10).map((lead: Record<string, string>) => ({
      leadId: lead.id,
      to: lead.phone,
      name: `${lead.firstName} ${lead.lastName}`,
      message: fillTemplate(template, lead),
      characterCount: fillTemplate(template, lead).length,
      segments: Math.ceil(fillTemplate(template, lead).length / 160),
    }));

    const totalMessages = targetLeads.length || leadIds.length;
    const avgSegments = previews.length > 0
      ? previews.reduce((sum, p) => sum + p.segments, 0) / previews.length
      : 1;
    const estimatedCost = totalMessages * avgSegments * 0.0075;

    return NextResponse.json({
      success: true,
      count: totalMessages,
      previews,
      template,
      templateType,
      estimatedCost,
      avgSegments,
    });
  } catch (error) {
    console.error("[Demo SMS Preview] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to preview SMS" },
      { status: 500 }
    );
  }
}
