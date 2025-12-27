import { NextResponse } from "next/server";
import postgres from "postgres";
import { requireSuperAdmin } from "@/lib/api-auth";

export async function POST() {
  // SECURITY: Only super admins can run setup
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Forbidden: Super admin access required" },
      { status: 403 },
    );
  }

  const databaseUrl = process.env.DATABASE_URL;
  const email = process.env.DEFAULT_ADMIN_EMAIL || "admin@outreachglobal.io";

  if (!databaseUrl) {
    return NextResponse.json(
      { error: "DATABASE_URL not set" },
      { status: 500 },
    );
  }

  try {
    const sql = postgres(databaseUrl, { ssl: "require" });

    // Find the user
    const users = await sql`SELECT * FROM users WHERE email = ${email}`;

    if (users.length === 0) {
      await sql.end();
      return NextResponse.json({ error: "User not found", email });
    }

    const user = users[0];

    // Check if user has a team
    const teams = await sql`SELECT * FROM teams WHERE owner_id = ${user.id}`;

    if (teams.length > 0) {
      await sql.end();
      return NextResponse.json({
        message: "Team already exists",
        team: teams[0],
      });
    }

    // Generate team ID and slug
    const teamId =
      "team_" +
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    const teamName = `${user.name || "Admin"}'s Team`;
    const slug =
      teamName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") +
      "-" +
      Math.random().toString(16).slice(2, 8);
    const now = new Date();

    // Create team
    const [team] = await sql`
      INSERT INTO teams (id, owner_id, name, slug, created_at, updated_at)
      VALUES (${teamId}, ${user.id}, ${teamName}, ${slug}, ${now}, ${now})
      RETURNING *
    `;

    // Create team member
    const tmId =
      "tm_" +
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    await sql`
      INSERT INTO team_members (id, team_id, user_id, role, status, created_at, updated_at)
      VALUES (${tmId}, ${teamId}, ${user.id}, 'OWNER', 'APPROVED', ${now}, ${now})
    `;

    await sql.end();

    return NextResponse.json({ success: true, team });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
