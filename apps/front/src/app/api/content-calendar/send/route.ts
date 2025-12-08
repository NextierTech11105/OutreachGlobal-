import { NextRequest, NextResponse } from "next/server";

// Content Calendar - Weekly Send Processor
// Gianna sends scheduled Medium articles via SMS
// Sample: "This is Gianna with NEXTIER Technologies. Can I share the article our founder wrote... what's your best email?"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://monkfish-app-mb7h3.ondigitalocean.app";
const SIGNALHOUSE_API_KEY = process.env.SIGNALHOUSE_API_KEY || "";
const FROM_NUMBER = process.env.SIGNALHOUSE_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER || "";

interface ContentToSend {
  id: string;
  title: string;
  url: string;
  description?: string;
}

interface LeadToSMS {
  phone: string;
  firstName?: string;
  companyName?: string;
  leadId?: string;
}

// Gianna's article share templates
const ARTICLE_TEMPLATES = [
  {
    id: "founder_article",
    message: (firstName: string, articleTitle: string) =>
      `Hey${firstName ? ` ${firstName}` : ""}! This is Gianna with NEXTIER Technologies. Our founder just wrote an article I think you'd find valuable - "${articleTitle}". What's your best email so I can send it over?`,
  },
  {
    id: "quick_share",
    message: (firstName: string, articleTitle: string) =>
      `${firstName ? `${firstName}, ` : ""}quick question - would you like me to send over our latest article on "${articleTitle}"? Just drop your email and I'll shoot it right over! - Gianna`,
  },
  {
    id: "thought_leadership",
    message: (firstName: string, articleTitle: string) =>
      `Hi${firstName ? ` ${firstName}` : ""}! Gianna here from NEXTIER. We just published "${articleTitle}" and I immediately thought of you. Mind if I email it over? What address works best?`,
  },
  {
    id: "value_first",
    message: (firstName: string, articleTitle: string, description?: string) =>
      `Hey${firstName ? ` ${firstName}` : ""}! ${description || "Got something valuable to share"} - our new article "${articleTitle}". Want me to send it to your inbox? - Gianna @ NEXTIER`,
  },
];

// Send SMS via SignalHouse
async function sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!SIGNALHOUSE_API_KEY) {
    console.warn("[Content Send] SignalHouse not configured");
    return { success: false, error: "SMS not configured" };
  }

  try {
    const response = await fetch("https://api.signalhouse.io/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SIGNALHOUSE_API_KEY}`,
      },
      body: JSON.stringify({
        to,
        text: message,
        from: FROM_NUMBER,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, messageId: data.id || data.messageId };
    }
    return { success: false, error: data.error || "Send failed" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

// POST - Send article to lead list
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      contentId,
      content, // Direct content object if not using calendar
      leads, // Array of { phone, firstName, companyName, leadId }
      templateId = "founder_article",
      testMode = false, // If true, returns messages without sending
    } = body;

    // Get content details
    let articleContent: ContentToSend;

    if (content) {
      articleContent = content;
    } else if (contentId) {
      // Fetch from calendar
      const calendarResponse = await fetch(`${APP_URL}/api/content-calendar?view=upcoming`);
      const calendarData = await calendarResponse.json();
      const found = calendarData.upcoming?.find((c: { id: string }) => c.id === contentId);
      if (!found) {
        return NextResponse.json({ error: "Content not found in calendar" }, { status: 404 });
      }
      articleContent = found;
    } else {
      return NextResponse.json({
        error: "contentId or content object required",
        example: {
          content: {
            id: "article-1",
            title: "5 Ways to Maximize Property Value",
            url: "https://medium.com/@nextier/article",
            description: "Quick tips for homeowners",
          },
          leads: [
            { phone: "+13055551234", firstName: "John" },
          ],
          templateId: "founder_article",
        },
      }, { status: 400 });
    }

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: "leads array required" }, { status: 400 });
    }

    // Get template
    const template = ARTICLE_TEMPLATES.find(t => t.id === templateId) || ARTICLE_TEMPLATES[0];

    // Prepare messages
    const messages = leads.map((lead: LeadToSMS) => ({
      phone: lead.phone,
      firstName: lead.firstName,
      message: template.message(
        lead.firstName || "",
        articleContent.title,
        articleContent.description
      ),
      leadId: lead.leadId,
    }));

    // Test mode - return without sending
    if (testMode) {
      return NextResponse.json({
        success: true,
        testMode: true,
        content: articleContent,
        template: templateId,
        messages: messages.slice(0, 5), // Show first 5
        totalRecipients: messages.length,
      });
    }

    // Send messages
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process in batches of 10 with delay
    const batchSize = 10;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (msg: { phone: string; message: string }) => {
          const result = await sendSMS(msg.phone, msg.message);
          if (result.success) {
            results.sent++;
          } else {
            results.failed++;
            results.errors.push(`${msg.phone}: ${result.error}`);
          }
          return result;
        })
      );

      // Small delay between batches
      if (i + batchSize < messages.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    console.log(`[Content Send] Sent "${articleContent.title}" to ${results.sent}/${messages.length} leads`);

    return NextResponse.json({
      success: true,
      content: articleContent,
      stats: {
        total: messages.length,
        sent: results.sent,
        failed: results.failed,
      },
      errors: results.errors.length > 0 ? results.errors.slice(0, 10) : undefined,
    });
  } catch (error) {
    console.error("[Content Send] Error:", error);
    const message = error instanceof Error ? error.message : "Send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - Get available templates
export async function GET() {
  return NextResponse.json({
    templates: ARTICLE_TEMPLATES.map(t => ({
      id: t.id,
      preview: t.message("{firstName}", "{articleTitle}", "{description}"),
    })),
    usage: "POST with { content: {...}, leads: [...], templateId: 'founder_article' }",
  });
}
