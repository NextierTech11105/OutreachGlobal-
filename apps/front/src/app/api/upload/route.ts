import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

// DigitalOcean Spaces configuration
const s3Client = new S3Client({
  endpoint: "https://nyc3.digitaloceanspaces.com",
  region: "nyc3",
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY || "",
    secretAccessKey: process.env.DO_SPACES_SECRET || "",
  },
  forcePathStyle: false,
});

const BUCKET_NAME = "nextier";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "uploads";
    const tags = (formData.get("tags") as string) || "";
    const source = (formData.get("source") as string) || "manual";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Generate unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `${folder}/${timestamp}_${safeName}`;

    // Read file content
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to DigitalOcean Spaces
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type || "text/csv",
      ACL: "private",
      Metadata: {
        "original-name": file.name,
        "uploaded-at": new Date().toISOString(),
        source: source,
        tags: tags,
        size: String(file.size),
      },
    });

    await s3Client.send(command);

    // Parse CSV if it's a CSV file
    let recordCount = 0;
    let headers: string[] = [];
    const preview: Record<string, string>[] = [];

    if (file.name.endsWith(".csv") || file.type === "text/csv") {
      const content = buffer.toString("utf-8");
      const lines = content.split("\n").filter((line) => line.trim());

      if (lines.length > 0) {
        headers = lines[0]
          .split(",")
          .map((h) => h.trim().replace(/^"|"$/g, ""));
        recordCount = lines.length - 1;

        // Get preview (first 5 rows)
        for (let i = 1; i <= Math.min(5, lines.length - 1); i++) {
          const values = lines[i]
            .split(",")
            .map((v) => v.trim().replace(/^"|"$/g, ""));
          const row: Record<string, string> = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx] || "";
          });
          preview.push(row);
        }
      }
    }

    return NextResponse.json({
      success: true,
      file: {
        key,
        name: file.name,
        size: file.size,
        type: file.type,
        url: `https://${BUCKET_NAME}.nyc3.digitaloceanspaces.com/${key}`,
      },
      csv: {
        headers,
        recordCount,
        preview,
      },
      metadata: {
        source,
        tags: tags.split(",").filter(Boolean),
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed", details: error.message },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const folder = searchParams.get("folder") || "uploads";
    const limit = parseInt(searchParams.get("limit") || "50");

    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: folder + "/",
      MaxKeys: limit,
    });

    const response = await s3Client.send(command);

    const files = (response.Contents || []).map((item) => ({
      key: item.Key,
      size: item.Size,
      lastModified: item.LastModified,
      url: `https://${BUCKET_NAME}.nyc3.digitaloceanspaces.com/${item.Key}`,
    }));

    return NextResponse.json({
      files,
      count: files.length,
      folder,
    });
  } catch (error: any) {
    console.error("List files error:", error);
    return NextResponse.json(
      { error: "Failed to list files", details: error.message },
      { status: 500 },
    );
  }
}
