import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { savedSearches, savedSearchPropertyIds, propertyChangeEvents } from "@/lib/db/schema";
import { realEstateApi, type PropertySearchQuery } from "@/lib/services/real-estate-api";
import { eq, and } from "drizzle-orm";

// GET - List all saved searches or get one by ID
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");
  const userId = searchParams.get("userId");

  try {
    if (id) {
      const [search] = await db
        .select()
        .from(savedSearches)
        .where(eq(savedSearches.id, id));

      if (!search) {
        return NextResponse.json({ error: "Saved search not found" }, { status: 404 });
      }

      // Get property IDs
      const propertyIds = await db
        .select({ propertyId: savedSearchPropertyIds.propertyId })
        .from(savedSearchPropertyIds)
        .where(
          and(
            eq(savedSearchPropertyIds.savedSearchId, id),
            eq(savedSearchPropertyIds.isActive, true)
          )
        );

      return NextResponse.json({
        ...search,
        propertyIds: propertyIds.map((p: { propertyId: string }) => p.propertyId),
      });
    }

    if (userId) {
      const searches = await db
        .select()
        .from(savedSearches)
        .where(eq(savedSearches.userId, userId));

      return NextResponse.json({ data: searches, count: searches.length });
    }

    // Return all searches (admin)
    const searches = await db.select().from(savedSearches);
    return NextResponse.json({ data: searches, count: searches.length });
  } catch (error) {
    console.error("Get saved searches error:", error);
    return NextResponse.json(
      { error: "Failed to get saved searches", details: String(error) },
      { status: 500 }
    );
  }
}

// POST - Create a new saved search and capture IDs
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, description, query, notifyOnChanges } = body;

    if (!userId || !name || !query) {
      return NextResponse.json(
        { error: "userId, name, and query are required" },
        { status: 400 }
      );
    }

    // Run the search to get count and IDs
    const { count, ids } = await realEstateApi.runSavedSearchForIds(query as PropertySearchQuery);

    // Create the saved search
    const [newSearch] = await db
      .insert(savedSearches)
      .values({
        userId,
        name,
        description: description || null,
        query,
        resultCount: count,
        notifyOnChanges: notifyOnChanges || false,
        lastRunAt: new Date(),
      })
      .returning();

    // Store the property IDs
    if (ids.length > 0) {
      const idRecords = ids.map((propertyId) => ({
        savedSearchId: newSearch.id,
        propertyId,
      }));

      // Batch insert in chunks of 1000
      for (let i = 0; i < idRecords.length; i += 1000) {
        await db.insert(savedSearchPropertyIds).values(idRecords.slice(i, i + 1000));
      }
    }

    return NextResponse.json({
      ...newSearch,
      propertyIds: ids,
      message: `Saved search created with ${ids.length} properties`,
    });
  } catch (error) {
    console.error("Create saved search error:", error);
    return NextResponse.json(
      { error: "Failed to create saved search", details: String(error) },
      { status: 500 }
    );
  }
}

// PUT - Re-run a saved search and detect changes
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, query, notifyOnChanges, refresh } = body;

    if (!id) {
      return NextResponse.json({ error: "Search ID required" }, { status: 400 });
    }

    // Get existing search
    const [existingSearch] = await db
      .select()
      .from(savedSearches)
      .where(eq(savedSearches.id, id));

    if (!existingSearch) {
      return NextResponse.json({ error: "Saved search not found" }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (query) updateData.query = query;
    if (notifyOnChanges !== undefined) updateData.notifyOnChanges = notifyOnChanges;

    let changes = null;

    // If refresh requested or query changed, re-run the search
    if (refresh || query) {
      const searchQuery = (query || existingSearch.query) as PropertySearchQuery;
      const { count, ids: currentIds } = await realEstateApi.runSavedSearchForIds(searchQuery);

      // Get previous IDs
      const previousIdsResult = await db
        .select({ propertyId: savedSearchPropertyIds.propertyId })
        .from(savedSearchPropertyIds)
        .where(
          and(
            eq(savedSearchPropertyIds.savedSearchId, id),
            eq(savedSearchPropertyIds.isActive, true)
          )
        );
      const previousIds = previousIdsResult.map((r: { propertyId: string }) => r.propertyId);

      // Detect changes
      changes = realEstateApi.detectChanges(previousIds, currentIds);

      // Log change events
      if (changes.added.length > 0 || changes.removed.length > 0) {
        const changeEventRecords = [
          ...changes.added.map((propertyId) => ({
            savedSearchId: id,
            propertyId,
            eventType: "added" as const,
          })),
          ...changes.removed.map((propertyId) => ({
            savedSearchId: id,
            propertyId,
            eventType: "removed" as const,
          })),
        ];

        // Batch insert change events
        for (let i = 0; i < changeEventRecords.length; i += 1000) {
          await db.insert(propertyChangeEvents).values(changeEventRecords.slice(i, i + 1000));
        }
      }

      // Mark removed IDs as inactive
      if (changes.removed.length > 0) {
        for (const removedId of changes.removed) {
          await db
            .update(savedSearchPropertyIds)
            .set({ isActive: false, removedAt: new Date() })
            .where(
              and(
                eq(savedSearchPropertyIds.savedSearchId, id),
                eq(savedSearchPropertyIds.propertyId, removedId)
              )
            );
        }
      }

      // Add new IDs
      if (changes.added.length > 0) {
        const newIdRecords = changes.added.map((propertyId) => ({
          savedSearchId: id,
          propertyId,
        }));
        for (let i = 0; i < newIdRecords.length; i += 1000) {
          await db.insert(savedSearchPropertyIds).values(newIdRecords.slice(i, i + 1000));
        }
      }

      updateData.resultCount = count;
      updateData.lastRunAt = new Date();
    }

    // Update the search
    const [updatedSearch] = await db
      .update(savedSearches)
      .set(updateData)
      .where(eq(savedSearches.id, id))
      .returning();

    const response: Record<string, unknown> = { ...updatedSearch };
    if (changes) {
      response.changes = {
        addedCount: changes.added.length,
        removedCount: changes.removed.length,
        unchangedCount: changes.unchanged.length,
        addedIds: changes.added.slice(0, 100),
        removedIds: changes.removed.slice(0, 100),
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Update saved search error:", error);
    return NextResponse.json(
      { error: "Failed to update saved search", details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE - Remove a saved search
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Search ID required" }, { status: 400 });
  }

  try {
    // CASCADE will handle related records
    await db.delete(savedSearches).where(eq(savedSearches.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete saved search error:", error);
    return NextResponse.json(
      { error: "Failed to delete saved search", details: String(error) },
      { status: 500 }
    );
  }
}
