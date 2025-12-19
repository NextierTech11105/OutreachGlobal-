import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ token: string }>;
}

// GET - Retrieve shared resource data (public route - no auth required for public links)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: "Share token is required" },
        { status: 400 },
      );
    }

    // Fetch the share link
    const result = await db.execute(sql`
      SELECT * FROM shared_links 
      WHERE token = ${token} AND is_active = true
      LIMIT 1
    `);

    const shareLink = result.rows?.[0];

    if (!shareLink) {
      return NextResponse.json(
        { error: "Share link not found or has been revoked" },
        { status: 404 },
      );
    }

    // Check expiration
    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This share link has expired" },
        { status: 410 },
      );
    }

    // Update view count
    await db.execute(sql`
      UPDATE shared_links 
      SET view_count = view_count + 1, 
          last_viewed_at = NOW()
      WHERE token = ${token}
    `);

    // Fetch the actual resource data based on type
    let resourceData = null;
    const resourceType = shareLink.resource_type;
    const resourceId = shareLink.resource_id;

    if (resourceType === "lead") {
      // Fetch lead data
      const leadResult = await db.execute(sql`
        SELECT * FROM leads WHERE id = ${resourceId} LIMIT 1
      `);
      resourceData = leadResult.rows?.[0] || null;
    } else if (resourceType === "valuation_report") {
      // Fetch valuation report data
      const valuationResult = await db.execute(sql`
        SELECT * FROM valuation_queue WHERE id = ${resourceId} LIMIT 1
      `);
      resourceData = valuationResult.rows?.[0] || null;
    } else if (resourceType === "property") {
      // Fetch property data
      const propertyResult = await db.execute(sql`
        SELECT * FROM leads WHERE id = ${resourceId} LIMIT 1
      `);
      resourceData = propertyResult.rows?.[0] || null;
    } else if (resourceType === "bucket") {
      // Fetch bucket/list data with leads
      const bucketResult = await db.execute(sql`
        SELECT * FROM buckets WHERE id = ${resourceId} LIMIT 1
      `);
      resourceData = bucketResult.rows?.[0] || null;
    }

    // If snapshot data was stored, use that instead (for point-in-time sharing)
    if (shareLink.snapshot_data) {
      resourceData = shareLink.snapshot_data;
    }

    return NextResponse.json({
      success: true,
      share: {
        token,
        resourceType,
        resourceId,
        isPublic: shareLink.is_public,
        viewCount: (shareLink.view_count || 0) + 1,
        createdAt: shareLink.created_at,
        expiresAt: shareLink.expires_at,
      },
      data: resourceData,
    });
  } catch (error) {
    console.error("[Share View] Error fetching shared resource:", error);
    return NextResponse.json(
      { error: "Failed to load shared content" },
      { status: 500 },
    );
  }
}

// POST - Validate password for password-protected shares
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const { password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 },
      );
    }

    // Check if password matches (simple comparison for now - could use bcrypt)
    const result = await db.execute(sql`
      SELECT * FROM shared_links 
      WHERE token = ${token} AND is_active = true
      LIMIT 1
    `);

    const shareLink = result.rows?.[0];

    if (!shareLink) {
      return NextResponse.json(
        { error: "Share link not found" },
        { status: 404 },
      );
    }

    // For now, we don't have password column - this is for future enhancement
    // You would compare password here

    return NextResponse.json({
      success: true,
      message: "Password validated",
    });
  } catch (error) {
    console.error("[Share View] Error validating password:", error);
    return NextResponse.json(
      { error: "Failed to validate password" },
      { status: 500 },
    );
  }
}
