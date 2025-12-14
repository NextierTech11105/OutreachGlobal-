import { sf } from "@/lib/utils/safe-format";
import { NextResponse } from "next/server";
import {
  DATA_LAKE_SCHEMAS,
  PARTNERSHIP_CATEGORIES,
} from "@/lib/datalake/schemas";

// GET - List all schemas and stats
export async function GET() {
  const schemas = Object.entries(DATA_LAKE_SCHEMAS).map(([key, schema]) => ({
    id: key,
    name: schema.name,
    source: schema.source,
    totalRecords: schema.totalRecords,
    lastUpdate: schema.lastUpdate,
    fieldCount: schema.fields.length,
    indexedFields: schema.fields.filter((f) => f.indexed).length,
    storagePath: schema.storagePath,
    useCases: schema.useCases,
  }));

  const totalRecords = Object.values(DATA_LAKE_SCHEMAS).reduce(
    (sum, s) => sum + s.totalRecords,
    0,
  );

  return NextResponse.json({
    success: true,
    totalRecords,
    totalRecordsFormatted: sf(totalRecords),
    schemaCount: schemas.length,
    schemas,
    partnershipCategories: Object.entries(PARTNERSHIP_CATEGORIES).map(
      ([key, cat]) => ({
        id: key,
        ...cat,
      }),
    ),
  });
}

// POST - Get detailed schema or query partners by category
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, schemaId, category } = body;

    if (action === "getSchema" && schemaId) {
      const schema =
        DATA_LAKE_SCHEMAS[schemaId as keyof typeof DATA_LAKE_SCHEMAS];
      if (!schema) {
        return NextResponse.json(
          { error: "Schema not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({ success: true, schema });
    }

    if (action === "getPartnerCategory" && category) {
      const cat =
        PARTNERSHIP_CATEGORIES[category as keyof typeof PARTNERSHIP_CATEGORIES];
      if (!cat) {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({
        success: true,
        category: cat,
        queryHint: `SELECT * FROM ny_business WHERE sicCode IN (${cat.sicCodes.map((c) => `'${c}'`).join(", ")})`,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
