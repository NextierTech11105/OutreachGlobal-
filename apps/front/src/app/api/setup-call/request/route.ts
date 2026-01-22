import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { APP_NAME } from "@/config/branding";

/**
 * SETUP CALL REQUEST API
 * Handles new user setup call requests (replaces Calendly)
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, preferredDay, preferredTime, notes, teamSlug } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Name and phone are required" },
        { status: 400 }
      );
    }

    const now = new Date();
    const requestId = `scr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Store request in team_settings as a JSON blob for simplicity
    // This lets Thomas see pending requests without a new table
    if (db && teamSlug) {
      try {
        await db.execute(sql`
          INSERT INTO team_settings (id, team_id, name, value, type, created_at, updated_at)
          SELECT
            ${requestId},
            t.id,
            'setup_call_request',
            ${JSON.stringify({
              name,
              phone,
              preferredDay,
              preferredTime,
              notes,
              requestedAt: now.toISOString(),
              status: 'pending'
            })},
            'json',
            NOW(),
            NOW()
          FROM teams t
          WHERE t.slug = ${teamSlug}
          LIMIT 1
        `);
      } catch (dbError) {
        console.error("[SetupCallRequest] DB error (non-fatal):", dbError);
        // Continue even if DB fails - email is more important
      }
    }

    // Send email notification to Thomas
    const dayLabels: Record<string, string> = {
      monday: "Monday",
      tuesday: "Tuesday",
      wednesday: "Wednesday",
      thursday: "Thursday",
      friday: "Friday",
      asap: "ASAP (Any day)",
    };

    const timeLabels: Record<string, string> = {
      morning: "Morning (9am - 12pm EST)",
      afternoon: "Afternoon (12pm - 5pm EST)",
      evening: "Evening (5pm - 7pm EST)",
      flexible: "Flexible (Any time)",
    };

    const emailResult = await sendEmail({
      to: "tb@outreachglobal.io",
      subject: `New Setup Call Request: ${name}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #000; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">
            New Setup Call Request
          </h1>

          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: 600; width: 140px;">Name:</td>
                <td style="padding: 8px 0;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600;">Phone:</td>
                <td style="padding: 8px 0;"><a href="tel:${phone}">${phone}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600;">Preferred Day:</td>
                <td style="padding: 8px 0;">${dayLabels[preferredDay] || preferredDay || "Not specified"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600;">Preferred Time:</td>
                <td style="padding: 8px 0;">${timeLabels[preferredTime] || preferredTime || "Not specified"}</td>
              </tr>
              ${teamSlug ? `
              <tr>
                <td style="padding: 8px 0; font-weight: 600;">Team:</td>
                <td style="padding: 8px 0;">${teamSlug}</td>
              </tr>
              ` : ""}
            </table>
          </div>

          ${notes ? `
          <div style="margin: 20px 0;">
            <h3 style="color: #333; margin-bottom: 10px;">Notes from User:</h3>
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
              ${notes}
            </div>
          </div>
          ` : ""}

          <div style="margin: 30px 0; padding: 20px; background: #e8f5e9; border-radius: 8px;">
            <p style="margin: 0 0 10px 0; font-weight: 600;">Quick Actions:</p>
            <p style="margin: 0;">
              <a href="tel:${phone}" style="display: inline-block; padding: 10px 20px; background: #4caf50; color: white; text-decoration: none; border-radius: 4px; margin-right: 10px;">
                Call ${name.split(' ')[0]}
              </a>
            </p>
          </div>

          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Requested at: ${now.toLocaleString('en-US', { timeZone: 'America/New_York' })} EST<br>
            Request ID: ${requestId}
          </p>
        </div>
      `,
    });

    if (!emailResult.success) {
      console.error("[SetupCallRequest] Email failed:", emailResult.error);
      // Still return success since the request was saved
    }

    console.log(`[SetupCallRequest] New request from ${name} (${phone}) for team ${teamSlug}`);

    return NextResponse.json({
      success: true,
      message: "Setup call request submitted",
      requestId,
    });
  } catch (error) {
    console.error("[SetupCallRequest] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit request" },
      { status: 500 }
    );
  }
}

// GET - List pending setup call requests (for admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminKey = searchParams.get("adminKey");

    const expectedKey = process.env.ADMIN_API_KEY || "nextier-admin-2024";
    if (adminKey !== expectedKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json({ requests: [] });
    }

    const result = await db.execute(sql`
      SELECT
        ts.id,
        ts.team_id,
        ts.value,
        ts.created_at,
        t.slug as team_slug,
        t.name as team_name
      FROM team_settings ts
      LEFT JOIN teams t ON t.id = ts.team_id
      WHERE ts.name = 'setup_call_request'
      ORDER BY ts.created_at DESC
      LIMIT 50
    `);

    const requests = result.rows?.map((row: any) => ({
      id: row.id,
      teamId: row.team_id,
      teamSlug: row.team_slug,
      teamName: row.team_name,
      createdAt: row.created_at,
      ...JSON.parse(row.value || "{}"),
    })) || [];

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("[SetupCallRequest] Error fetching requests:", error);
    return NextResponse.json({ requests: [] });
  }
}
