import { NextRequest, NextResponse } from "next/server";

// In-memory storage for demo - in production, use database
let globalData: Record<string, string>[] = [];
let globalHeaders: string[] = [];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

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
    globalHeaders = headers;

    const records: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        record[header] = values[index] || "";
      });
      records.push(record);
    }

    globalData = records;

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

    if (globalData.length === 0) {
      return NextResponse.json({
        data: [],
        headers: [],
        totalRecords: 0,
        totalPages: 0,
        currentPage: 1,
      });
    }

    const filteredData = globalData.filter((record) =>
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
      headers: globalHeaders,
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
