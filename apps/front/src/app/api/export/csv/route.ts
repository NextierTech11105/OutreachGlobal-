import { NextRequest, NextResponse } from "next/server";
import { uploadCSV, isSpacesAvailable } from "@/lib/spaces";

interface ExportCSVRequest {
  data: Record<string, unknown>[];
  filename?: string;
  folder?: string;
}

// POST /api/export/csv - Export data to CSV and upload to Spaces
export async function POST(request: NextRequest) {
  try {
    const body: ExportCSVRequest = await request.json();

    if (!body.data || !Array.isArray(body.data) || body.data.length === 0) {
      return NextResponse.json({ error: "Data array is required" }, { status: 400 });
    }

    // Generate CSV content
    const headers = Object.keys(body.data[0]);
    const csvRows = [
      headers.join(","),
      ...body.data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            // Escape values with commas or quotes
            if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value ?? "";
          })
          .join(",")
      ),
    ];
    const csvContent = csvRows.join("\n");

    const filename = body.filename || `export-${Date.now()}.csv`;
    const folder = body.folder || "exports";

    // If Spaces is configured, upload there
    if (isSpacesAvailable()) {
      const result = await uploadCSV(filename, csvContent, folder);

      if (result) {
        return NextResponse.json({
          success: true,
          url: result.cdnUrl,
          directUrl: result.url,
          filename,
          rows: body.data.length,
          size: csvContent.length,
        });
      }
    }

    // Fallback: return CSV as base64 for client-side download
    const base64 = Buffer.from(csvContent).toString("base64");

    return NextResponse.json({
      success: true,
      fallback: true,
      base64,
      filename,
      rows: body.data.length,
      size: csvContent.length,
      message: "Spaces not configured. Use base64 for client download.",
    });
  } catch (error) {
    console.error("[Export CSV] Error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
