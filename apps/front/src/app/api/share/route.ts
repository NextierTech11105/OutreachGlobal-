import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiAuth } from "@/lib/api-auth";
import { nanoid } from "nanoid";
import { sql, eq, and, desc } from "drizzle-orm";

// Since the front-end doesn't have the shared_links table yet, we'll create it inline
// This will be migrated to proper schema later

/**
 * Share API - Create shareable links for leads, valuation reports, properties
 *
 * POST /api/share - Create a new share link
 * GET /api/share - List all share links created by the user/team
 */

// Generate a short, URL-safe token
function generateShareToken(): string {
  return nanoid(12); // 12 chars = billions of combinations, URL safe
}

export async function POST(request: NextRequest) {
  try {
    const { userId, teamId } = await apiAuth();
    if (!userId || !teamId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      resourceType,
      resourceId,
      isPublic = false,
      requireAuth = true,
      expiresInHours,
      allowedEmails,
      snapshotData,
    } = body;

    // Validate required fields
    if (!resourceType || !resourceId) {
      return NextResponse.json(
        { error: "Missing required fields: resourceType, resourceId" },
        { status: 400 },
      );
    }

    // Validate resource type
    const validTypes = [
      "lead",
      "valuation_report",
      "property",
      "bucket",
      "campaign",
    ];
    if (!validTypes.includes(resourceType)) {
      return NextResponse.json(
        {
          error: `Invalid resourceType. Must be one of: ${validTypes.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Generate unique token
    const token = generateShareToken();

    // Calculate expiration if specified
    let expiresAt = null;
    if (expiresInHours && expiresInHours > 0) {
      expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    }

    // Ensure shared_links table exists (create if not)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS shared_links (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL,
        created_by TEXT,
        resource_type TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        allowed_emails TEXT[],
        allowed_user_ids TEXT[],
        is_public BOOLEAN DEFAULT false,
        require_auth BOOLEAN DEFAULT true,
        expires_at TIMESTAMP,
        view_count INTEGER DEFAULT 0,
        last_viewed_at TIMESTAMP,
        last_viewed_by TEXT,
        snapshot_data JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create index if not exists
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS shared_links_token_idx ON shared_links(token)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS shared_links_resource_idx ON shared_links(resource_type, resource_id)
    `);

    // Generate share link ID
    const id = `shl_${nanoid(24)}`;

    // Insert the share link
    await db.execute(sql`
      INSERT INTO shared_links (id, team_id, created_by, resource_type, resource_id, token, 
        allowed_emails, is_public, require_auth, expires_at, snapshot_data, is_active)
      VALUES (
        ${id}, 
        ${teamId}, 
        ${userId}, 
        ${resourceType}, 
        ${resourceId}, 
        ${token},
        ${
          allowedEmails
            ? sql`ARRAY[${sql.join(
                allowedEmails.map((e: string) => sql`${e}`),
                sql`, `,
              )}]::TEXT[]`
            : sql`NULL`
        },
        ${isPublic},
        ${requireAuth},
        ${expiresAt},
        ${snapshotData ? JSON.stringify(snapshotData) : null}::jsonb,
        true
      )
    `);

    // Build the shareable URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.nextier.io";
    const shareUrl = `${baseUrl}/share/${token}`;

    return NextResponse.json({
      success: true,
      shareLink: {
        id,
        token,
        url: shareUrl,
        resourceType,
        resourceId,
        isPublic,
        requireAuth,
        expiresAt,
        createdAt: new Date().toISOString(),
      },
      message: "Share link created successfully",
    });
  } catch (error) {
    console.error("Error creating share link:", error);
    return NextResponse.json(
      { error: "Failed to create share link", details: String(error) },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId, teamId } = await apiAuth();
    if (!userId || !teamId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const resourceType = searchParams.get("resourceType");
    const resourceId = searchParams.get("resourceId");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Build query
    let query = sql`
      SELECT * FROM shared_links 
      WHERE team_id = ${teamId} AND is_active = true
    `;

    if (resourceType) {
      query = sql`${query} AND resource_type = ${resourceType}`;
    }

    if (resourceId) {
      query = sql`${query} AND resource_id = ${resourceId}`;
    }

    query = sql`${query} ORDER BY created_at DESC LIMIT ${limit}`;

    const result = await db.execute(query);

    // Build URLs for each link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.nextier.io";
    const links = (result.rows || []).map((row: any) => ({
      id: row.id,
      token: row.token,
      url: `${baseUrl}/share/${row.token}`,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      isPublic: row.is_public,
      requireAuth: row.require_auth,
      expiresAt: row.expires_at,
      viewCount: row.view_count,
      lastViewedAt: row.last_viewed_at,
      createdAt: row.created_at,
    }));

    return NextResponse.json({
      success: true,
      links,
      total: links.length,
    });
  } catch (error) {
    console.error("Error fetching share links:", error);
    return NextResponse.json(
      { error: "Failed to fetch share links", details: String(error) },
      { status: 500 },
    );
  }
}

// DELETE - Revoke a share link
export async function DELETE(request: NextRequest) {
  try {
    const { userId, teamId } = await apiAuth();
    if (!userId || !teamId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get("id");
    const token = searchParams.get("token");

    if (!linkId && !token) {
      return NextResponse.json(
        { error: "Must provide id or token to delete" },
        { status: 400 },
      );
    }

    // Soft delete - set is_active to false
    if (linkId) {
      await db.execute(sql`
        UPDATE shared_links 
        SET is_active = false, updated_at = NOW()
        WHERE id = ${linkId} AND team_id = ${teamId}
      `);
    } else if (token) {
      await db.execute(sql`
        UPDATE shared_links 
        SET is_active = false, updated_at = NOW()
        WHERE token = ${token} AND team_id = ${teamId}
      `);
    }

    return NextResponse.json({
      success: true,
      message: "Share link revoked",
    });
  } catch (error) {
    console.error("Error revoking share link:", error);
    return NextResponse.json(
      { error: "Failed to revoke share link", details: String(error) },
      { status: 500 },
    );
  }
}
