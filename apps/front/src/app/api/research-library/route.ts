import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

// DigitalOcean Spaces configuration
const SPACES_ENDPOINT = process.env.SPACES_ENDPOINT || "https://nyc3.digitaloceanspaces.com";
const SPACES_REGION = process.env.SPACES_REGION || "nyc3";
const SPACES_KEY = process.env.SPACES_KEY || process.env.DO_SPACES_KEY || "";
const SPACES_SECRET = process.env.SPACES_SECRET || process.env.DO_SPACES_SECRET || "";
const SPACES_BUCKET = process.env.SPACES_BUCKET || process.env.DO_SPACES_BUCKET || "nextier-data";

const s3Client = new S3Client({
  endpoint: SPACES_ENDPOINT,
  region: SPACES_REGION,
  credentials: {
    accessKeyId: SPACES_KEY,
    secretAccessKey: SPACES_SECRET,
  },
  forcePathStyle: false,
});

const RESEARCH_PREFIX = "research-library/";

interface FolderItem {
  id: string;
  name: string;
  type: "folder" | "report";
  path: string;
  createdAt: string;
  updatedAt?: string;
  size?: number;
  metadata?: {
    address?: string;
    propertyType?: string;
    estimatedValue?: number;
    city?: string;
    state?: string;
  };
}

// In-memory folder structure (would be database in production)
// This maps folder paths to their contents
let folderStructure: Record<string, FolderItem[]> = {
  "/": [
    { id: "default-1", name: "Active Deals", type: "folder", path: "/Active Deals", createdAt: new Date().toISOString() },
    { id: "default-2", name: "Research", type: "folder", path: "/Research", createdAt: new Date().toISOString() },
    { id: "default-3", name: "Archived", type: "folder", path: "/Archived", createdAt: new Date().toISOString() },
  ],
  "/Active Deals": [],
  "/Research": [],
  "/Archived": [],
};

// GET - List folders and files
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path") || "/";
    const reportId = searchParams.get("reportId");

    // If reportId provided, fetch specific report
    if (reportId) {
      try {
        const command = new GetObjectCommand({
          Bucket: SPACES_BUCKET,
          Key: `${RESEARCH_PREFIX}reports/${reportId}.json`,
        });
        const response = await s3Client.send(command);
        const body = await response.Body?.transformToString();
        if (body) {
          return NextResponse.json({ success: true, report: JSON.parse(body) });
        }
      } catch {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }
    }

    // List items in path
    const items = folderStructure[path] || [];

    // Also try to list from Spaces
    try {
      const prefix = `${RESEARCH_PREFIX}${path === "/" ? "" : path.slice(1) + "/"}`;
      const command = new ListObjectsV2Command({
        Bucket: SPACES_BUCKET,
        Prefix: prefix,
        Delimiter: "/",
      });
      const response = await s3Client.send(command);

      // Add folders from Spaces
      if (response.CommonPrefixes) {
        for (const prefix of response.CommonPrefixes) {
          const folderName = prefix.Prefix?.replace(RESEARCH_PREFIX, "").replace(/\/$/, "").split("/").pop();
          if (folderName && !items.some(i => i.name === folderName && i.type === "folder")) {
            items.push({
              id: `spaces-${folderName}`,
              name: folderName,
              type: "folder",
              path: `${path}${path === "/" ? "" : "/"}${folderName}`,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }

      // Add files from Spaces
      if (response.Contents) {
        for (const obj of response.Contents) {
          if (obj.Key?.endsWith(".json") && obj.Key !== prefix) {
            const fileName = obj.Key.replace(prefix, "").replace(".json", "");
            if (fileName && !items.some(i => i.name === fileName)) {
              items.push({
                id: obj.Key,
                name: fileName,
                type: "report",
                path: `${path}${path === "/" ? "" : "/"}${fileName}`,
                createdAt: obj.LastModified?.toISOString() || new Date().toISOString(),
                size: obj.Size,
              });
            }
          }
        }
      }
    } catch (err) {
      console.log("[Research Library] Spaces listing error (may not be configured):", err);
    }

    return NextResponse.json({
      success: true,
      path,
      items,
      breadcrumbs: path.split("/").filter(Boolean),
    });
  } catch (error) {
    console.error("[Research Library] Error:", error);
    return NextResponse.json({ error: "Failed to list items" }, { status: 500 });
  }
}

// POST - Create folder or save report
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, path, name, report } = body;

    if (action === "createFolder") {
      // Create a new folder
      const parentPath = path || "/";
      const folderPath = `${parentPath}${parentPath === "/" ? "" : "/"}${name}`;

      if (!folderStructure[parentPath]) {
        folderStructure[parentPath] = [];
      }

      const newFolder: FolderItem = {
        id: `folder-${Date.now()}`,
        name,
        type: "folder",
        path: folderPath,
        createdAt: new Date().toISOString(),
      };

      folderStructure[parentPath].push(newFolder);
      folderStructure[folderPath] = [];

      // Also create in Spaces
      try {
        const spacesPath = `${RESEARCH_PREFIX}${folderPath.slice(1)}/.folder`;
        await s3Client.send(new PutObjectCommand({
          Bucket: SPACES_BUCKET,
          Key: spacesPath,
          Body: JSON.stringify({ created: new Date().toISOString() }),
          ContentType: "application/json",
        }));
      } catch (err) {
        console.log("[Research Library] Spaces folder creation skipped:", err);
      }

      return NextResponse.json({ success: true, folder: newFolder });
    }

    if (action === "saveReport") {
      // Save a valuation report to a folder
      const targetPath = path || "/Research";
      const reportId = `report-${Date.now()}`;
      const reportName = name || report?.property?.address?.address || `Report ${reportId}`;

      const reportData = {
        id: reportId,
        name: reportName,
        savedAt: new Date().toISOString(),
        path: targetPath,
        report,
      };

      // Save to Spaces
      try {
        const spacesKey = `${RESEARCH_PREFIX}reports/${reportId}.json`;
        await s3Client.send(new PutObjectCommand({
          Bucket: SPACES_BUCKET,
          Key: spacesKey,
          Body: JSON.stringify(reportData),
          ContentType: "application/json",
          ACL: "private",
        }));
      } catch (err) {
        console.log("[Research Library] Spaces save error:", err);
      }

      // Add to folder structure
      if (!folderStructure[targetPath]) {
        folderStructure[targetPath] = [];
      }

      const reportItem: FolderItem = {
        id: reportId,
        name: reportName,
        type: "report",
        path: `${targetPath}/${reportName}`,
        createdAt: new Date().toISOString(),
        metadata: {
          address: report?.property?.address?.address,
          propertyType: report?.property?.propertyType,
          estimatedValue: report?.property?.estimatedValue || report?.valuation?.estimatedValue,
          city: report?.property?.address?.city,
          state: report?.property?.address?.state,
        },
      };

      folderStructure[targetPath].push(reportItem);

      return NextResponse.json({
        success: true,
        report: reportItem,
        shareableUrl: `/t/team/research-library?report=${reportId}`,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[Research Library] Error:", error);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

// DELETE - Delete folder or report
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");
    const id = searchParams.get("id");

    if (!path || !id) {
      return NextResponse.json({ error: "Path and ID required" }, { status: 400 });
    }

    // Remove from folder structure
    const parentPath = path.split("/").slice(0, -1).join("/") || "/";
    if (folderStructure[parentPath]) {
      folderStructure[parentPath] = folderStructure[parentPath].filter(item => item.id !== id);
    }

    // Try to delete from Spaces
    try {
      if (id.startsWith("report-")) {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: SPACES_BUCKET,
          Key: `${RESEARCH_PREFIX}reports/${id}.json`,
        }));
      }
    } catch (err) {
      console.log("[Research Library] Spaces delete error:", err);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Research Library] Error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
