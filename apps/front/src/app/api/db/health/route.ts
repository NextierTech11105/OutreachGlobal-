import { NextResponse } from "next/server";
import postgres from "postgres";

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return NextResponse.json(
      {
        status: "error",
        message: "DATABASE_URL not configured",
        connected: false,
      },
      { status: 500 },
    );
  }

  try {
    const sql = postgres(databaseUrl, {
      ssl: "require",
      connect_timeout: 10,
    });

    // Simple query to test connection
    const result =
      await sql`SELECT NOW() as time, current_database() as database, version() as version`;

    await sql.end();

    return NextResponse.json({
      status: "success",
      connected: true,
      database: result[0].database,
      serverTime: result[0].time,
      postgresVersion: result[0].version.split(" ").slice(0, 2).join(" "),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        connected: false,
        message: error.message,
        code: error.code,
      },
      { status: 500 },
    );
  }
}
