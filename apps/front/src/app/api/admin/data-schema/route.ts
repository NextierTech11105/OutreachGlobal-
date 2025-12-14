import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dataSchemas } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

// GET - Fetch all schemas for a team, or a specific schema by key
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId") || "default";
    const key = searchParams.get("key");

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
        // Return null - schema doesn't exist yet
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
    const body = await request.json();
    const { teamId = "default", key, name, description, schemaJson, userId } = body;

    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    if (!key || !name || !schemaJson) {
      return NextResponse.json(
        { error: "Missing required fields: key, name, schemaJson" },
        { status: 400 }
      );
    }

    // Find existing schema to get version number
    const existing = await db
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
      await db
        .update(dataSchemas)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(dataSchemas.id, previousVersion.id));
    }

    // Insert new version
    const [newSchema] = await db
      .insert(dataSchemas)
      .values({
        scope: "team",
        teamId,
        key,
        name,
        description,
        schemaJson,
        version: newVersion,
        previousVersionId: previousVersion?.id || null,
        isActive: true,
        isDefault: !previousVersion, // First version is default
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return NextResponse.json({
      success: true,
      schema: newSchema,
      version: newVersion,
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
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId") || "default";
    const key = searchParams.get("key");

    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    if (!key) {
      return NextResponse.json(
        { error: "Missing required parameter: key" },
        { status: 400 }
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
