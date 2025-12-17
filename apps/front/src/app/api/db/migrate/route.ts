import { NextResponse } from "next/server";
import postgres from "postgres";

export async function POST() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 500 });
  }

  try {
    const sql = postgres(databaseUrl, { ssl: "require" });

    const results: string[] = [];

    // Add branding column if it doesn't exist
    try {
      await sql`ALTER TABLE teams ADD COLUMN IF NOT EXISTS branding JSONB`;
      results.push("Added branding column to teams");
    } catch (e: any) {
      results.push(`branding: ${e.message}`);
    }

    // Add description column if it doesn't exist
    try {
      await sql`ALTER TABLE teams ADD COLUMN IF NOT EXISTS description TEXT`;
      results.push("Added description column to teams");
    } catch (e: any) {
      results.push(`description: ${e.message}`);
    }

    await sql.end();

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
