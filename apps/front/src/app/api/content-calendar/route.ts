import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { scheduledContent } from "@/lib/db/schema";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";

/**
 * Content Calendar Engine
 * - Schedule Medium articles 3+ months out
 * - Auto-SMS articles weekly to lead lists
 * - Track engagement and clicks
 *
 * Uses scheduledContent table for persistence.
 */

function getWeekKey(date: Date): string {
  const year = date.getFullYear();
  const week = Math.ceil(
    (date.getDate() + new Date(year, date.getMonth(), 1).getDay()) / 7
  );
  return `${year}-W${week.toString().padStart(2, "0")}`;
}

// POST - Add content to calendar
export async function POST(request: NextRequest) {
  try {
    const { userId, teamId } = await apiAuth();
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
        { status: 400 }
      );
    }

    // Validate publish date is in the future
    const pubDate = new Date(publishDate);
    if (pubDate < new Date()) {
      return NextResponse.json(
        { error: "publishDate must be in the future" },
        { status: 400 }
      );
    }

    const id = `content_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await db.insert(scheduledContent).values({
      id,
      teamId: teamId || "default",
      userId,
      title,
      url,
      description,
      publishDate: pubDate,
      status: "scheduled",
      channel,
      targetAudience,
      customListId,
      tags,
    });

    // Get the inserted content
    const [content] = await db
      .select()
      .from(scheduledContent)
      .where(eq(scheduledContent.id, id))
      .limit(1);

    const weekKey = getWeekKey(pubDate);

    console.log(
      `[Content Calendar] Scheduled "${title}" for ${publishDate} (${weekKey})`
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
      { status: 500 }
    );
  }
}

// GET - Get calendar view or upcoming content
export async function GET(request: NextRequest) {
  try {
    const { userId, teamId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view") || "upcoming"; // "upcoming", "calendar", "week"
    const weekKey = searchParams.get("week");
    const months = parseInt(searchParams.get("months") || "3");

    // Query all content for this user/team
    const allContent = await db
      .select()
      .from(scheduledContent)
      .where(
        and(
          eq(scheduledContent.teamId, teamId || "default"),
          eq(scheduledContent.userId, userId)
        )
      )
      .orderBy(asc(scheduledContent.publishDate));

    if (view === "week" && weekKey) {
      // Get content for specific week by filtering in memory
      // (since weekKey is computed, not stored)
      const weekContent = allContent.filter((c) => {
        const pubDate = new Date(c.publishDate);
        return getWeekKey(pubDate) === weekKey;
      });

      return NextResponse.json({
        week: weekKey,
        content: weekContent,
        count: weekContent.length,
      });
    }

    if (view === "calendar") {
      // Group by week for calendar view
      const calendar: Record<string, typeof allContent> = {};
      const now = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + months);

      for (const content of allContent) {
        const pubDate = new Date(content.publishDate);
        if (pubDate >= now && pubDate <= endDate) {
          const wKey = getWeekKey(pubDate);
          if (!calendar[wKey]) calendar[wKey] = [];
          calendar[wKey].push(content);
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
      { status: 500 }
    );
  }
}

// PATCH - Update scheduled content
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const [content] = await db
      .select()
      .from(scheduledContent)
      .where(eq(scheduledContent.id, id))
      .limit(1);

    if (!content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    if (content.userId !== userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Build update object
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.title) updateData.title = updates.title;
    if (updates.url) updateData.url = updates.url;
    if (updates.description) updateData.description = updates.description;
    if (updates.publishDate)
      updateData.publishDate = new Date(updates.publishDate);
    if (updates.status) updateData.status = updates.status;
    if (updates.channel) updateData.channel = updates.channel;
    if (updates.targetAudience)
      updateData.targetAudience = updates.targetAudience;
    if (updates.customListId) updateData.customListId = updates.customListId;
    if (updates.tags) updateData.tags = updates.tags;

    await db
      .update(scheduledContent)
      .set(updateData)
      .where(eq(scheduledContent.id, id));

    // Get updated content
    const [updatedContent] = await db
      .select()
      .from(scheduledContent)
      .where(eq(scheduledContent.id, id))
      .limit(1);

    return NextResponse.json({
      success: true,
      content: updatedContent,
    });
  } catch (error) {
    console.error("[Content Calendar] Error:", error);
    return NextResponse.json(
      { error: "Failed to update content" },
      { status: 500 }
    );
  }
}

// DELETE - Remove from calendar
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const [content] = await db
      .select()
      .from(scheduledContent)
      .where(eq(scheduledContent.id, id))
      .limit(1);

    if (!content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    if (content.userId !== userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    await db.delete(scheduledContent).where(eq(scheduledContent.id, id));

    return NextResponse.json({
      success: true,
      deleted: id,
    });
  } catch (error) {
    console.error("[Content Calendar] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete content" },
      { status: 500 }
    );
  }
}
