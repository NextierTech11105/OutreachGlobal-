/**
 * LUCI Internal Import API
 * Fetch CSV from DO Spaces path and start pipeline
 *
 * POST /api/luci/import
 * { filePath: "imports/plumbing_list.csv", sectorTag: "plumbing-hvac" }
 */

import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// DO Spaces config
const SPACES_ENDPOINT = process.env.DO_SPACES_ENDPOINT || "https://nyc3.digitaloceanspaces.com";
const SPACES_BUCKET = process.env.DO_SPACES_BUCKET || "nextier-data";
const SPACES_KEY = process.env.DO_SPACES_KEY || "";
const SPACES_SECRET = process.env.DO_SPACES_SECRET || "";

interface ImportRequest {
  filePath: string; // Path in DO Spaces: "imports/plumbing_list.csv"
  sectorTag: string;
  dailyTarget?: 500 | 1000 | 2000;
  traceType?: "normal" | "enhanced";
  columnMapping?: Record<string, string>;
}

export async function POST(req: NextRequest) {
  try {
    const body: ImportRequest = await req.json();

    if (!body.filePath || !body.sectorTag) {
      return NextResponse.json(
        { success: false, error: "filePath and sectorTag required" },
        { status: 400 }
      );
    }

    // Fetch file from DO Spaces
    const fileUrl = `${SPACES_ENDPOINT}/${SPACES_BUCKET}/${body.filePath}`;

    const fileRes = await fetch(fileUrl, {
      headers: SPACES_KEY ? {
        // Add auth if private bucket
        "Authorization": `AWS ${SPACES_KEY}:${SPACES_SECRET}`,
      } : {},
    });

    if (!fileRes.ok) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch file: ${fileRes.status}` },
        { status: 400 }
      );
    }

    const csvData = await fileRes.text();
    const csvBuffer = Buffer.from(csvData, "utf-8");

    // Create form data for API
    const formData = new FormData();
    formData.append("file", new Blob([csvBuffer], { type: "text/csv" }), body.filePath.split("/").pop() || "import.csv");
    formData.append("sectorTag", body.sectorTag);
    formData.append("dailyTarget", (body.dailyTarget || 2000).toString());
    if (body.traceType) {
      formData.append("traceType", body.traceType);
    }
    if (body.columnMapping) {
      formData.append("columnMapping", JSON.stringify(body.columnMapping));
    }

    // Forward to LUCI pipeline
    const token = req.headers.get("authorization");
    const pipelineRes = await fetch(`${API_URL}/luci/pipeline/start`, {
      method: "POST",
      headers: token ? { Authorization: token } : {},
      body: formData,
    });

    const result = await pipelineRes.json();

    return NextResponse.json({
      success: true,
      data: {
        ...result.data,
        source: body.filePath,
      },
    });
  } catch (error) {
    console.error("LUCI import error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/luci/import?path=imports/
 * List available files in DO Spaces path
 */
export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path") || "imports/";

  try {
    // List objects in DO Spaces
    // For now, return example structure
    // TODO: Implement actual S3 ListObjects

    return NextResponse.json({
      success: true,
      data: {
        path,
        files: [
          { name: "plumbing_austin_jan2026.csv", size: 2450000, modified: "2026-01-15" },
          { name: "consultants_nyc_batch1.csv", size: 1800000, modified: "2026-01-14" },
          { name: "realtors_miami.csv", size: 3200000, modified: "2026-01-12" },
        ],
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to list files" },
      { status: 500 }
    );
  }
}
