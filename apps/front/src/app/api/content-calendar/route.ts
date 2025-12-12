import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// Content Calendar Engine
// - Schedule Medium articles 3+ months out
// - Auto-SMS articles weekly to lead lists
// - Track engagement and clicks

interface ScheduledContent {
  id: string;
  title: string;
  url: string; // Medium article URL
  description?: string;
  publishDate: string; // ISO date when it should be sent
  status: "draft" | "scheduled" | "sent" | "failed";
  channel: "sms" | "email" | "both";
  targetAudience?: "all" | "property" | "b2b" | "custom";
  customListId?: string;
  // Tracking
  sentAt?: string;
  recipientCount?: number;
  clickCount?: number;
  // Metadata
  createdAt: string;
  createdBy: string;
  tags?: string[];
}

// In-memory calendar (would be DB in production)
const contentCalendar: Map<string, ScheduledContent> = new Map();

// Weekly send tracking
const weeklySchedule = new Map<string, string[]>(); // weekKey -> content IDs

function getWeekKey(date: Date): string {
  const year = date.getFullYear();
  const week = Math.ceil(
    (date.getDate() + new Date(year, date.getMonth(), 1).getDay()) / 7,
  );
  return `${year}-W${week.toString().padStart(2, "0")}`;
}

// POST - Add content to calendar
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      url,
      description,
      publishDate,
      channel = "sms",
      targetAudience = "all",
      customListId,
      tags,
    } = body;

    if (!title || !url || !publishDate) {
      return NextResponse.json(
        {
          error: "title, url, and publishDate required",
          example: {
            title: "5 Ways to Maximize Your Property Value",
            url: "https://medium.com/@yourcompany/article-slug",
            description: "Quick tips for homeowners",
            publishDate: "2025-03-15",
            channel: "sms",
            targetAudience: "property",
          },
        },
        { status: 400 },
      );
    }

    // Validate publish date is in the future
    const pubDate = new Date(publishDate);
    if (pubDate < new Date()) {
      return NextResponse.json(
        { error: "publishDate must be in the future" },
        { status: 400 },
      );
    }

    const content: ScheduledContent = {
      id: `content_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title,
      url,
      description,
      publishDate,
      status: "scheduled",
      channel,
      targetAudience,
      customListId,
      tags,
      createdAt: new Date().toISOString(),
      createdBy: userId,
    };

    contentCalendar.set(content.id, content);

    // Add to weekly schedule
    const weekKey = getWeekKey(pubDate);
    const weekContent = weeklySchedule.get(weekKey) || [];
    weekContent.push(content.id);
    weeklySchedule.set(weekKey, weekContent);

    console.log(
      `[Content Calendar] Scheduled "${title}" for ${publishDate} (${weekKey})`,
    );

    return NextResponse.json({
      success: true,
      content,
      weekKey,
    });
  } catch (error) {
    console.error("[Content Calendar] Error:", error);
    return NextResponse.json(
      { error: "Failed to schedule content" },
      { status: 500 },
    );
  }
}

// GET - Get calendar view or upcoming content
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view") || "upcoming"; // "upcoming", "calendar", "week"
    const weekKey = searchParams.get("week");
    const months = parseInt(searchParams.get("months") || "3");

    // All content for this user
    const allContent = Array.from(contentCalendar.values())
      .filter((c) => c.createdBy === userId)
      .sort(
        (a, b) =>
          new Date(a.publishDate).getTime() - new Date(b.publishDate).getTime(),
      );

    if (view === "week" && weekKey) {
      // Get content for specific week
      const weekContentIds = weeklySchedule.get(weekKey) || [];
      const weekContent = weekContentIds
        .map((id) => contentCalendar.get(id))
        .filter(Boolean) as ScheduledContent[];

      return NextResponse.json({
        week: weekKey,
        content: weekContent,
        count: weekContent.length,
      });
    }

    if (view === "calendar") {
      // Group by week for calendar view
      const calendar: Record<string, ScheduledContent[]> = {};
      const now = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + months);

      for (const content of allContent) {
        const pubDate = new Date(content.publishDate);
        if (pubDate >= now && pubDate <= endDate) {
          const weekKey = getWeekKey(pubDate);
          if (!calendar[weekKey]) calendar[weekKey] = [];
          calendar[weekKey].push(content);
        }
      }

      return NextResponse.json({
        calendar,
        monthsAhead: months,
        totalScheduled: Object.values(calendar).flat().length,
      });
    }

    // Default: upcoming content
    const now = new Date();
    const upcoming = allContent.filter((c) => new Date(c.publishDate) >= now);

    return NextResponse.json({
      upcoming: upcoming.slice(0, 20),
      total: upcoming.length,
      nextSend: upcoming[0] || null,
    });
  } catch (error) {
    console.error("[Content Calendar] Error:", error);
    return NextResponse.json(
      { error: "Failed to get calendar" },
      { status: 500 },
    );
  }
}

// PATCH - Update scheduled content
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const content = contentCalendar.get(id);
    if (!content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    if (content.createdBy !== userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Update fields
    const updatedContent = {
      ...content,
      ...updates,
      id: content.id, // Don't allow ID change
      createdBy: content.createdBy,
      createdAt: content.createdAt,
    };

    contentCalendar.set(id, updatedContent);

    return NextResponse.json({
      success: true,
      content: updatedContent,
    });
  } catch (error) {
    console.error("[Content Calendar] Error:", error);
    return NextResponse.json(
      { error: "Failed to update content" },
      { status: 500 },
    );
  }
}

// DELETE - Remove from calendar
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const content = contentCalendar.get(id);
    if (!content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    if (content.createdBy !== userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    contentCalendar.delete(id);

    // Remove from weekly schedule
    const weekKey = getWeekKey(new Date(content.publishDate));
    const weekContent = weeklySchedule.get(weekKey) || [];
    weeklySchedule.set(
      weekKey,
      weekContent.filter((cid) => cid !== id),
    );

    return NextResponse.json({
      success: true,
      deleted: id,
    });
  } catch (error) {
    console.error("[Content Calendar] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete content" },
      { status: 500 },
    );
  }
}
