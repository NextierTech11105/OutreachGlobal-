import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { teams } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";

/**
 * Get team by ID or slug - direct database query
 * Bypasses GraphQL for reliability
 */
export const getTeam = cache(async (idOrSlug: string) => {
  try {
    if (!db) {
      console.error("[getTeam] Database not configured");
      notFound();
    }

    // Query by ID or slug
    const result = await db
      .select({
        id: teams.id,
        name: teams.name,
        slug: teams.slug,
      })
      .from(teams)
      .where(or(eq(teams.id, idOrSlug), eq(teams.slug, idOrSlug)))
      .limit(1);

    if (result.length === 0) {
      console.warn(`[getTeam] Team not found for: ${idOrSlug}`);
      notFound();
    }

    return result[0];
  } catch (error) {
    console.error(`[getTeam] Error fetching team ${idOrSlug}:`, error);
    notFound();
  }
});
