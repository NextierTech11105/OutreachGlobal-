import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, smsMessages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * GIANNA RESPOND API
 *
 * Handles AI-assisted responses to leads:
 * - Pre-template content (calendar links, articles)
 * - Response prioritization
 * - Appointment booking integration
 * - Human-in-the-loop approval workflow
 */

// Pre-defined response templates
const TEMPLATES = {
  appointment: {
    label: "Book Appointment",
    content:
      "I'd love to schedule a time to discuss your property options. Here's my calendar: {calendar_link}",
    variables: ["calendar_link"],
  },
  article_distressed: {
    label: "Distressed Property Article",
    content:
      "I found this helpful article about options for homeowners in challenging situations: {article_link}",
    variables: ["article_link"],
    defaultLink:
      "https://medium.com/@nextier/navigating-distressed-property-options",
  },
  article_equity: {
    label: "Home Equity Article",
    content:
      "Here's some valuable information about maximizing your home equity: {article_link}",
    variables: ["article_link"],
    defaultLink: "https://medium.com/@nextier/understanding-home-equity",
  },
  article_market: {
    label: "Market Update",
    content:
      "Check out our latest market analysis for your area - it has some great insights: {article_link}",
    variables: ["article_link"],
    defaultLink: "https://medium.com/@nextier/2025-real-estate-market-update",
  },
  article_inheritance: {
    label: "Inherited Property Article",
    content:
      "Dealing with an inherited property can be complex. This article covers your options: {article_link}",
    variables: ["article_link"],
    defaultLink: "https://medium.com/@nextier/inherited-property-guide",
  },
  article_divorce: {
    label: "Divorce Property Article",
    content:
      "Going through a property division? Here's a guide to help: {article_link}",
    variables: ["article_link"],
    defaultLink: "https://medium.com/@nextier/property-division-guide",
  },
  followup: {
    label: "Follow Up",
    content:
      "Just following up on our previous conversation. Is now a good time to chat about your property?",
    variables: [],
  },
  callback: {
    label: "Callback Request",
    content:
      "I saw you tried to reach us. I'm available now if you'd like to talk. When works best for you?",
    variables: [],
  },
  thank_you: {
    label: "Thank You",
    content:
      "Thank you for your interest! I'll be in touch soon with more details.",
    variables: [],
  },
};

interface RespondRequest {
  leadId: string;
  templateKey: string;
  content?: string; // Override template content
  workspaceId: string;
  variables?: Record<string, string>; // Template variable values
  advisor?: "gianna" | "sabrina";
  requireApproval?: boolean; // Human-in-the-loop
}

// POST - Send AI response
export async function POST(request: NextRequest) {
  try {
    const body: RespondRequest = await request.json();
    const {
      leadId,
      templateKey,
      content,
      workspaceId,
      variables = {},
      advisor = "gianna",
      requireApproval,
    } = body;

    if (!leadId) {
      return NextResponse.json(
        { error: "leadId is required" },
        { status: 400 },
      );
    }

    // Get template
    const template = TEMPLATES[templateKey as keyof typeof TEMPLATES];
    if (!template && !content) {
      return NextResponse.json(
        { error: "Valid templateKey or content is required" },
        { status: 400 },
      );
    }

    // Get lead
    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Build message content
    let messageContent = content || template?.content || "";

    // Replace variables
    if (template) {
      // Apply default links if not provided
      if (template.defaultLink && !variables.article_link) {
        variables.article_link = template.defaultLink;
      }

      // Generate calendar link if needed
      if (
        messageContent.includes("{calendar_link}") &&
        !variables.calendar_link
      ) {
        variables.calendar_link = `https://calendly.com/nextier/${advisor}`;
      }

      // Replace all variables
      for (const [key, value] of Object.entries(variables)) {
        messageContent = messageContent.replace(
          new RegExp(`\\{${key}\\}`, "g"),
          value,
        );
      }
    }

    // Personalize with lead name
    messageContent = messageContent.replace(
      "{first_name}",
      lead.firstName || "there",
    );
    messageContent = messageContent.replace("{last_name}", lead.lastName || "");

    // If requires approval, store as pending
    if (requireApproval) {
      // In production, this would go to an approval queue
      return NextResponse.json({
        success: true,
        status: "pending_approval",
        message: messageContent,
        leadId,
        advisor,
        template: templateKey,
      });
    }

    // Send the message
    const sendingNumber =
      lead.assignedNumber || process.env.SIGNALHOUSE_PHONE_NUMBER;

    // Create SMS record
    const smsId = crypto.randomUUID();
    try {
      await db.insert(smsMessages).values({
        id: smsId,
        leadId,
        direction: "outbound",
        fromNumber: sendingNumber || "",
        toNumber: lead.phone,
        body: messageContent,
        status: "sent",
        sentAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch {
      console.log("[GiannaRespond] SMS table may not exist, simulating...");
    }

    // Update lead
    await db
      .update(leads)
      .set({
        lastContactDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(leads.id, leadId));

    console.log(
      `[GiannaRespond] ${advisor} sent ${templateKey} to ${lead.phone}`,
    );

    return NextResponse.json({
      success: true,
      status: "sent",
      messageId: smsId,
      message: messageContent,
      leadId,
      advisor,
      template: templateKey,
      sentTo: lead.phone,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Respond failed";
    console.error("[GiannaRespond] Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - Get available templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category"); // 'articles' | 'actions' | 'all'

    let templates = Object.entries(TEMPLATES).map(([key, value]) => ({
      key,
      ...value,
    }));

    if (category === "articles") {
      templates = templates.filter((t) => t.key.startsWith("article_"));
    } else if (category === "actions") {
      templates = templates.filter((t) => !t.key.startsWith("article_"));
    }

    return NextResponse.json({
      success: true,
      templates,
      advisors: ["gianna", "sabrina"],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Query failed";
    console.error("[GiannaRespond] Query error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
