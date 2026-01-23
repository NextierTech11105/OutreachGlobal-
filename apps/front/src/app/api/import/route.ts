import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/api-auth";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * UNIFIED IMPORT ENDPOINT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Single entry point for all data imports. Routes to the appropriate handler
 * based on the `importType` parameter.
 *
 * POST /api/import
 * {
 *   "importType": "sectors" | "leads" | "fdaily" | "templates" | "datalake",
 *   ...type-specific fields
 * }
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Valid import types and their descriptions
const IMPORT_TYPES = {
  sectors: {
    description: "USBizData B2B sector imports (JSON, chunked)",
    destination: "DO Spaces",
    endpoint: "/api/sectors/import",
    requiredFields: ["sectorId", "records"],
    optionalFields: ["source", "chunk", "totalChunks"],
  },
  leads: {
    description: "Campaign leads from CSV or JSON",
    destination: "Database (leads table)",
    endpoint: "/api/leads/import",
    requiredFields: ["records"],
    optionalFields: ["campaignId", "industry", "source"],
  },
  fdaily: {
    description: "Foreclosure/Lis Pendens data",
    destination: "DO Spaces (fdaily/)",
    endpoint: "/api/fdaily/import",
    requiredFields: ["records", "batchName"],
    optionalFields: ["source", "priority"],
  },
  templates: {
    description: "Bulk SMS/Email template import",
    destination: "Database (templateLibrary)",
    endpoint: "/api/t/{team}/template-library/import",
    requiredFields: ["templates"],
    optionalFields: ["overwrite"],
  },
  datalake: {
    description: "Raw file archive storage",
    destination: "DO Spaces (datalake/)",
    endpoint: "/api/datalake/upload",
    requiredFields: ["schema", "file"],
    optionalFields: ["metadata"],
  },
} as const;

type ImportType = keyof typeof IMPORT_TYPES;

interface ImportRequest {
  importType: ImportType;
  [key: string]: unknown;
}

interface ImportResult {
  success: boolean;
  importType: ImportType;
  imported?: number;
  failed?: number;
  errors?: string[];
  destination?: string;
  details?: Record<string, unknown>;
}

/**
 * POST /api/import - Unified import endpoint
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Auth check
    const { userId, teamId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse body
    const body = await request.json() as ImportRequest;
    const { importType, ...data } = body;

    // Validate importType
    if (!importType || !IMPORT_TYPES[importType]) {
      return NextResponse.json(
        {
          error: `Invalid importType: ${importType}`,
          validTypes: Object.keys(IMPORT_TYPES),
          documentation: Object.entries(IMPORT_TYPES).map(([type, info]) => ({
            type,
            description: info.description,
            destination: info.destination,
            requiredFields: info.requiredFields,
          })),
        },
        { status: 400 }
      );
    }

    const typeConfig = IMPORT_TYPES[importType];

    // Validate required fields
    const missingFields = typeConfig.requiredFields.filter(
      (field) => !(field in data) || data[field] === undefined
    );

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required fields for ${importType} import`,
          missingFields,
          requiredFields: typeConfig.requiredFields,
          optionalFields: typeConfig.optionalFields,
        },
        { status: 400 }
      );
    }

    // Route to appropriate handler
    let result: ImportResult;

    switch (importType) {
      case "sectors":
        result = await handleSectorImport(data, teamId);
        break;
      case "leads":
        result = await handleLeadImport(data, teamId, userId);
        break;
      case "fdaily":
        result = await handleFdailyImport(data, teamId);
        break;
      case "templates":
        result = await handleTemplateImport(data, teamId);
        break;
      case "datalake":
        result = await handleDatalakeImport(data, teamId);
        break;
      default:
        return NextResponse.json(
          { error: `Handler not implemented for ${importType}` },
          { status: 501 }
        );
    }

    // Log import
    const duration = Date.now() - startTime;
    console.log(
      `[Import] ${importType} | ${result.imported || 0} records | ${duration}ms | team=${teamId}`
    );

    return NextResponse.json({
      ...result,
      meta: {
        importType,
        destination: typeConfig.destination,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[Import] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Import failed",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/import - Documentation endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/import",
    description: "Unified import endpoint for all data types",
    importTypes: Object.entries(IMPORT_TYPES).map(([type, info]) => ({
      type,
      description: info.description,
      destination: info.destination,
      requiredFields: info.requiredFields,
      optionalFields: info.optionalFields,
      legacyEndpoint: info.endpoint,
    })),
    examples: {
      sectors: {
        importType: "sectors",
        sectorId: "plumbers_hvac",
        records: [{ company: "ABC Plumbing", phone: "555-1234", state: "NY" }],
        source: "usbizdata_import",
        chunk: 1,
        totalChunks: 1,
      },
      leads: {
        importType: "leads",
        records: [
          { firstName: "John", lastName: "Doe", phone: "555-1234", email: "john@example.com" },
        ],
        campaignId: "camp_123",
        industry: "plumbing",
      },
      fdaily: {
        importType: "fdaily",
        batchName: "ny-lis-pendens-2026-01",
        records: [
          {
            address: "123 Main St",
            city: "New York",
            state: "NY",
            case_number: "2026-12345",
          },
        ],
      },
      templates: {
        importType: "templates",
        templates: [
          {
            name: "Opener 1",
            content: "Hi {{firstName}}, this is {{agentName}}...",
            category: "opener",
            agent: "GIANNA",
          },
        ],
      },
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handle sector imports (USBizData B2B)
 * Forwards to /api/sectors/import logic
 */
async function handleSectorImport(
  data: Record<string, unknown>,
  teamId: string | null
): Promise<ImportResult> {
  // Import the sector handler dynamically to avoid circular deps
  const { S3Client, PutObjectCommand, GetObjectCommand } = await import("@aws-sdk/client-s3");
  const { randomUUID } = await import("crypto");

  const SPACES_ENDPOINT = "https://nyc3.digitaloceanspaces.com";
  const SPACES_BUCKET = process.env.SPACES_BUCKET || process.env.DO_SPACES_BUCKET || "nextier";
  const SPACES_KEY = process.env.DO_SPACES_KEY || "";
  const SPACES_SECRET = process.env.DO_SPACES_SECRET || "";

  if (!SPACES_KEY || !SPACES_SECRET) {
    return {
      success: false,
      importType: "sectors",
      errors: ["DO Spaces not configured"],
    };
  }

  const client = new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: "nyc3",
    credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
    forcePathStyle: true, // CRITICAL for DO Spaces
  });

  const { sectorId, records, source = "api_import", chunk = 1, totalChunks = 1 } = data as {
    sectorId: string;
    records: Record<string, unknown>[];
    source?: string;
    chunk?: number;
    totalChunks?: number;
  };

  // Sector definitions
  const SECTORS: Record<string, { name: string; storagePath: string; sicCodes: string[] }> = {
    plumbers_hvac: { name: "US Plumbing, Heating & AC Contractors", storagePath: "sectors/usbizdata/plumbers-hvac/", sicCodes: ["1711"] },
    business_consultants: { name: "US Business Management & Consultants", storagePath: "sectors/usbizdata/business-consultants/", sicCodes: ["8742", "8748"] },
    realtors: { name: "US Realtors", storagePath: "sectors/usbizdata/realtors/", sicCodes: ["6531"] },
    hotels_motels: { name: "Hotels & Motels", storagePath: "sectors/b2b/hotels-motels/", sicCodes: ["7011"] },
    campgrounds_rv: { name: "Campgrounds & RV Parks", storagePath: "sectors/b2b/campgrounds-rv/", sicCodes: ["7033"] },
    restaurants: { name: "Restaurants & Food Service", storagePath: "sectors/b2b/restaurants/", sicCodes: ["5812"] },
    trucking: { name: "Trucking Companies", storagePath: "sectors/trucking/general/", sicCodes: ["4212", "4213"] },
  };

  const sector = SECTORS[sectorId];
  if (!sector) {
    return {
      success: false,
      importType: "sectors",
      errors: [`Invalid sectorId: ${sectorId}. Valid: ${Object.keys(SECTORS).join(", ")}`],
    };
  }

  const now = new Date().toISOString();
  const uploadId = `import-${Date.now()}-chunk${chunk}`;

  // Process records
  const processedRecords = records.map((record: any, index: number) => ({
    id: randomUUID(),
    uploadId,
    sectorId,
    rowIndex: index,
    company: record.company || record.companyName || record.company_name || null,
    contactName: record.contact_name || record.contactName || record.contact || null,
    phone: record.phone || record.phone_number || null,
    email: record.email || null,
    address: record.address || record.street || null,
    city: record.city || null,
    state: record.state || null,
    zip: record.zip || record.zipcode || null,
    source,
    createdAt: now,
    enrichment: { status: "pending", skipTraced: false, trestleScored: false },
  }));

  // Save to DO Spaces
  await client.send(
    new PutObjectCommand({
      Bucket: SPACES_BUCKET,
      Key: `${sector.storagePath}imports/${uploadId}.json`,
      Body: JSON.stringify({ uploadId, sectorId, records: processedRecords, uploadedAt: now }, null, 2),
      ContentType: "application/json",
    })
  );

  return {
    success: true,
    importType: "sectors",
    imported: processedRecords.length,
    destination: `${sector.storagePath}imports/${uploadId}.json`,
    details: {
      sectorId,
      sectorName: sector.name,
      chunk,
      totalChunks,
      uploadId,
    },
  };
}

/**
 * Handle lead imports (CSV/JSON → Database)
 */
async function handleLeadImport(
  data: Record<string, unknown>,
  teamId: string | null,
  userId: string
): Promise<ImportResult> {
  const { records, campaignId, industry, source = "api_import" } = data as {
    records: Record<string, unknown>[];
    campaignId?: string;
    industry?: string;
    source?: string;
  };

  // For now, forward to the internal API
  // In production, this would directly use Prisma
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const response = await fetch(`${baseUrl}/api/leads/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records, campaignId, industry, source }),
    });

    const result = await response.json();

    return {
      success: response.ok,
      importType: "leads",
      imported: result.imported || records.length,
      failed: result.failed || 0,
      errors: result.errors,
      destination: "Database (leads table)",
      details: result,
    };
  } catch (error) {
    return {
      success: false,
      importType: "leads",
      errors: [error instanceof Error ? error.message : "Lead import failed"],
    };
  }
}

/**
 * Handle FDAILY imports (Foreclosure data)
 */
async function handleFdailyImport(
  data: Record<string, unknown>,
  teamId: string | null
): Promise<ImportResult> {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

  const SPACES_ENDPOINT = "https://nyc3.digitaloceanspaces.com";
  const SPACES_BUCKET = process.env.SPACES_BUCKET || process.env.DO_SPACES_BUCKET || "nextier";
  const SPACES_KEY = process.env.DO_SPACES_KEY || "";
  const SPACES_SECRET = process.env.DO_SPACES_SECRET || "";

  if (!SPACES_KEY || !SPACES_SECRET) {
    return { success: false, importType: "fdaily", errors: ["DO Spaces not configured"] };
  }

  const client = new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: "nyc3",
    credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
    forcePathStyle: true, // CRITICAL for DO Spaces
  });

  const { batchName, records, source = "fdaily_import" } = data as {
    batchName: string;
    records: Record<string, unknown>[];
    source?: string;
  };

  const now = new Date().toISOString();

  await client.send(
    new PutObjectCommand({
      Bucket: SPACES_BUCKET,
      Key: `fdaily/${batchName}.json`,
      Body: JSON.stringify({ batchName, records, uploadedAt: now, source }, null, 2),
      ContentType: "application/json",
    })
  );

  return {
    success: true,
    importType: "fdaily",
    imported: records.length,
    destination: `fdaily/${batchName}.json`,
    details: { batchName },
  };
}

/**
 * Handle template imports
 */
async function handleTemplateImport(
  data: Record<string, unknown>,
  teamId: string | null
): Promise<ImportResult> {
  const { templates } = data as { templates: Record<string, unknown>[] };

  // Forward to template library endpoint
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const response = await fetch(`${baseUrl}/api/t/${teamId}/template-library/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templates }),
    });

    const result = await response.json();

    return {
      success: response.ok,
      importType: "templates",
      imported: result.imported || templates.length,
      destination: "Database (templateLibrary)",
      details: result,
    };
  } catch (error) {
    return {
      success: false,
      importType: "templates",
      errors: [error instanceof Error ? error.message : "Template import failed"],
    };
  }
}

/**
 * Handle datalake imports (raw file storage)
 */
async function handleDatalakeImport(
  data: Record<string, unknown>,
  teamId: string | null
): Promise<ImportResult> {
  const { schema, content, filename } = data as {
    schema: string;
    content: string;
    filename: string;
  };

  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

  const SPACES_ENDPOINT = "https://nyc3.digitaloceanspaces.com";
  const SPACES_BUCKET = process.env.SPACES_BUCKET || process.env.DO_SPACES_BUCKET || "nextier";
  const SPACES_KEY = process.env.DO_SPACES_KEY || "";
  const SPACES_SECRET = process.env.DO_SPACES_SECRET || "";

  if (!SPACES_KEY || !SPACES_SECRET) {
    return { success: false, importType: "datalake", errors: ["DO Spaces not configured"] };
  }

  const client = new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: "nyc3",
    credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
    forcePathStyle: true, // CRITICAL for DO Spaces
  });

  const key = `datalake/${schema}/raw/${Date.now()}_${filename}`;

  await client.send(
    new PutObjectCommand({
      Bucket: SPACES_BUCKET,
      Key: key,
      Body: content,
      ContentType: "text/csv",
    })
  );

  return {
    success: true,
    importType: "datalake",
    imported: 1,
    destination: key,
    details: { schema, filename },
  };
}
