import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import {
  ALL_SECTOR_BUCKETS,
  BUCKET_BY_ID,
  getBucketForSIC,
  getBucketsForSector,
  SECTOR_SUMMARY,
  NATIONAL_BUCKETS,
  type SectorBucket,
} from "@/lib/datalake/sector-buckets";
import { apiAuth } from "@/lib/api-auth";

// DO Spaces configuration
const SPACES_ENDPOINT =
  process.env.SPACES_ENDPOINT || "https://nyc3.digitaloceanspaces.com";
const SPACES_REGION = process.env.SPACES_REGION || "nyc3";
const SPACES_KEY = process.env.SPACES_KEY || process.env.DO_SPACES_KEY || "";
const SPACES_SECRET =
  process.env.SPACES_SECRET || process.env.DO_SPACES_SECRET || "";
const SPACES_BUCKET =
  process.env.SPACES_BUCKET || process.env.DO_SPACES_BUCKET || "nextier";

const s3Client = new S3Client({
  endpoint: SPACES_ENDPOINT,
  region: SPACES_REGION,
  credentials: {
    accessKeyId: SPACES_KEY,
    secretAccessKey: SPACES_SECRET,
  },
  forcePathStyle: false,
});

// GET - List all sector buckets or get specific bucket info
export async function GET(request: NextRequest) {
  try {
    const { userId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bucketId = searchParams.get("id");
    const sector = searchParams.get("sector");
    const sicCode = searchParams.get("sic");
    const listNational = searchParams.get("national") === "true";

    // Get specific bucket by ID
    if (bucketId) {
      const bucket = BUCKET_BY_ID[bucketId];
      if (!bucket) {
        return NextResponse.json(
          { error: `Bucket ${bucketId} not found` },
          { status: 404 },
        );
      }

      // Check if it has data in DO Spaces
      let hasData = false;
      let recordCount = 0;
      if (SPACES_KEY && SPACES_SECRET) {
        try {
          const response = await s3Client.send(
            new GetObjectCommand({
              Bucket: SPACES_BUCKET,
              Key: `${bucket.storagePath}index.json`,
            }),
          );
          const content = await response.Body?.transformToString();
          if (content) {
            const index = JSON.parse(content);
            hasData = true;
            recordCount = index.totalRecords || 0;
          }
        } catch {
          // No index file = no data yet
        }
      }

      return NextResponse.json({
        success: true,
        bucket: {
          ...bucket,
          hasData,
          recordCount,
        },
      });
    }

    // Get buckets by SIC code
    if (sicCode) {
      const bucket = getBucketForSIC(sicCode);
      if (!bucket) {
        return NextResponse.json({
          success: true,
          sicCode,
          bucket: null,
          message: `No bucket found for SIC ${sicCode}`,
          suggestion: "Create a new sector bucket for this SIC code",
        });
      }
      return NextResponse.json({
        success: true,
        sicCode,
        bucket,
      });
    }

    // Get buckets by sector
    if (sector) {
      const buckets = getBucketsForSector(sector);
      return NextResponse.json({
        success: true,
        sector,
        count: buckets.length,
        buckets,
      });
    }

    // List national buckets only
    if (listNational) {
      return NextResponse.json({
        success: true,
        type: "national",
        count: NATIONAL_BUCKETS.length,
        buckets: NATIONAL_BUCKETS,
        description: "US-wide sector buckets for national USBizData purchases",
      });
    }

    // Return all buckets with summary
    return NextResponse.json({
      success: true,
      summary: SECTOR_SUMMARY,
      totalBuckets: ALL_SECTOR_BUCKETS.length,
      buckets: ALL_SECTOR_BUCKETS.map((b) => ({
        id: b.id,
        name: b.name,
        sector: b.sector,
        subsector: b.subsector,
        sicCodes: b.sicCodes,
        state: b.state,
      })),
      usage: {
        byId: "GET ?id=ny-construction-plumbers",
        bySIC: "GET ?sic=1711",
        bySector: "GET ?sector=construction-contractors",
        national: "GET ?national=true",
      },
    });
  } catch (error) {
    console.error("[Sector Buckets] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get buckets",
      },
      { status: 500 },
    );
  }
}

// POST - Initialize sector buckets in DO Spaces
export async function POST(request: NextRequest) {
  try {
    const { userId } = await apiAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!SPACES_KEY || !SPACES_SECRET) {
      return NextResponse.json(
        {
          error: "DO Spaces credentials not configured",
          required: ["SPACES_KEY", "SPACES_SECRET"],
        },
        { status: 503 },
      );
    }

    const body = await request.json();
    const { action, bucketIds, sicCode, state = "NY" } = body;

    // Initialize specific buckets by ID
    if (action === "init" && bucketIds && Array.isArray(bucketIds)) {
      const results = await initializeBuckets(
        bucketIds.map((id: string) => BUCKET_BY_ID[id]).filter(Boolean),
      );
      return NextResponse.json({
        success: true,
        action: "init",
        ...results,
      });
    }

    // Initialize all buckets for a specific SIC code
    if (action === "init" && sicCode) {
      const bucket = getBucketForSIC(sicCode);
      if (!bucket) {
        return NextResponse.json(
          { error: `No bucket defined for SIC ${sicCode}` },
          { status: 404 },
        );
      }
      const results = await initializeBuckets([bucket]);
      return NextResponse.json({
        success: true,
        action: "init",
        sicCode,
        ...results,
      });
    }

    // Initialize all buckets
    if (action === "init-all") {
      const results = await initializeBuckets(ALL_SECTOR_BUCKETS);
      return NextResponse.json({
        success: true,
        action: "init-all",
        ...results,
      });
    }

    // Initialize national buckets only
    if (action === "init-national") {
      const results = await initializeBuckets(NATIONAL_BUCKETS);
      return NextResponse.json({
        success: true,
        action: "init-national",
        ...results,
      });
    }

    return NextResponse.json(
      {
        error: "Invalid action",
        validActions: [
          "init - Initialize specific buckets by ID",
          "init-all - Initialize all sector buckets",
          "init-national - Initialize national buckets only",
        ],
        example: {
          action: "init",
          bucketIds: [
            "ny-construction-plumbers",
            "us-construction-plumbers-hvac",
          ],
        },
      },
      { status: 400 },
    );
  } catch (error) {
    console.error("[Sector Buckets] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to initialize buckets",
      },
      { status: 500 },
    );
  }
}

// Helper to initialize buckets in DO Spaces
async function initializeBuckets(buckets: SectorBucket[]) {
  const results: Array<{
    id: string;
    path: string;
    status: "created" | "exists" | "error";
    error?: string;
  }> = [];
  let created = 0;
  let existing = 0;
  let errors = 0;

  for (const bucket of buckets) {
    try {
      // Check if bucket index exists
      let exists = false;
      try {
        await s3Client.send(
          new ListObjectsV2Command({
            Bucket: SPACES_BUCKET,
            Prefix: bucket.storagePath,
            MaxKeys: 1,
          }),
        );
        // Check for index.json specifically
        try {
          await s3Client.send(
            new GetObjectCommand({
              Bucket: SPACES_BUCKET,
              Key: `${bucket.storagePath}index.json`,
            }),
          );
          exists = true;
        } catch {
          // No index = not initialized
        }
      } catch {
        // Folder doesn't exist
      }

      if (exists) {
        results.push({
          id: bucket.id,
          path: bucket.storagePath,
          status: "exists",
        });
        existing++;
        continue;
      }

      // Create bucket index file
      const index = {
        bucketId: bucket.id,
        name: bucket.name,
        sector: bucket.sector,
        subsector: bucket.subsector,
        sicCodes: bucket.sicCodes,
        state: bucket.state,
        description: bucket.description,
        storagePath: bucket.storagePath,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalRecords: 0,
        enrichedRecords: 0,
        skipTracedRecords: 0,
        files: [],
        indexes: {
          byState: {},
          byCounty: {},
          byCity: {},
        },
      };

      await s3Client.send(
        new PutObjectCommand({
          Bucket: SPACES_BUCKET,
          Key: `${bucket.storagePath}index.json`,
          Body: JSON.stringify(index, null, 2),
          ContentType: "application/json",
        }),
      );

      // Create raw/ subfolder marker
      await s3Client.send(
        new PutObjectCommand({
          Bucket: SPACES_BUCKET,
          Key: `${bucket.storagePath}raw/.folder`,
          Body: JSON.stringify({ created: new Date().toISOString() }),
          ContentType: "application/json",
        }),
      );

      // Create processed/ subfolder marker
      await s3Client.send(
        new PutObjectCommand({
          Bucket: SPACES_BUCKET,
          Key: `${bucket.storagePath}processed/.folder`,
          Body: JSON.stringify({ created: new Date().toISOString() }),
          ContentType: "application/json",
        }),
      );

      // Create enriched/ subfolder marker
      await s3Client.send(
        new PutObjectCommand({
          Bucket: SPACES_BUCKET,
          Key: `${bucket.storagePath}enriched/.folder`,
          Body: JSON.stringify({ created: new Date().toISOString() }),
          ContentType: "application/json",
        }),
      );

      results.push({
        id: bucket.id,
        path: bucket.storagePath,
        status: "created",
      });
      created++;
    } catch (error) {
      results.push({
        id: bucket.id,
        path: bucket.storagePath,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      });
      errors++;
    }
  }

  return {
    total: buckets.length,
    created,
    existing,
    errors,
    results,
  };
}
