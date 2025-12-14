import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dataSchemas } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Input validation helpers
function validateTeamId(teamId: string): boolean {
  return /^[a-zA-Z0-9_-]{1,100}$/.test(teamId);
}

function validateKey(key: string): boolean {
  return /^[a-zA-Z0-9_-]{1,50}$/.test(key);
}

// GET - Fetch all schemas for a team, or a specific schema by key
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId") || "default";
    const key = searchParams.get("key");

    // Input validation
    if (!validateTeamId(teamId)) {
      return NextResponse.json(
        { error: "Invalid teamId format" },
        { status: 400 }
      );
    }

    if (key && !validateKey(key)) {
      return NextResponse.json(
        { error: "Invalid key format" },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // If specific key requested, return just that schema
    if (key) {
      const schema = await db
        .select()
        .from(dataSchemas)
        .where(
          and(
            eq(dataSchemas.teamId, teamId),
            eq(dataSchemas.key, key),
            eq(dataSchemas.isActive, true)
          )
        )
        .orderBy(desc(dataSchemas.version))
        .limit(1);

      if (schema.length === 0) {
        return NextResponse.json({ schema: null });
      }

      return NextResponse.json({ schema: schema[0] });
    }

    // Return all schemas for team
    const schemas = await db
      .select()
      .from(dataSchemas)
      .where(
        and(eq(dataSchemas.teamId, teamId), eq(dataSchemas.isActive, true))
      )
      .orderBy(dataSchemas.key, desc(dataSchemas.version));

    // Dedupe to get latest version per key
    const latestSchemas = schemas.reduce(
      (acc, schema) => {
        if (!acc[schema.key]) {
          acc[schema.key] = schema;
        }
        return acc;
      },
      {} as Record<string, (typeof schemas)[0]>
    );

    return NextResponse.json({
      schemas: Object.values(latestSchemas),
    });
  } catch (error) {
    console.error("Error fetching schemas:", error);
    return NextResponse.json(
      { error: "Failed to fetch schemas" },
      { status: 500 }
    );
  }
}

// PUT - Create or update a schema (creates new version)
export async function PUT(request: NextRequest) {
  try {
    // Auth check - get userId from session, not request body
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const userId = session.user.id || session.user.email || "system";

    const body = await request.json();
    const { teamId = "default", key, name, description, schemaJson } = body;

    // Input validation
    if (!validateTeamId(teamId)) {
      return NextResponse.json(
        { error: "Invalid teamId format" },
        { status: 400 }
      );
    }

    if (!key || !validateKey(key)) {
      return NextResponse.json(
        { error: "Invalid or missing key" },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string" || name.length > 200) {
      return NextResponse.json(
        { error: "Invalid or missing name (max 200 chars)" },
        { status: 400 }
      );
    }

    if (!schemaJson || typeof schemaJson !== "object") {
      return NextResponse.json(
        { error: "Invalid or missing schemaJson" },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // Use transaction to prevent race condition
    const result = await db.transaction(async (tx) => {
      // Find existing schema to get version number
      const existing = await tx
        .select()
        .from(dataSchemas)
        .where(
          and(
            eq(dataSchemas.teamId, teamId),
            eq(dataSchemas.key, key),
            eq(dataSchemas.isActive, true)
          )
        )
        .orderBy(desc(dataSchemas.version))
        .limit(1);

      const previousVersion = existing[0];
      const newVersion = previousVersion ? previousVersion.version + 1 : 1;

      // Mark old version as inactive
      if (previousVersion) {
        await tx
          .update(dataSchemas)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(dataSchemas.id, previousVersion.id));
      }

      // Insert new version
      const [newSchema] = await tx
        .insert(dataSchemas)
        .values({
          scope: "team",
          teamId,
          key,
          name,
          description: description || null,
          schemaJson,
          version: newVersion,
          previousVersionId: previousVersion?.id || null,
          isActive: true,
          isDefault: !previousVersion,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      return { newSchema, newVersion };
    });

    return NextResponse.json({
      success: true,
      schema: result.newSchema,
      version: result.newVersion,
    });
  } catch (error) {
    console.error("Error saving schema:", error);
    return NextResponse.json(
      { error: "Failed to save schema" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete a schema (mark as inactive)
export async function DELETE(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId") || "default";
    const key = searchParams.get("key");

    // Input validation
    if (!validateTeamId(teamId)) {
      return NextResponse.json(
        { error: "Invalid teamId format" },
        { status: 400 }
      );
    }

    if (!key || !validateKey(key)) {
      return NextResponse.json(
        { error: "Invalid or missing key" },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // Soft delete all versions of this schema
    await db
      .update(dataSchemas)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(eq(dataSchemas.teamId, teamId), eq(dataSchemas.key, key))
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting schema:", error);
    return NextResponse.json(
      { error: "Failed to delete schema" },
      { status: 500 }
    );
  }
}
