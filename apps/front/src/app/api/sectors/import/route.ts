import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { apiAuth } from "@/lib/api-auth";

// DO Spaces configuration
const SPACES_ENDPOINT = "https://nyc3.digitaloceanspaces.com";
const SPACES_BUCKET = process.env.SPACES_BUCKET || process.env.DO_SPACES_BUCKET || "nextier";
const SPACES_KEY = process.env.DO_SPACES_KEY || "";
const SPACES_SECRET = process.env.DO_SPACES_SECRET || "";

function getS3Client(): S3Client | null {
  if (!SPACES_KEY || !SPACES_SECRET) return null;
  return new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: "nyc3",
    credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
    forcePathStyle: true, // CRITICAL for DO Spaces
  });
}

// Sector definitions - map sector IDs to storage paths and names
const SECTORS: Record<string, { name: string; storagePath: string; sicCodes: string[]; recordCount?: number }> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // USBIZDATA LISTS (PRIMARY - READY TO IMPORT)
  // ═══════════════════════════════════════════════════════════════════════════
  plumbers_hvac: {
    name: "US Plumbing, Heating & AC Contractors",
    storagePath: "sectors/usbizdata/plumbers-hvac/",
    sicCodes: ["1711"],
    recordCount: 338605,
  },
  business_consultants: {
    name: "US Business Management & Consultants",
    storagePath: "sectors/usbizdata/business-consultants/",
    sicCodes: ["8742", "8748"],
    recordCount: 866527,
  },
  realtors: {
    name: "US Realtors",
    storagePath: "sectors/usbizdata/realtors/",
    sicCodes: ["6531"],
    recordCount: 2184726,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // OTHER B2B SECTORS
  // ═══════════════════════════════════════════════════════════════════════════
  hotels_motels: { name: "Hotels & Motels", storagePath: "sectors/b2b/hotels-motels/", sicCodes: ["7011"] },
  campgrounds_rv: { name: "Campgrounds & RV Parks", storagePath: "sectors/b2b/campgrounds-rv/", sicCodes: ["7033"] },
  restaurants: { name: "Restaurants & Food Service", storagePath: "sectors/b2b/restaurants/", sicCodes: ["5812"] },
  professional_services: { name: "Professional Services", storagePath: "sectors/b2b/professional-services/", sicCodes: ["8111"] },
  healthcare: { name: "Healthcare & Medical", storagePath: "sectors/b2b/healthcare/", sicCodes: ["8011", "8021"] },
  retail: { name: "Retail & Stores", storagePath: "sectors/b2b/retail/", sicCodes: ["5311"] },
  manufacturing: { name: "Manufacturing", storagePath: "sectors/b2b/manufacturing/", sicCodes: ["3999"] },
  transportation: { name: "Transportation & Logistics", storagePath: "sectors/b2b/transportation/", sicCodes: ["4212", "4213"] },
  education: { name: "Education & Training Centers", storagePath: "sectors/b2b/education/", sicCodes: ["8211"] },
  automotive: { name: "Automotive", storagePath: "sectors/b2b/automotive/", sicCodes: ["5511"] },
  financial: { name: "Financial Services", storagePath: "sectors/b2b/financial/", sicCodes: ["6021"] },
  construction: { name: "Construction & Contractors", storagePath: "sectors/b2b/construction/", sicCodes: ["1521"] },

  // Trucking
  trucking: { name: "Trucking Companies", storagePath: "sectors/trucking/general/", sicCodes: ["4212", "4213"] },

  // Schools
  schools: { name: "US Schools Database", storagePath: "sectors/education/schools/", sicCodes: ["8211"] },
};

/**
 * POST /api/sectors/import
 * Import records to a sector (JSON format, supports chunking)
 *
 * Body: {
 *   sectorId: string,        // e.g. "plumbers", "hotels_motels"
 *   records: Array<Record>,  // Array of records to import
 *   source?: string,         // e.g. "usbizdata_import"
 *   chunk?: number,          // Current chunk number
 *   totalChunks?: number     // Total chunks expected
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Auth - check header or skip for now (Python script)
    const teamId = request.headers.get("x-team-id") || "tm_nextiertech";

    const client = getS3Client();
    if (!client) {
      return NextResponse.json(
        { error: "DO Spaces not configured", required: ["DO_SPACES_KEY", "DO_SPACES_SECRET"] },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { sectorId, records, source = "api_import", chunk = 1, totalChunks = 1 } = body;

    // Validate sector
    if (!sectorId || !SECTORS[sectorId]) {
      return NextResponse.json(
        {
          error: `Invalid sectorId: ${sectorId}`,
          availableSectors: Object.keys(SECTORS),
        },
        { status: 400 }
      );
    }

    // Validate records
    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: "records array is required and must not be empty" },
        { status: 400 }
      );
    }

    const sector = SECTORS[sectorId];
    const now = new Date().toISOString();
    const uploadId = `import-${Date.now()}-chunk${chunk}`;

    // Normalize and process records
    const processedRecords = records.map((record: any, index: number) => ({
      id: randomUUID(),
      uploadId,
      sectorId,
      rowIndex: index,
      // Standard fields
      company: record.company || record.companyName || record.company_name || null,
      contactName: record.contact_name || record.contactName || record.contact || null,
      firstName: record.first_name || record.firstName || null,
      lastName: record.last_name || record.lastName || null,
      email: record.email || null,
      phone: record.phone || record.phone_number || null,
      mobile: record.mobile || null,
      address: record.address || record.street || null,
      city: record.city || null,
      state: record.state || null,
      zip: record.zip || record.zipcode || record.zip_code || null,
      county: record.county || null,
      website: record.website || null,
      employees: record.employees || record.employee_count || null,
      revenue: record.revenue || null,
      sicCode: record.sic_code || record.sicCode || null,
      sicDescription: record.sic_description || record.sicDescription || null,
      // Metadata
      source,
      createdAt: now,
      enrichment: {
        status: "pending",
        skipTraced: false,
        trestleScored: false,
      },
    }));

    // Stats
    const stats = {
      total: processedRecords.length,
      withPhone: processedRecords.filter((r) => r.phone).length,
      withEmail: processedRecords.filter((r) => r.email).length,
      withAddress: processedRecords.filter((r) => r.address && r.city && r.state).length,
    };

    // Build indexes
    const indexes = {
      byState: {} as Record<string, number>,
      byCity: {} as Record<string, number>,
    };

    for (const r of processedRecords) {
      if (r.state) {
        const state = r.state.toUpperCase();
        indexes.byState[state] = (indexes.byState[state] || 0) + 1;
      }
      if (r.city && r.state) {
        const key = `${r.city.toLowerCase()}-${r.state.toUpperCase()}`;
        indexes.byCity[key] = (indexes.byCity[key] || 0) + 1;
      }
    }

    // Save chunk data
    const chunkData = {
      uploadId,
      sectorId,
      sector: sector.name,
      source,
      chunk,
      totalChunks,
      uploadedAt: now,
      teamId,
      stats,
      records: processedRecords,
      indexes,
    };

    await client.send(
      new PutObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: `${sector.storagePath}imports/${uploadId}.json`,
        Body: JSON.stringify(chunkData, null, 2),
        ContentType: "application/json",
      })
    );

    // Update sector index
    let sectorIndex: any = {
      sectorId,
      name: sector.name,
      storagePath: sector.storagePath,
      sicCodes: sector.sicCodes,
      createdAt: now,
      updatedAt: now,
      totalRecords: 0,
      enrichedRecords: 0,
      imports: [],
      indexes: { byState: {}, byCity: {} },
    };

    // Try to get existing index
    try {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: SPACES_BUCKET,
          Key: `${sector.storagePath}index.json`,
        })
      );
      const existingContent = await response.Body?.transformToString();
      if (existingContent) {
        sectorIndex = JSON.parse(existingContent);
      }
    } catch {
      // No existing index
    }

    // Update index
    sectorIndex.updatedAt = now;
    sectorIndex.totalRecords += stats.total;
    sectorIndex.imports = sectorIndex.imports || [];
    sectorIndex.imports.push({
      uploadId,
      chunk,
      totalChunks,
      source,
      uploadedAt: now,
      recordCount: stats.total,
      stats,
    });

    // Merge state indexes
    for (const [state, count] of Object.entries(indexes.byState)) {
      sectorIndex.indexes.byState[state] = (sectorIndex.indexes.byState[state] || 0) + count;
    }

    await client.send(
      new PutObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: `${sector.storagePath}index.json`,
        Body: JSON.stringify(sectorIndex, null, 2),
        ContentType: "application/json",
      })
    );

    console.log(`[Sector Import] ${sectorId}: Imported ${stats.total} records (chunk ${chunk}/${totalChunks})`);

    return NextResponse.json({
      success: true,
      imported: stats.total,
      uploadId,
      sector: {
        id: sectorId,
        name: sector.name,
        totalRecords: sectorIndex.totalRecords,
      },
      chunk: {
        current: chunk,
        total: totalChunks,
      },
      stats,
      indexes: {
        statesFound: Object.keys(indexes.byState).length,
        topStates: Object.entries(indexes.byState)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([state, count]) => ({ state, count })),
      },
    });
  } catch (error) {
    console.error("[Sector Import] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sectors/import?sectorId=plumbers
 * Get import status for a sector
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sectorId = searchParams.get("sectorId");

    if (!sectorId) {
      // Return all available sectors
      return NextResponse.json({
        success: true,
        availableSectors: Object.entries(SECTORS).map(([id, s]) => ({
          id,
          name: s.name,
          sicCodes: s.sicCodes,
        })),
      });
    }

    const sector = SECTORS[sectorId];
    if (!sector) {
      return NextResponse.json(
        { error: `Sector ${sectorId} not found`, availableSectors: Object.keys(SECTORS) },
        { status: 404 }
      );
    }

    const client = getS3Client();
    if (!client) {
      return NextResponse.json({ error: "DO Spaces not configured" }, { status: 503 });
    }

    // Get sector index
    try {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: SPACES_BUCKET,
          Key: `${sector.storagePath}index.json`,
        })
      );
      const content = await response.Body?.transformToString();
      if (content) {
        const index = JSON.parse(content);
        return NextResponse.json({
          success: true,
          sector: {
            id: sectorId,
            name: sector.name,
            sicCodes: sector.sicCodes,
          },
          status: {
            totalRecords: index.totalRecords || 0,
            enrichedRecords: index.enrichedRecords || 0,
            imports: index.imports?.length || 0,
          },
          indexes: index.indexes,
          recentImports: (index.imports || []).slice(-5),
        });
      }
    } catch {
      return NextResponse.json({
        success: true,
        sector: {
          id: sectorId,
          name: sector.name,
          sicCodes: sector.sicCodes,
        },
        status: {
          totalRecords: 0,
          enrichedRecords: 0,
          imports: 0,
        },
        message: "No data imported yet",
      });
    }

    return NextResponse.json({ success: true, sector, message: "No data found" });
  } catch (error) {
    console.error("[Sector Import Status] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get status" },
      { status: 500 }
    );
  }
}
