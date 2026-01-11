import { sf, sfd } from "@/lib/utils/safe-format";
import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

// DigitalOcean Spaces configuration
const SPACES_ENDPOINT =
  process.env.SPACES_ENDPOINT || "https://nyc3.digitaloceanspaces.com";
const SPACES_REGION = process.env.SPACES_REGION || "nyc3";
const SPACES_KEY = process.env.SPACES_KEY || process.env.DO_SPACES_KEY || "";
const SPACES_SECRET =
  process.env.SPACES_SECRET || process.env.DO_SPACES_SECRET || "";
const SPACES_BUCKET =
  process.env.SPACES_BUCKET || process.env.DO_SPACES_BUCKET || "nextier";

// Only create S3 client if credentials are configured
const SPACES_CONFIGURED = Boolean(SPACES_KEY && SPACES_SECRET);

const s3Client = SPACES_CONFIGURED
  ? new S3Client({
      endpoint: SPACES_ENDPOINT,
      region: SPACES_REGION,
      credentials: {
        accessKeyId: SPACES_KEY,
        secretAccessKey: SPACES_SECRET,
      },
      forcePathStyle: true,
    })
  : null;

const RESEARCH_PREFIX = "research-library/";

// Generate a clean lead ID from address for bucket folder
function generateLeadId(address: {
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}): string {
  const parts = [
    address.address
      ?.replace(/[^a-zA-Z0-9]/g, "-")
      .toLowerCase()
      .slice(0, 50),
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
type ReportType =
  | "property-valuation"
  | "business-evaluation"
  | "ai-blueprint"
  | "generic";

// In-memory folder structure (would be database in production)
// This maps folder paths to their contents
const folderStructure: Record<string, FolderItem[]> = {
  "/": [
    {
      id: "default-1",
      name: "Active Deals",
      type: "folder",
      path: "/Active Deals",
      createdAt: new Date().toISOString(),
    },
    {
      id: "default-2",
      name: "Property Valuations",
      type: "folder",
      path: "/Property Valuations",
      createdAt: new Date().toISOString(),
    },
    {
      id: "default-3",
      name: "Business Evaluations",
      type: "folder",
      path: "/Business Evaluations",
      createdAt: new Date().toISOString(),
    },
    {
      id: "default-4",
      name: "AI Blueprints",
      type: "folder",
      path: "/AI Blueprints",
      createdAt: new Date().toISOString(),
    },
    {
      id: "default-5",
      name: "Research",
      type: "folder",
      path: "/Research",
      createdAt: new Date().toISOString(),
    },
    {
      id: "default-6",
      name: "Archived",
      type: "folder",
      path: "/Archived",
      createdAt: new Date().toISOString(),
    },
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
        return NextResponse.json(
          { error: "Report not found" },
          { status: 404 },
        );
      }
    }

    // List items in path
    const items = folderStructure[path] || [];

    // Also try to list from Spaces (only if configured)
    if (s3Client && SPACES_CONFIGURED) {
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
            const folderName = prefix.Prefix?.replace(RESEARCH_PREFIX, "")
              .replace(/\/$/, "")
              .split("/")
              .pop();
            if (
              folderName &&
              !items.some((i) => i.name === folderName && i.type === "folder")
            ) {
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
              if (fileName && !items.some((i) => i.name === fileName)) {
                items.push({
                  id: obj.Key,
                  name: fileName,
                  type: "report",
                  path: `${path}${path === "/" ? "" : "/"}${fileName}`,
                  createdAt:
                    obj.LastModified?.toISOString() || new Date().toISOString(),
                  size: obj.Size,
                });
              }
            }
          }
        }
      } catch (err) {
        // Silently skip if Spaces is not configured or has auth issues
        // Reports will still work from in-memory storage
      }
    }

    return NextResponse.json({
      success: true,
      path,
      items,
      breadcrumbs: path.split("/").filter(Boolean),
    });
  } catch (error) {
    console.error("[Research Library] Error:", error);
    return NextResponse.json(
      { error: "Failed to list items" },
      { status: 500 },
    );
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

      // Also create in Spaces (if configured)
      if (s3Client) {
        try {
          const spacesPath = `${RESEARCH_PREFIX}${folderPath.slice(1)}/.folder`;
          await s3Client.send(
            new PutObjectCommand({
              Bucket: SPACES_BUCKET,
              Key: spacesPath,
              Body: JSON.stringify({ created: new Date().toISOString() }),
              ContentType: "application/json",
            }),
          );
        } catch {
          // Spaces not configured - continue without cloud storage
        }
      }

      return NextResponse.json({ success: true, folder: newFolder });
    }

    if (action === "saveReport") {
      // Save a valuation report - each lead gets their own folder
      const targetPath = path || "/Research";
      const reportId = `report-${Date.now()}`;
      const reportName =
        name || report?.property?.address?.address || `Report ${reportId}`;

      // Generate lead folder ID from address or name (normalized for bucket path)
      const leadId = generateLeadId(
        report?.property?.address || { address: reportName },
      );

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
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        "https://monkfish-app-mb7h3.ondigitalocean.app";
      const cdnUrl = `https://${SPACES_BUCKET}.${SPACES_REGION}.cdn.digitaloceanspaces.com`;
      let htmlUrl = null;

      // Save to Spaces (if configured)
      if (s3Client) {
        try {
          // Save valuation report to lead's valuation-reports folder
          const spacesKey = `leads/${leadId}/valuation-reports/${reportId}.json`;
          await s3Client.send(
            new PutObjectCommand({
              SPACES_BUCKET,
              Key: spacesKey,
              Body: JSON.stringify(reportData),
              ContentType: "application/json",
              ACL: "private",
            }),
          );

          // Also save to research-library for backwards compatibility
          const legacyKey = `${RESEARCH_PREFIX}reports/${reportId}.json`;
          await s3Client.send(
            new PutObjectCommand({
              Bucket: SPACES_BUCKET,
              Key: legacyKey,
              Body: JSON.stringify(reportData),
              ContentType: "application/json",
              ACL: "private",
            }),
          );

          // Generate shareable HTML version
          const htmlContent = generateShareableHTML(reportData);
          const htmlKey = `leads/${leadId}/shared/${reportId}.html`;
          await s3Client.send(
            new PutObjectCommand({
              Bucket: SPACES_BUCKET,
              Key: htmlKey,
              Body: htmlContent,
              ContentType: "text/html",
              ACL: "public-read",
            }),
          );
          htmlUrl = `${cdnUrl}/${htmlKey}`;
        } catch {
          // Spaces not configured - reports stored in-memory only
        }
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
          estimatedValue:
            report?.property?.estimatedValue ||
            report?.valuation?.estimatedValue,
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
        message:
          "HOT LEAD saved! Share the link directly via SMS or copy the URL.",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[Research Library] Error:", error);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

// Generate shareable HTML for report - Professional dark-mode design with FULL data
function generateShareableHTML(data: {
  id: string;
  name: string;
  savedAt: string;
  report: {
    property?: {
      address?: {
        address?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        zip?: string;
        county?: string;
      };
      yearBuilt?: number;
      squareFeet?: number;
      bedrooms?: number;
      bathrooms?: number;
      halfBaths?: number;
      propertyType?: string;
      lotSize?: number;
      lotSquareFeet?: number;
      estimatedValue?: number;
      estimatedEquity?: number;
      equityPercent?: number;
      openMortgageBalance?: number;
      ownerFullName?: string;
      owner1FirstName?: string;
      owner1LastName?: string;
      currentMortgage?: {
        lenderName?: string;
        amount?: number;
        interestRate?: number;
        interestRateType?: string;
        loanType?: string;
        documentDate?: string;
      };
      currentMortgages?: Array<{
        lenderName?: string;
        amount?: number;
        interestRate?: number;
        interestRateType?: string;
        loanType?: string;
        documentDate?: string;
        position?: string;
      }>;
      demographics?: {
        medianIncome?: number;
        suggestedRent?: number;
        fmrOneBedroom?: number;
        fmrTwoBedroom?: number;
        fmrThreeBedroom?: number;
      };
      taxAmount?: number;
      taxYear?: number;
      taxAssessedValue?: number;
      taxMarketValue?: number;
      freeClear?: boolean;
      highEquity?: boolean;
      preForeclosure?: boolean;
      mailingAddress?: string;
    };
    valuation?: {
      estimatedValue?: number;
      confidence?: number | string;
      pricePerSqFt?: number;
      pricePerSqft?: number;
      equityEstimate?: number;
      comparableAvg?: number;
    };
    neighborhood?: {
      appreciation?: number;
      medianIncome?: number;
      medianValue?: number;
      population?: number;
    };
    aiAnalysis?: {
      summary?: string;
      executiveSummary?: string;
      strengths?: string[];
      risks?: string[];
      recommendations?: string[];
    };
    comparables?: Array<Record<string, unknown>>;
  };
}) {
  const { report } = data;
  const property = report?.property || {};
  const valuation = report?.valuation || {};
  const address = property.address || {};
  const neighborhood = report?.neighborhood || {};
  const aiAnalysis = report?.aiAnalysis || {};
  const comparables = report?.comparables || [];
  const mortgage = property.currentMortgage || {};
  const mortgages = property.currentMortgages || [];
  const demographics = property.demographics || {};

  // Primary estimated value
  const estimatedValue =
    property.estimatedValue || valuation.estimatedValue || 0;
  const pricePerSqFt =
    valuation.pricePerSqFt ||
    (property.squareFeet
      ? Math.round(estimatedValue / property.squareFeet)
      : 0);
  const confidence =
    typeof valuation.confidence === "number" ? valuation.confidence : 94;

  // Equity calculations
  const openMortgage = property.openMortgageBalance || mortgage.amount || 0;
  const estimatedEquity =
    property.estimatedEquity || estimatedValue - openMortgage || 0;
  const equityPercent =
    property.equityPercent ||
    (estimatedValue > 0
      ? Math.round((estimatedEquity / estimatedValue) * 100)
      : 0);

  // Owner info
  const ownerName =
    property.ownerFullName ||
    [property.owner1FirstName, property.owner1LastName]
      .filter(Boolean)
      .join(" ") ||
    "Property Owner";

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const fullAddress = address.address || data.name;
  const location = [address.city, address.state, address.zipCode]
    .filter(Boolean)
    .join(", ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Property Valuation Report - ${fullAddress}</title>
  <meta property="og:title" content="Property Valuation: ${fullAddress}">
  <meta property="og:description" content="Estimated Value: ${formatCurrency(estimatedValue)} | ${location}">
  <meta property="og:type" content="website">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
      color: #e0e0e0;
      line-height: 1.6;
      min-height: 100vh;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #141829;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }

    /* Header */
    .header {
      background: linear-gradient(135deg, #1a2659 0%, #2d3f7f 100%);
      color: white;
      padding: 50px 40px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -10%;
      width: 400px;
      height: 400px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 50%;
    }
    .logo {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 2px;
      text-transform: uppercase;
      opacity: 0.8;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 1.8em;
      font-weight: 700;
      margin-bottom: 8px;
      position: relative;
      z-index: 1;
    }
    .header .location {
      font-size: 1.1em;
      opacity: 0.9;
      margin-bottom: 30px;
    }
    .valuation-banner {
      display: flex;
      justify-content: center;
      gap: 50px;
      flex-wrap: wrap;
      position: relative;
      z-index: 1;
    }
    .valuation-item { text-align: center; }
    .valuation-item .amount {
      font-size: 2.4em;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .valuation-item .amount.green { color: #4ade80; }
    .valuation-item .label {
      font-size: 0.85em;
      opacity: 0.8;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    /* Content */
    .content { padding: 40px; }
    .section {
      background: linear-gradient(135deg, #1a1f3a 0%, #151b2f 100%);
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 25px;
      border: 1px solid #2a2f4a;
    }
    .section-title {
      font-size: 1.3em;
      font-weight: 600;
      margin-bottom: 20px;
      color: #7ab3ff;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* Property Grid */
    .property-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 15px;
    }
    .property-card {
      background: #0f1424;
      padding: 20px;
      border-radius: 10px;
      text-align: center;
      border-left: 3px solid #2d3f7f;
    }
    .property-card .label {
      font-size: 0.75em;
      color: #8a8f9e;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .property-card .value {
      font-size: 1.5em;
      font-weight: 700;
      color: #7ab3ff;
    }

    /* Metrics */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
    }
    .metric-card {
      background: #0f1424;
      padding: 20px;
      border-radius: 10px;
      border: 1px solid #2a2f4a;
    }
    .metric-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .metric-title {
      font-size: 0.8em;
      color: #8a8f9e;
      text-transform: uppercase;
    }
    .metric-badge {
      background: #1f2a4a;
      color: #7ab3ff;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 0.7em;
      font-weight: 600;
    }
    .metric-badge.green { background: rgba(74, 222, 128, 0.2); color: #4ade80; }
    .metric-value {
      font-size: 1.8em;
      font-weight: 700;
      color: #7ab3ff;
    }
    .metric-value.green { color: #4ade80; }

    /* AI Analysis */
    .ai-summary {
      background: #0f1424;
      padding: 20px;
      border-radius: 10px;
      border-left: 3px solid #7ab3ff;
      font-size: 0.95em;
      line-height: 1.8;
      color: #c0c5d8;
    }
    .strengths-list, .risks-list {
      list-style: none;
      margin-top: 15px;
    }
    .strengths-list li, .risks-list li {
      padding: 10px 15px;
      background: #0f1424;
      border-radius: 8px;
      margin-bottom: 8px;
      font-size: 0.9em;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .strengths-list li::before { content: '✓'; color: #4ade80; font-weight: bold; }
    .risks-list li::before { content: '⚠'; color: #fbbf24; }

    /* Comparables */
    .comp-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9em;
    }
    .comp-table th {
      background: #0f1424;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #7ab3ff;
      font-size: 0.8em;
      text-transform: uppercase;
    }
    .comp-table td {
      padding: 12px;
      border-bottom: 1px solid #2a2f4a;
      color: #c0c5d8;
    }
    .comp-table tr:hover { background: rgba(42, 47, 74, 0.3); }
    .price-highlight { color: #7ab3ff; font-weight: 600; }

    /* Footer */
    .footer {
      background: #0f1424;
      padding: 30px 40px;
      text-align: center;
      border-top: 1px solid #2a2f4a;
    }
    .disclaimer {
      background: rgba(251, 191, 36, 0.1);
      color: #fbbf24;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 0.8em;
      border-left: 3px solid #fbbf24;
      text-align: left;
    }
    .footer-text {
      color: #8a8f9e;
      font-size: 0.85em;
      line-height: 1.8;
    }
    .cta {
      display: inline-block;
      background: linear-gradient(135deg, #2d3f7f 0%, #1a2659 100%);
      color: white;
      padding: 14px 30px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      margin-top: 20px;
      transition: transform 0.2s;
    }
    .cta:hover { transform: translateY(-2px); }

    /* Responsive */
    @media (max-width: 600px) {
      .header { padding: 30px 20px; }
      .header h1 { font-size: 1.4em; }
      .valuation-banner { gap: 25px; }
      .valuation-item .amount { font-size: 1.8em; }
      .content { padding: 20px; }
      .section { padding: 20px; }
      .property-grid { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">NexTier Property Intelligence</div>
      <h1>${fullAddress}</h1>
      <div class="location">${location}</div>
      <div class="valuation-banner">
        <div class="valuation-item">
          <div class="amount green">${formatCurrency(estimatedValue)}</div>
          <div class="label">Estimated Market Value</div>
        </div>
        <div class="valuation-item">
          <div class="amount" style="color: #60a5fa;">${formatCurrency(estimatedEquity)}</div>
          <div class="label">Estimated Equity (${equityPercent}%)</div>
        </div>
        <div class="valuation-item">
          <div class="amount">$${pricePerSqFt}</div>
          <div class="label">Per Sq Ft</div>
        </div>
      </div>
      ${
        property.freeClear || property.highEquity || property.preForeclosure
          ? `
      <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
        ${property.freeClear ? '<span style="background: #22c55e; color: white; padding: 6px 12px; border-radius: 20px; font-size: 0.8em; font-weight: 600;">🏠 FREE & CLEAR</span>' : ""}
        ${property.highEquity ? '<span style="background: #3b82f6; color: white; padding: 6px 12px; border-radius: 20px; font-size: 0.8em; font-weight: 600;">💎 HIGH EQUITY</span>' : ""}
        ${property.preForeclosure ? '<span style="background: #ef4444; color: white; padding: 6px 12px; border-radius: 20px; font-size: 0.8em; font-weight: 600;">⚠️ PRE-FORECLOSURE</span>' : ""}
      </div>
      `
          : ""
      }
    </div>

    <div class="content">
      <div class="section">
        <div class="section-title">🏠 Property Details</div>
        <div class="property-grid">
          <div class="property-card">
            <div class="label">Type</div>
            <div class="value">${property.propertyType || "Single Family"}</div>
          </div>
          <div class="property-card">
            <div class="label">Bedrooms</div>
            <div class="value">${property.bedrooms || "—"}</div>
          </div>
          <div class="property-card">
            <div class="label">Bathrooms</div>
            <div class="value">${property.bathrooms || "—"}</div>
          </div>
          <div class="property-card">
            <div class="label">Sq Ft</div>
            <div class="value">${property.squareFeet?.toLocaleString() || "—"}</div>
          </div>
          <div class="property-card">
            <div class="label">Year Built</div>
            <div class="value">${property.yearBuilt || "—"}</div>
          </div>
          <div class="property-card">
            <div class="label">Lot Size</div>
            <div class="value">${property.lotSize ? property.lotSize.toLocaleString() + " sf" : "—"}</div>
          </div>
        </div>
      </div>

      <!-- Owner & Mortgage Information -->
      <div class="section">
        <div class="section-title">👤 Owner & Mortgage Information</div>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-header">
              <div class="metric-title">Property Owner</div>
            </div>
            <div class="metric-value" style="font-size: 1.2em; color: #c0c5d8;">${ownerName}</div>
            ${property.mailingAddress ? `<div style="font-size: 0.8em; color: #8a8f9e; margin-top: 8px;">${property.mailingAddress}</div>` : ""}
          </div>
          ${
            mortgage.lenderName || openMortgage > 0
              ? `
          <div class="metric-card">
            <div class="metric-header">
              <div class="metric-title">Current Mortgage</div>
              ${property.freeClear ? '<div class="metric-badge green">FREE & CLEAR</div>' : ""}
            </div>
            <div class="metric-value">${openMortgage > 0 ? formatCurrency(openMortgage) : "None"}</div>
            ${mortgage.lenderName ? `<div style="font-size: 0.85em; color: #8a8f9e; margin-top: 8px;">Lender: <strong style="color: #c0c5d8;">${mortgage.lenderName}</strong></div>` : ""}
          </div>
          `
              : ""
          }
          ${
            mortgage.interestRate
              ? `
          <div class="metric-card">
            <div class="metric-header">
              <div class="metric-title">Interest Rate</div>
              <div class="metric-badge">${mortgage.interestRateType || "FIXED"}</div>
            </div>
            <div class="metric-value">${mortgage.interestRate}%</div>
            ${mortgage.loanType ? `<div style="font-size: 0.85em; color: #8a8f9e; margin-top: 8px;">Type: ${mortgage.loanType}</div>` : ""}
          </div>
          `
              : ""
          }
          <div class="metric-card">
            <div class="metric-header">
              <div class="metric-title">Equity Position</div>
              <div class="metric-badge ${equityPercent >= 50 ? "green" : ""}">${equityPercent}% EQUITY</div>
            </div>
            <div class="metric-value green">${formatCurrency(estimatedEquity)}</div>
          </div>
        </div>
        ${
          mortgages.length > 1
            ? `
        <div style="margin-top: 20px; background: #0f1424; padding: 15px; border-radius: 10px;">
          <div style="font-size: 0.85em; color: #7ab3ff; margin-bottom: 10px; font-weight: 600;">📋 All Mortgages (${mortgages.length})</div>
          ${mortgages
            .map(
              (m) => `
          <div style="padding: 10px; border-bottom: 1px solid #2a2f4a; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="color: #c0c5d8; font-weight: 500;">${m.lenderName || "Unknown Lender"}</div>
              <div style="font-size: 0.8em; color: #8a8f9e;">${m.loanType || "Mortgage"} ${m.position ? `• Position: ${m.position}` : ""}</div>
            </div>
            <div style="text-align: right;">
              <div style="color: #7ab3ff; font-weight: 600;">${m.amount ? formatCurrency(m.amount) : "—"}</div>
              <div style="font-size: 0.8em; color: #8a8f9e;">${m.interestRate ? `${m.interestRate}% ${m.interestRateType || ""}` : ""}</div>
            </div>
          </div>
          `,
            )
            .join("")}
        </div>
        `
            : ""
        }
      </div>

      <!-- Tax & Demographics -->
      ${
        property.taxAmount ||
        demographics.medianIncome ||
        demographics.suggestedRent
          ? `
      <div class="section">
        <div class="section-title">📊 Tax & Market Data</div>
        <div class="metrics-grid">
          ${
            property.taxAmount
              ? `
          <div class="metric-card">
            <div class="metric-header">
              <div class="metric-title">Annual Property Tax</div>
              ${property.taxYear ? `<div class="metric-badge">${property.taxYear}</div>` : ""}
            </div>
            <div class="metric-value">${formatCurrency(property.taxAmount)}</div>
            ${property.taxAssessedValue ? `<div style="font-size: 0.8em; color: #8a8f9e; margin-top: 8px;">Assessed: ${formatCurrency(property.taxAssessedValue)}</div>` : ""}
          </div>
          `
              : ""
          }
          ${
            demographics.medianIncome
              ? `
          <div class="metric-card">
            <div class="metric-header">
              <div class="metric-title">Area Median Income</div>
              <div class="metric-badge">CENSUS</div>
            </div>
            <div class="metric-value">${formatCurrency(demographics.medianIncome)}</div>
          </div>
          `
              : ""
          }
          ${
            demographics.suggestedRent
              ? `
          <div class="metric-card">
            <div class="metric-header">
              <div class="metric-title">Suggested Rent</div>
              <div class="metric-badge green">FMR</div>
            </div>
            <div class="metric-value green">${formatCurrency(demographics.suggestedRent)}/mo</div>
            ${demographics.fmrThreeBedroom ? `<div style="font-size: 0.8em; color: #8a8f9e; margin-top: 8px;">3BR FMR: ${formatCurrency(demographics.fmrThreeBedroom)}</div>` : ""}
          </div>
          `
              : ""
          }
          ${
            address.county
              ? `
          <div class="metric-card">
            <div class="metric-header">
              <div class="metric-title">County</div>
            </div>
            <div class="metric-value" style="font-size: 1.1em; color: #c0c5d8;">${address.county}</div>
          </div>
          `
              : ""
          }
        </div>
      </div>
      `
          : ""
      }

      <div class="section">
        <div class="section-title">💰 Valuation Analysis</div>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-header">
              <div class="metric-title">Estimated Market Value</div>
              <div class="metric-badge green">AVM</div>
            </div>
            <div class="metric-value green">${formatCurrency(estimatedValue)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-header">
              <div class="metric-title">Price Per Sq Ft</div>
              <div class="metric-badge">MARKET</div>
            </div>
            <div class="metric-value">$${pricePerSqFt}</div>
          </div>
          ${
            openMortgage > 0
              ? `
          <div class="metric-card">
            <div class="metric-header">
              <div class="metric-title">Mortgage Balance</div>
              <div class="metric-badge">CURRENT</div>
            </div>
            <div class="metric-value" style="color: #f87171;">${formatCurrency(openMortgage)}</div>
          </div>
          `
              : ""
          }
          <div class="metric-card">
            <div class="metric-header">
              <div class="metric-title">Confidence Score</div>
              <div class="metric-badge green">${confidence >= 80 ? "HIGH" : confidence >= 60 ? "MEDIUM" : "LOW"}</div>
            </div>
            <div class="metric-value">${confidence}%</div>
          </div>
          ${
            valuation.comparableAvg
              ? `
          <div class="metric-card">
            <div class="metric-header">
              <div class="metric-title">Comparable Avg</div>
              <div class="metric-badge">COMPS</div>
            </div>
            <div class="metric-value">${formatCurrency(valuation.comparableAvg)}</div>
          </div>
          `
              : ""
          }
        </div>
      </div>

      ${
        aiAnalysis.summary
          ? `
      <div class="section">
        <div class="section-title">🤖 AI Analysis</div>
        <div class="ai-summary">${aiAnalysis.summary}</div>
        ${
          aiAnalysis.strengths && aiAnalysis.strengths.length > 0
            ? `
        <ul class="strengths-list">
          ${aiAnalysis.strengths
            .slice(0, 4)
            .map((s) => `<li>${s}</li>`)
            .join("")}
        </ul>
        `
            : ""
        }
        ${
          aiAnalysis.risks && aiAnalysis.risks.length > 0
            ? `
        <ul class="risks-list">
          ${aiAnalysis.risks
            .slice(0, 3)
            .map((r) => `<li>${r}</li>`)
            .join("")}
        </ul>
        `
            : ""
        }
      </div>
      `
          : ""
      }

      ${
        comparables.length > 0
          ? `
      <div class="section">
        <div class="section-title">📊 Comparable Sales</div>
        <table class="comp-table">
          <thead>
            <tr>
              <th>Address</th>
              <th>Beds/Baths</th>
              <th>Sq Ft</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            ${comparables
              .slice(0, 5)
              .map((comp: Record<string, unknown>) => {
                // Handle both object and string address formats
                const compAddress =
                  typeof comp.address === "object" && comp.address !== null
                    ? (comp.address as Record<string, unknown>).address ||
                      (comp.address as Record<string, unknown>).street ||
                      "—"
                    : comp.address || "—";
                const compBeds = comp.beds || comp.bedrooms || "—";
                const compBaths = comp.baths || comp.bathrooms || "—";
                const compSqft =
                  comp.sqft || comp.squareFeet || comp.buildingSize;
                const compPrice =
                  comp.price ||
                  comp.lastSaleAmount ||
                  comp.estimatedValue ||
                  comp.avm;
                return `
            <tr>
              <td>${compAddress}</td>
              <td>${compBeds}/${compBaths}</td>
              <td>${compSqft ? Number(compSqft) : "—"}</td>
              <td class="price-highlight">${compPrice ? formatCurrency(Number(compPrice)) : "—"}</td>
            </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </div>
      `
          : ""
      }
    </div>

    <div class="footer">
      <div class="download-section" style="margin-bottom: 25px;">
        <button onclick="window.print()" class="download-btn">
          📥 Download / Print Report
        </button>
        <p style="color: #8a8f9e; font-size: 0.8em; margin-top: 10px;">Click to save as PDF or print this report</p>
      </div>
      <div class="disclaimer">
        <strong>Disclaimer:</strong> This report is for informational purposes only. Values are estimates based on market data and should not be considered professional appraisal or investment advice. Consult licensed professionals before making decisions.
      </div>
      <div class="footer-text">
        <strong>Report Generated:</strong> ${new Date(data.savedAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}<br>
        <strong>Report ID:</strong> ${data.id}
      </div>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://monkfish-app-mb7h3.ondigitalocean.app"}" class="cta">View Full Report on NexTier</a>
    </div>
    <style>
      .download-btn {
        background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
        color: #0f1424;
        border: none;
        padding: 16px 40px;
        font-size: 1.1em;
        font-weight: 700;
        border-radius: 10px;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
        box-shadow: 0 4px 15px rgba(74, 222, 128, 0.3);
      }
      .download-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(74, 222, 128, 0.4);
      }
      @media print {
        .download-section { display: none !important; }
        .cta { display: none !important; }
        .disclaimer { background: #fff3cd !important; color: #856404 !important; border-left-color: #ffc107 !important; }
        body { background: white !important; color: #333 !important; }
        .container { box-shadow: none !important; background: white !important; }
        .header { background: #1a2659 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .section { background: #f8f9fa !important; border-color: #dee2e6 !important; }
        .section-title { color: #1a2659 !important; }
        .property-card { background: #f8f9fa !important; border-left-color: #1a2659 !important; }
        .property-card .label, .metric-title { color: #666 !important; }
        .property-card .value, .metric-value { color: #1a2659 !important; }
        .metric-card { background: #f8f9fa !important; border-color: #dee2e6 !important; }
        .ai-summary { background: #f8f9fa !important; color: #333 !important; border-left-color: #1a2659 !important; }
        .strengths-list li, .risks-list li { background: #f8f9fa !important; color: #333 !important; }
        .comp-table th { background: #e9ecef !important; color: #1a2659 !important; }
        .comp-table td { color: #333 !important; border-color: #dee2e6 !important; }
        .footer { background: #f8f9fa !important; border-color: #dee2e6 !important; }
        .footer-text { color: #666 !important; }
      }
    </style>
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
      return NextResponse.json(
        { error: "Path and ID required" },
        { status: 400 },
      );
    }

    // Remove from folder structure
    const parentPath = path.split("/").slice(0, -1).join("/") || "/";
    if (folderStructure[parentPath]) {
      folderStructure[parentPath] = folderStructure[parentPath].filter(
        (item) => item.id !== id,
      );
    }

    // Try to delete from Spaces (if configured)
    if (s3Client && id.startsWith("report-")) {
      try {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: SPACES_BUCKET,
            Key: `${RESEARCH_PREFIX}reports/${id}.json`,
          }),
        );
      } catch {
        // Spaces not configured - nothing to delete
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Research Library] Error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
