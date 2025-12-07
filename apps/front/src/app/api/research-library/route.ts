import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

// DigitalOcean Spaces configuration
const SPACES_ENDPOINT = process.env.SPACES_ENDPOINT || "https://nyc3.digitaloceanspaces.com";
const SPACES_REGION = process.env.SPACES_REGION || "nyc3";
const SPACES_KEY = process.env.SPACES_KEY || process.env.DO_SPACES_KEY || "";
const SPACES_SECRET = process.env.SPACES_SECRET || process.env.DO_SPACES_SECRET || "";
const SPACES_BUCKET = process.env.SPACES_BUCKET || process.env.DO_SPACES_BUCKET || "nextier";

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

// Generate a clean lead ID from address for bucket folder
function generateLeadId(address: { address?: string; city?: string; state?: string; zipCode?: string }): string {
  const parts = [
    address.address?.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase().slice(0, 50),
    address.city?.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase(),
    address.state?.toLowerCase(),
  ].filter(Boolean);

  return parts.join("-") || `lead-${Date.now()}`;
}

interface FolderItem {
  id: string;
  name: string;
  type: "folder" | "report";
  path: string;
  createdAt: string;
  updatedAt?: string;
  size?: number;
  reportType?: ReportType;
  metadata?: {
    // Property valuation fields
    address?: string;
    propertyType?: string;
    estimatedValue?: number;
    city?: string;
    state?: string;
    // Business evaluation fields
    companyName?: string;
    industry?: string;
    revenue?: number;
    employees?: number;
    sicCode?: string;
    // AI Blueprint fields
    blueprintType?: string;
    complexity?: string;
    estimatedCost?: number;
  };
}

// Report types supported
type ReportType = "property-valuation" | "business-evaluation" | "ai-blueprint" | "generic";

// In-memory folder structure (would be database in production)
// This maps folder paths to their contents
let folderStructure: Record<string, FolderItem[]> = {
  "/": [
    { id: "default-1", name: "Active Deals", type: "folder", path: "/Active Deals", createdAt: new Date().toISOString() },
    { id: "default-2", name: "Property Valuations", type: "folder", path: "/Property Valuations", createdAt: new Date().toISOString() },
    { id: "default-3", name: "Business Evaluations", type: "folder", path: "/Business Evaluations", createdAt: new Date().toISOString() },
    { id: "default-4", name: "AI Blueprints", type: "folder", path: "/AI Blueprints", createdAt: new Date().toISOString() },
    { id: "default-5", name: "Research", type: "folder", path: "/Research", createdAt: new Date().toISOString() },
    { id: "default-6", name: "Archived", type: "folder", path: "/Archived", createdAt: new Date().toISOString() },
  ],
  "/Active Deals": [],
  "/Property Valuations": [],
  "/Business Evaluations": [],
  "/AI Blueprints": [],
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
      // Save a valuation report - each lead gets their own folder
      const targetPath = path || "/Research";
      const reportId = `report-${Date.now()}`;
      const reportName = name || report?.property?.address?.address || `Report ${reportId}`;

      // Generate lead folder ID from address or name (normalized for bucket path)
      const leadId = generateLeadId(report?.property?.address || { address: reportName });

      const reportData = {
        id: reportId,
        leadId,
        name: reportName,
        savedAt: new Date().toISOString(),
        path: targetPath,
        status: "hot", // All saved reports are HOT leads - confirmed numbers, active pursuit
        report,
      };

      // Save to lead's folder structure:
      // leads/{leadId}/
      //   - valuation-reports/   <- property valuations
      //   - inbound-sms/         <- SMS responses
      //   - shared/              <- public shareable versions
      //   - documents/           <- other files
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://monkfish-app-mb7h3.ondigitalocean.app";
      const cdnUrl = `https://${SPACES_BUCKET}.${SPACES_REGION}.cdn.digitaloceanspaces.com`;
      let htmlUrl = null;

      try {
        // Save valuation report to lead's valuation-reports folder
        const spacesKey = `leads/${leadId}/valuation-reports/${reportId}.json`;
        await s3Client.send(new PutObjectCommand({
          Bucket: SPACES_BUCKET,
          Key: spacesKey,
          Body: JSON.stringify(reportData),
          ContentType: "application/json",
          ACL: "private",
        }));

        // Also save to research-library for backwards compatibility
        const legacyKey = `${RESEARCH_PREFIX}reports/${reportId}.json`;
        await s3Client.send(new PutObjectCommand({
          Bucket: SPACES_BUCKET,
          Key: legacyKey,
          Body: JSON.stringify(reportData),
          ContentType: "application/json",
          ACL: "private",
        }));

        // Generate shareable HTML version
        const htmlContent = generateShareableHTML(reportData);
        const htmlKey = `leads/${leadId}/shared/${reportId}.html`;
        await s3Client.send(new PutObjectCommand({
          Bucket: SPACES_BUCKET,
          Key: htmlKey,
          Body: htmlContent,
          ContentType: "text/html",
          ACL: "public-read",
        }));
        htmlUrl = `${cdnUrl}/${htmlKey}`;
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
        leadId,
        leadFolder: `leads/${leadId}`,
        shareableUrl: `${baseUrl}/report/${reportId}`,
        htmlUrl,
        status: "hot",
        message: "HOT LEAD saved! Share the link directly via SMS or copy the URL.",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[Research Library] Error:", error);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

// Generate shareable HTML for report
function generateShareableHTML(data: {
  id: string;
  name: string;
  savedAt: string;
  report: {
    property?: {
      address?: { address?: string; city?: string; state?: string; zipCode?: string };
      yearBuilt?: number;
      squareFeet?: number;
      bedrooms?: number;
      bathrooms?: number;
    };
    valuation?: {
      estimatedValue?: number;
      confidence?: number;
      pricePerSqFt?: number;
    };
    neighborhood?: {
      appreciation?: number;
    };
    aiAnalysis?: {
      summary?: string;
      strengths?: string[];
    };
  };
}) {
  const { report } = data;
  const property = report?.property || {};
  const valuation = report?.valuation || {};
  const address = property.address || {};
  const estimatedValue = valuation.estimatedValue || 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Property Valuation - ${address.address || data.name}</title>
  <meta property="og:title" content="Property Valuation: ${address.address || data.name}">
  <meta property="og:description" content="Estimated Value: ${formatCurrency(estimatedValue)}">
  <meta property="og:type" content="website">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #e2e8f0;
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container { max-width: 600px; margin: 0 auto; }
    .header {
      text-align: center;
      margin-bottom: 32px;
      padding: 32px;
      background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%);
      border-radius: 20px;
    }
    .logo { font-size: 20px; font-weight: bold; margin-bottom: 16px; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    .location { color: #94a3b8; font-size: 16px; margin-bottom: 20px; }
    .value-box {
      background: rgba(16, 185, 129, 0.2);
      padding: 20px;
      border-radius: 12px;
      display: inline-block;
    }
    .value { font-size: 36px; font-weight: bold; color: #4ade80; }
    .value-label { color: #94a3b8; font-size: 12px; }
    .section {
      background: rgba(30, 41, 59, 0.8);
      padding: 24px;
      border-radius: 16px;
      margin-bottom: 20px;
      border: 1px solid rgba(148, 163, 184, 0.1);
    }
    .section h2 { font-size: 18px; margin-bottom: 16px; color: #60a5fa; }
    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .stat {
      text-align: center;
      padding: 16px;
      background: rgba(15, 23, 42, 0.6);
      border-radius: 10px;
    }
    .stat-value { font-size: 24px; font-weight: bold; }
    .stat-label { font-size: 11px; color: #64748b; margin-top: 4px; }
    .footer {
      text-align: center;
      margin-top: 32px;
      color: #64748b;
      font-size: 11px;
    }
    .cta {
      display: block;
      text-align: center;
      background: #3b82f6;
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 600;
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">NexTier</div>
      <h1>${address.address || data.name}</h1>
      <div class="location">${[address.city, address.state, address.zipCode].filter(Boolean).join(", ")}</div>
      <div class="value-box">
        <div class="value">${formatCurrency(estimatedValue)}</div>
        <div class="value-label">Estimated Value</div>
      </div>
    </div>

    <div class="section">
      <h2>Property Details</h2>
      <div class="stats-grid">
        <div class="stat">
          <div class="stat-value">${property.bedrooms || "—"}</div>
          <div class="stat-label">Bedrooms</div>
        </div>
        <div class="stat">
          <div class="stat-value">${property.bathrooms || "—"}</div>
          <div class="stat-label">Bathrooms</div>
        </div>
        <div class="stat">
          <div class="stat-value">${property.squareFeet?.toLocaleString() || "—"}</div>
          <div class="stat-label">Sq Ft</div>
        </div>
        <div class="stat">
          <div class="stat-value">${property.yearBuilt || "—"}</div>
          <div class="stat-label">Year Built</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Valuation</h2>
      <div class="stats-grid">
        <div class="stat">
          <div class="stat-value">${valuation.confidence || 94}%</div>
          <div class="stat-label">Confidence</div>
        </div>
        <div class="stat">
          <div class="stat-value">$${valuation.pricePerSqFt || (property.squareFeet ? Math.round(estimatedValue / property.squareFeet) : "—")}</div>
          <div class="stat-label">Per Sq Ft</div>
        </div>
      </div>
    </div>

    ${report.aiAnalysis?.summary ? `
    <div class="section">
      <h2>AI Analysis</h2>
      <p style="color: #cbd5e1; line-height: 1.5; font-size: 14px;">${report.aiAnalysis.summary}</p>
    </div>
    ` : ""}

    <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://monkfish-app-mb7h3.ondigitalocean.app"}/report/${data.id}" class="cta">View Full Report</a>

    <div class="footer">
      <p>Report generated ${new Date(data.savedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
      <p style="margin-top: 8px;">Powered by NexTier Property Intelligence</p>
    </div>
  </div>
</body>
</html>`;
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
