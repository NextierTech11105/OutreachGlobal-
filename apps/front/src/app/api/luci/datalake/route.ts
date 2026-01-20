/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LUCI DATALAKE - Raw Data Storage & Indexing
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Upload raw USBizData blocks to datalake, indexed for fast scanning.
 *
 * POST /api/luci/datalake - Upload blocks
 * GET /api/luci/datalake - List sectors and stats
 * GET /api/luci/datalake?sector=plumbers_hvac - Get sector details
 *
 * Storage structure:
 *   datalake/usbizdata/{sector}/
 *   ├── manifest.json (index with state/city counts)
 *   ├── header.csv
 *   └── blocks/
 *       ├── block_0001.csv
 *       └── ...
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { parse } from "csv-parse/sync";

const SPACES_ENDPOINT = process.env.DO_SPACES_ENDPOINT || "https://nyc3.digitaloceanspaces.com";
const SPACES_BUCKET = process.env.SPACES_BUCKET || process.env.DO_SPACES_BUCKET || "nextier";
const SPACES_KEY = process.env.DO_SPACES_KEY || "";
const SPACES_SECRET = process.env.DO_SPACES_SECRET || "";

function getS3Client(): S3Client | null {
  if (!SPACES_KEY || !SPACES_SECRET) return null;
  return new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: "nyc3",
    credentials: { accessKeyId: SPACES_KEY, secretAccessKey: SPACES_SECRET },
  });
}

// USBizData Sector Definitions
const SECTORS = {
  plumbers_hvac: {
    name: "US Plumbing, Heating & AC Contractors",
    sicCodes: ["1711"],
    expectedRecords: 338605,
  },
  business_consultants: {
    name: "US Business Management & Consultants",
    sicCodes: ["8742", "8748"],
    expectedRecords: 866527,
  },
  realtors: {
    name: "US Realtors",
    sicCodes: ["6531"],
    expectedRecords: 2184726,
  },
  hotels_motels: {
    name: "Hotels & Motels",
    sicCodes: ["7011"],
    expectedRecords: 0,
  },
  restaurants: {
    name: "Restaurants & Food Service",
    sicCodes: ["5812"],
    expectedRecords: 0,
  },
  trucking: {
    name: "Trucking Companies",
    sicCodes: ["4212", "4213"],
    expectedRecords: 0,
  },
} as const;

type SectorId = keyof typeof SECTORS;

interface BlockManifest {
  sectorId: string;
  sectorName: string;
  sicCodes: string[];
  totalRecords: number;
  totalBlocks: number;
  uploadedAt: string;
  updatedAt: string;
  columns: string[];
  blocks: Array<{
    name: string;
    records: number;
    uploadedAt: string;
  }>;
  indexes: {
    byState: Record<string, number>;
    byCity: Record<string, number>;
    bySicCode: Record<string, number>;
  };
}

/**
 * POST /api/luci/datalake
 * Upload CSV blocks to datalake
 *
 * FormData:
 *   - sector: string (required)
 *   - file: File (CSV block)
 *   - blockNumber: number (optional, auto-detected from filename)
 *   - isHeader: boolean (optional, for header.csv)
 */
export async function POST(req: NextRequest) {
  try {
    const client = getS3Client();
    if (!client) {
      return NextResponse.json(
        { error: "DO Spaces not configured" },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const sectorId = formData.get("sector") as string;
    const file = formData.get("file") as File;
    const isHeader = formData.get("isHeader") === "true";

    if (!sectorId || !SECTORS[sectorId as SectorId]) {
      return NextResponse.json(
        {
          error: `Invalid sector: ${sectorId}`,
          availableSectors: Object.keys(SECTORS),
        },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const sector = SECTORS[sectorId as SectorId];
    const basePath = `datalake/usbizdata/${sectorId}`;
    const content = await file.text();
    const now = new Date().toISOString();

    // Determine file path
    let filePath: string;
    let fileName: string;

    if (isHeader) {
      filePath = `${basePath}/header.csv`;
      fileName = "header.csv";
    } else {
      // Extract block number from filename or generate one
      const match = file.name.match(/block_(\d+)/i);
      const blockNum = match ? match[1] : String(Date.now());
      fileName = `block_${blockNum.padStart(4, "0")}.csv`;
      filePath = `${basePath}/blocks/${fileName}`;
    }

    // Upload file
    await client.send(
      new PutObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: filePath,
        Body: content,
        ContentType: "text/csv",
      })
    );

    // Parse CSV to get stats (for non-header files)
    let recordCount = 0;
    let stateIndex: Record<string, number> = {};
    let cityIndex: Record<string, number> = {};
    let columns: string[] = [];

    if (!isHeader) {
      try {
        // Get header first
        let headerRow: string[] = [];
        try {
          const headerRes = await client.send(
            new GetObjectCommand({
              Bucket: SPACES_BUCKET,
              Key: `${basePath}/header.csv`,
            })
          );
          const headerContent = await headerRes.Body?.transformToString();
          if (headerContent) {
            const parsed = parse(headerContent, { columns: false });
            headerRow = parsed[0] || [];
          }
        } catch {
          // No header, use first row
          const parsed = parse(content, { columns: false });
          headerRow = parsed[0] || [];
        }

        columns = headerRow;

        // Parse block with headers
        const records = parse(content, {
          columns: headerRow.length > 0 ? headerRow : true,
          skip_empty_lines: true,
          relax_column_count: true,
        });

        recordCount = records.length;

        // Build indexes
        const stateCol = headerRow.find((h: string) =>
          ["state", "State", "STATE"].includes(h)
        );
        const cityCol = headerRow.find((h: string) =>
          ["city", "City", "CITY"].includes(h)
        );

        for (const row of records) {
          if (stateCol && row[stateCol]) {
            const state = String(row[stateCol]).toUpperCase().trim();
            if (state.length === 2) {
              stateIndex[state] = (stateIndex[state] || 0) + 1;
            }
          }
          if (cityCol && row[cityCol] && stateCol && row[stateCol]) {
            const city = String(row[cityCol]).toLowerCase().trim();
            const state = String(row[stateCol]).toUpperCase().trim();
            const key = `${city}-${state}`;
            cityIndex[key] = (cityIndex[key] || 0) + 1;
          }
        }
      } catch (parseErr) {
        console.error("[Datalake] CSV parse error:", parseErr);
      }
    } else {
      // Header file - extract columns
      const parsed = parse(content, { columns: false });
      columns = parsed[0] || [];
    }

    // Update manifest
    let manifest: BlockManifest;
    try {
      const manifestRes = await client.send(
        new GetObjectCommand({
          Bucket: SPACES_BUCKET,
          Key: `${basePath}/manifest.json`,
        })
      );
      const manifestContent = await manifestRes.Body?.transformToString();
      manifest = manifestContent ? JSON.parse(manifestContent) : null;
    } catch {
      // Create new manifest
      manifest = {
        sectorId,
        sectorName: sector.name,
        sicCodes: [...sector.sicCodes],
        totalRecords: 0,
        totalBlocks: 0,
        uploadedAt: now,
        updatedAt: now,
        columns: [],
        blocks: [],
        indexes: { byState: {}, byCity: {}, bySicCode: {} },
      };
    }

    // Update manifest
    manifest.updatedAt = now;
    if (columns.length > 0) {
      manifest.columns = columns;
    }

    if (!isHeader) {
      // Add block to manifest
      const existingBlock = manifest.blocks.find((b) => b.name === fileName);
      if (existingBlock) {
        existingBlock.records = recordCount;
        existingBlock.uploadedAt = now;
      } else {
        manifest.blocks.push({
          name: fileName,
          records: recordCount,
          uploadedAt: now,
        });
        manifest.totalBlocks++;
      }

      // Update totals
      manifest.totalRecords = manifest.blocks.reduce(
        (sum, b) => sum + b.records,
        0
      );

      // Merge indexes
      for (const [state, count] of Object.entries(stateIndex)) {
        manifest.indexes.byState[state] =
          (manifest.indexes.byState[state] || 0) + count;
      }
      for (const [city, count] of Object.entries(cityIndex)) {
        manifest.indexes.byCity[city] =
          (manifest.indexes.byCity[city] || 0) + count;
      }
    }

    // Save manifest
    await client.send(
      new PutObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: `${basePath}/manifest.json`,
        Body: JSON.stringify(manifest, null, 2),
        ContentType: "application/json",
      })
    );

    return NextResponse.json({
      success: true,
      uploaded: {
        path: filePath,
        fileName,
        records: recordCount,
        isHeader,
      },
      sector: {
        id: sectorId,
        name: sector.name,
        totalRecords: manifest.totalRecords,
        totalBlocks: manifest.totalBlocks,
      },
      indexes: {
        states: Object.keys(stateIndex).length,
        cities: Object.keys(cityIndex).length,
      },
    });
  } catch (error) {
    console.error("[Datalake Upload] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/luci/datalake
 * List sectors and stats, or get sector details
 *
 * ?sector=plumbers_hvac - Get specific sector manifest
 * (no params) - List all sectors with stats
 */
export async function GET(req: NextRequest) {
  try {
    const client = getS3Client();
    if (!client) {
      return NextResponse.json(
        { error: "DO Spaces not configured" },
        { status: 503 }
      );
    }

    const sectorId = req.nextUrl.searchParams.get("sector");

    if (sectorId) {
      // Get specific sector manifest
      if (!SECTORS[sectorId as SectorId]) {
        return NextResponse.json(
          {
            error: `Invalid sector: ${sectorId}`,
            availableSectors: Object.keys(SECTORS),
          },
          { status: 400 }
        );
      }

      const basePath = `datalake/usbizdata/${sectorId}`;

      try {
        const manifestRes = await client.send(
          new GetObjectCommand({
            Bucket: SPACES_BUCKET,
            Key: `${basePath}/manifest.json`,
          })
        );
        const manifestContent = await manifestRes.Body?.transformToString();
        const manifest: BlockManifest = manifestContent
          ? JSON.parse(manifestContent)
          : null;

        if (!manifest) {
          return NextResponse.json({
            success: true,
            sector: {
              id: sectorId,
              ...SECTORS[sectorId as SectorId],
            },
            status: "empty",
            message: "No data uploaded yet",
          });
        }

        // Top states for preview
        const topStates = Object.entries(manifest.indexes.byState)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([state, count]) => ({ state, count }));

        return NextResponse.json({
          success: true,
          sector: {
            id: sectorId,
            name: manifest.sectorName,
            sicCodes: manifest.sicCodes,
          },
          stats: {
            totalRecords: manifest.totalRecords,
            totalBlocks: manifest.totalBlocks,
            uploadedAt: manifest.uploadedAt,
            updatedAt: manifest.updatedAt,
          },
          columns: manifest.columns,
          topStates,
          indexes: {
            statesCount: Object.keys(manifest.indexes.byState).length,
            citiesCount: Object.keys(manifest.indexes.byCity).length,
          },
          blocks: manifest.blocks.slice(-10), // Last 10 blocks
        });
      } catch {
        return NextResponse.json({
          success: true,
          sector: {
            id: sectorId,
            ...SECTORS[sectorId as SectorId],
          },
          status: "empty",
          message: "No data uploaded yet",
        });
      }
    }

    // List all sectors with stats
    const sectors = await Promise.all(
      Object.entries(SECTORS).map(async ([id, sector]) => {
        const basePath = `datalake/usbizdata/${id}`;

        try {
          const manifestRes = await client.send(
            new GetObjectCommand({
              Bucket: SPACES_BUCKET,
              Key: `${basePath}/manifest.json`,
            })
          );
          const manifestContent = await manifestRes.Body?.transformToString();
          const manifest: BlockManifest = manifestContent
            ? JSON.parse(manifestContent)
            : null;

          return {
            id,
            name: sector.name,
            sicCodes: sector.sicCodes,
            expectedRecords: sector.expectedRecords,
            status: manifest ? "ready" : "empty",
            totalRecords: manifest?.totalRecords || 0,
            totalBlocks: manifest?.totalBlocks || 0,
            statesCount: manifest ? Object.keys(manifest.indexes.byState).length : 0,
            updatedAt: manifest?.updatedAt || null,
          };
        } catch {
          return {
            id,
            name: sector.name,
            sicCodes: sector.sicCodes,
            expectedRecords: sector.expectedRecords,
            status: "empty",
            totalRecords: 0,
            totalBlocks: 0,
            statesCount: 0,
            updatedAt: null,
          };
        }
      })
    );

    const totalRecords = sectors.reduce((sum, s) => sum + s.totalRecords, 0);

    return NextResponse.json({
      success: true,
      datalake: {
        totalRecords,
        totalSectors: sectors.length,
        readySectors: sectors.filter((s) => s.status === "ready").length,
      },
      sectors,
      endpoints: {
        upload: "POST /api/luci/datalake (FormData: sector, file)",
        scan: "POST /api/luci/scan (JSON: sector, state, city, limit)",
        activate: "POST /api/luci/activate (JSON: scanId, enrich)",
      },
    });
  } catch (error) {
    console.error("[Datalake] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list" },
      { status: 500 }
    );
  }
}
