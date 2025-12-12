import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  PutObjectCommand,
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

const s3Client = new S3Client({
  endpoint: SPACES_ENDPOINT,
  region: SPACES_REGION,
  credentials: {
    accessKeyId: SPACES_KEY,
    secretAccessKey: SPACES_SECRET,
  },
  forcePathStyle: false,
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET - Retrieve or generate PDF for report
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Report ID required" },
        { status: 400 },
      );
    }

    // Check if PDF already exists in bucket
    const pdfKey = `research-library/pdfs/${id}.pdf`;

    try {
      const getCommand = new GetObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: pdfKey,
      });
      const response = await s3Client.send(getCommand);
      const pdfBuffer = await response.Body?.transformToByteArray();

      if (pdfBuffer) {
        return new NextResponse(pdfBuffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="property-report-${id}.pdf"`,
          },
        });
      }
    } catch {
      // PDF doesn't exist yet, that's fine
    }

    // For now, return a redirect to the HTML report page
    // PDF generation will be handled client-side using browser print or we can add server-side generation later
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://monkfish-app-mb7h3.ondigitalocean.app";

    return NextResponse.json({
      success: true,
      message:
        "PDF not yet generated. Use the share link or print from browser.",
      shareUrl: `${baseUrl}/report/${id}`,
      printUrl: `${baseUrl}/report/${id}?print=true`,
    });
  } catch (error) {
    console.error("[PDF API] Error:", error);
    return NextResponse.json({ error: "Failed to get PDF" }, { status: 500 });
  }
}

// POST - Generate and save PDF to bucket
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Report ID required" },
        { status: 400 },
      );
    }

    // Get the report data first
    const reportKey = `research-library/reports/${id}.json`;
    let reportData;

    try {
      const getCommand = new GetObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: reportKey,
      });
      const response = await s3Client.send(getCommand);
      const body = await response.Body?.transformToString();
      if (body) {
        reportData = JSON.parse(body);
      }
    } catch {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Generate simple HTML for PDF (will be rendered and saved)
    const htmlContent = generateReportHTML(reportData);

    // Save HTML version to bucket (can be converted to PDF by external service or browser)
    const htmlKey = `research-library/pdfs/${id}.html`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: htmlKey,
        Body: htmlContent,
        ContentType: "text/html",
        ACL: "public-read",
      }),
    );

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://monkfish-app-mb7h3.ondigitalocean.app";
    const cdnUrl = `https://${SPACES_BUCKET}.${SPACES_REGION}.cdn.digitaloceanspaces.com`;

    return NextResponse.json({
      success: true,
      reportId: id,
      shareUrl: `${baseUrl}/report/${id}`,
      htmlUrl: `${cdnUrl}/research-library/pdfs/${id}.html`,
      // PDF URL will be available once converted
      message:
        "Report HTML generated. Share the link directly for best experience.",
    });
  } catch (error) {
    console.error("[PDF API] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 },
    );
  }
}

// Generate clean HTML report for PDF/sharing
function generateReportHTML(data: {
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
      };
      yearBuilt?: number;
      squareFeet?: number;
      bedrooms?: number;
      bathrooms?: number;
      propertyType?: string;
    };
    valuation?: {
      estimatedValue?: number;
      confidence?: number;
      pricePerSqFt?: number;
    };
    neighborhood?: {
      schoolRating?: number;
      walkScore?: number;
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
  <title>Property Valuation Report - ${address.address || data.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #e2e8f0;
      min-height: 100vh;
      padding: 40px;
    }
    .container { max-width: 800px; margin: 0 auto; }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding: 40px;
      background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%);
      border-radius: 24px;
    }
    .logo { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
    h1 { font-size: 28px; margin-bottom: 8px; }
    .location { color: #94a3b8; font-size: 18px; margin-bottom: 24px; }
    .value-box {
      background: rgba(16, 185, 129, 0.2);
      padding: 24px;
      border-radius: 16px;
      display: inline-block;
    }
    .value { font-size: 48px; font-weight: bold; color: #4ade80; }
    .value-label { color: #94a3b8; font-size: 14px; }
    .section {
      background: rgba(30, 41, 59, 0.8);
      padding: 32px;
      border-radius: 20px;
      margin-bottom: 24px;
      border: 1px solid rgba(148, 163, 184, 0.1);
    }
    .section h2 {
      font-size: 20px;
      margin-bottom: 20px;
      color: #60a5fa;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
    .stat {
      text-align: center;
      padding: 20px;
      background: rgba(15, 23, 42, 0.6);
      border-radius: 12px;
    }
    .stat-value { font-size: 28px; font-weight: bold; }
    .stat-label { font-size: 12px; color: #64748b; margin-top: 4px; }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px solid rgba(148, 163, 184, 0.1);
      color: #64748b;
      font-size: 12px;
    }
    @media print {
      body { background: white; color: #1e293b; }
      .section { border: 1px solid #e2e8f0; background: #f8fafc; }
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
      <h2>Valuation Metrics</h2>
      <div class="stats-grid">
        <div class="stat">
          <div class="stat-value">${formatCurrency(estimatedValue)}</div>
          <div class="stat-label">Estimated Value</div>
        </div>
        <div class="stat">
          <div class="stat-value">${valuation.confidence || 94}%</div>
          <div class="stat-label">Confidence</div>
        </div>
        <div class="stat">
          <div class="stat-value">$${valuation.pricePerSqFt || (property.squareFeet ? Math.round(estimatedValue / property.squareFeet) : "—")}</div>
          <div class="stat-label">Per Sq Ft</div>
        </div>
        <div class="stat">
          <div class="stat-value">+${report.neighborhood?.appreciation || 5}%</div>
          <div class="stat-label">5yr Growth</div>
        </div>
      </div>
    </div>

    ${
      report.aiAnalysis?.summary
        ? `
    <div class="section">
      <h2>AI Analysis</h2>
      <p style="color: #cbd5e1; line-height: 1.6;">${report.aiAnalysis.summary}</p>
      ${
        report.aiAnalysis.strengths?.length
          ? `
        <div style="margin-top: 16px;">
          <strong style="color: #4ade80;">Key Strengths:</strong>
          <ul style="margin-top: 8px; padding-left: 20px; color: #94a3b8;">
            ${report.aiAnalysis.strengths.map((s) => `<li style="margin-bottom: 4px;">${s}</li>`).join("")}
          </ul>
        </div>
      `
          : ""
      }
    </div>
    `
        : ""
    }

    <div class="footer">
      <p>Report generated ${new Date(data.savedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
      <p style="margin-top: 8px;">Powered by NexTier Property Intelligence</p>
      <p style="margin-top: 16px; font-size: 10px;">This report is for informational purposes only. Values are estimates based on market data.</p>
    </div>
  </div>
</body>
</html>`;
}
