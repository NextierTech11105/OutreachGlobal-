import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appState } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Data Browser API
 * Uses appState table for persistence.
 */

interface BrowserData {
  headers: string[];
  records: Record<string, string>[];
  uploadedAt: string;
  fileName?: string;
}

// Helper to get browser data from database
async function getBrowserData(teamId: string): Promise<BrowserData | null> {
  const key = `data_browser:${teamId}`;
  const [state] = await db
    .select()
    .from(appState)
    .where(and(eq(appState.key, key), eq(appState.teamId, teamId)))
    .limit(1);

  return state?.value as BrowserData | null;
}

// Helper to save browser data to database
async function saveBrowserData(
  teamId: string,
  data: BrowserData
): Promise<void> {
  const key = `data_browser:${teamId}`;

  const [existing] = await db
    .select()
    .from(appState)
    .where(and(eq(appState.key, key), eq(appState.teamId, teamId)))
    .limit(1);

  if (existing) {
    await db
      .update(appState)
      .set({ value: data, updatedAt: new Date() })
      .where(eq(appState.id, existing.id));
  } else {
    await db.insert(appState).values({
      id: `as_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      teamId,
      key,
      value: data,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const teamId = formData.get("teamId")?.toString() || "default";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());

    if (lines.length === 0) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }

    const headerLine = lines[0];
    const headers = headerLine.split(",").map((h) => h.trim());

    const records: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        record[header] = values[index] || "";
      });
      records.push(record);
    }

    // Save to database
    const browserData: BrowserData = {
      headers,
      records,
      uploadedAt: new Date().toISOString(),
      fileName: file.name,
    };
    await saveBrowserData(teamId, browserData);

    return NextResponse.json({
      message: "Data uploaded successfully",
      recordCount: records.length,
      headers,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to process file" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "100");
    const searchTerm = searchParams.get("search") || "";
    const teamId = searchParams.get("teamId") || "default";

    // Get data from database
    const browserData = await getBrowserData(teamId);

    if (!browserData || browserData.records.length === 0) {
      return NextResponse.json({
        data: [],
        headers: [],
        totalRecords: 0,
        totalPages: 0,
        currentPage: 1,
      });
    }

    const filteredData = browserData.records.filter((record) =>
      Object.values(record).some((value) =>
        value.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    );

    const totalRecords = filteredData.length;
    const totalPages = Math.ceil(totalRecords / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    return NextResponse.json({
      data: paginatedData,
      headers: browserData.headers,
      totalRecords,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Get data error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 },
    );
  }
}
